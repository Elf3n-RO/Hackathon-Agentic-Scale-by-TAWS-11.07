import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Conversacion, Mensaje, LeadCRM, N8nChatResponse } from '@/types'
import { getSupabase, useMock } from '@/services/supabase'
import { sendToN8n, isN8nConfigured } from '@/services/n8n'
import { useAuthStore } from './auth'
import { useCrmStore } from './crm'

const mockConversaciones: Conversacion[] = []
const mockMensajes: Record<string, Mensaje[]> = {}

export const useChatStore = defineStore('chat', () => {
  const conversaciones = ref<Conversacion[]>([])
  const mensajes = ref<Mensaje[]>([])
  const conversacionActiva = ref<Conversacion | null>(null)
  const escribiendo = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const fuenteActual = ref<string | null>(null)
  const quizActivo = ref<{ pregunta: string; opciones: string[] }[] | null>(null)

  async function cargarConversaciones() {
    const auth = useAuthStore()
    if (!auth.user) return

    loading.value = true
    error.value = null

    try {
      if (useMock) {
        conversaciones.value = mockConversaciones.filter((c) => c.user_id === auth.user!.id)
        return
      }

      const supabase = getSupabase()
      const { data, error: err } = await supabase
        .from('conversaciones')
        .select('*')
        .order('updated_at', { ascending: false })

      if (err) throw err
      conversaciones.value = (data ?? []) as Conversacion[]
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar conversaciones'
    } finally {
      loading.value = false
    }
  }

  async function crearConversacion(titulo?: string) {
    const auth = useAuthStore()
    if (!auth.user) return null

    const nueva: Partial<Conversacion> = {
      user_id: auth.user.id,
      titulo: titulo ?? 'Chat IA',
      tipo: 'comercial',
      estado: 'activa',
    }

    if (useMock) {
      const conv: Conversacion = {
        id: crypto.randomUUID(),
        user_id: auth.user.id,
        titulo: nueva.titulo!,
        tipo: 'comercial',
        estado: 'activa',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockConversaciones.unshift(conv)
      conversaciones.value.unshift(conv)
      await seleccionarConversacion(conv)
      return conv
    }

    const supabase = getSupabase()
    const { data, error: err } = await supabase
      .from('conversaciones')
      .insert(nueva)
      .select()
      .single()

    if (err) {
      error.value = err.message
      return null
    }

    const conv = data as Conversacion
    conversaciones.value.unshift(conv)
    await seleccionarConversacion(conv)
    return conv
  }

  async function obtenerOCrearConversacion() {
    if (conversacionActiva.value) return conversacionActiva.value
    await cargarConversaciones()
    if (conversaciones.value.length) {
      await seleccionarConversacion(conversaciones.value[0])
      return conversacionActiva.value
    }
    return crearConversacion()
  }

  async function seleccionarConversacion(conv: Conversacion) {
    conversacionActiva.value = conv
    fuenteActual.value = null
    quizActivo.value = null
    await cargarMensajes(conv.id)
  }

  async function cargarMensajes(conversacionId: string) {
    if (useMock) {
      mensajes.value = mockMensajes[conversacionId] ?? []
      return
    }

    const supabase = getSupabase()
    const { data, error: err } = await supabase
      .from('mensajes')
      .select('*')
      .eq('conversacion_id', conversacionId)
      .order('created_at', { ascending: true })

    if (err) {
      error.value = err.message
      return
    }
    mensajes.value = (data ?? []) as Mensaje[]
  }

  async function guardarMensaje(
    conversacionId: string,
    rol: 'usuario' | 'asistente',
    contenido: string,
    metadata?: Record<string, unknown>,
  ) {
    const msg: Partial<Mensaje> = { conversacion_id: conversacionId, rol, contenido, metadata }

    if (useMock) {
      const m: Mensaje = {
        id: crypto.randomUUID(),
        conversacion_id: conversacionId,
        rol,
        contenido,
        metadata,
        created_at: new Date().toISOString(),
      }
      if (!mockMensajes[conversacionId]) mockMensajes[conversacionId] = []
      mockMensajes[conversacionId].push(m)
      if (conversacionActiva.value?.id === conversacionId) mensajes.value.push(m)
      return m
    }

    const supabase = getSupabase()
    const { data, error: err } = await supabase.from('mensajes').insert(msg).select().single()
    if (err) throw err

    const m = data as Mensaje
    if (conversacionActiva.value?.id === conversacionId) mensajes.value.push(m)

    await supabase
      .from('conversaciones')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversacionId)

    return m
  }

  async function renombrarConversacion(id: string, titulo: string) {
    if (useMock) {
      const c = conversaciones.value.find((x) => x.id === id)
      if (c) c.titulo = titulo
      return
    }
    const supabase = getSupabase()
    await supabase.from('conversaciones').update({ titulo }).eq('id', id)
    const c = conversaciones.value.find((x) => x.id === id)
    if (c) c.titulo = titulo
  }

  async function eliminarConversacion(id: string) {
    if (useMock) {
      conversaciones.value = conversaciones.value.filter((c) => c.id !== id)
      delete mockMensajes[id]
      if (conversacionActiva.value?.id === id) {
        conversacionActiva.value = null
        mensajes.value = []
      }
      return
    }
    const supabase = getSupabase()
    await supabase.from('conversaciones').delete().eq('id', id)
    conversaciones.value = conversaciones.value.filter((c) => c.id !== id)
    if (conversacionActiva.value?.id === id) {
      conversacionActiva.value = null
      mensajes.value = []
    }
  }

  async function aplicarMetadataN8n(respuesta: N8nChatResponse, convId: string, crm: ReturnType<typeof useCrmStore>) {
    if (respuesta.fuente) fuenteActual.value = respuesta.fuente
    if (respuesta.quiz) quizActivo.value = respuesta.quiz
    if (respuesta.lead) {
      await crm.upsertLeadFromChat(convId, respuesta.lead as Partial<LeadCRM>)
    }
  }

  async function enviarMensaje(contenido: string) {
    const auth = useAuthStore()
    const crm = useCrmStore()
    if (!auth.user || !conversacionActiva.value) return

    const conv = conversacionActiva.value
    error.value = null

    try {
      await guardarMensaje(conv.id, 'usuario', contenido)
    } catch (e) {
      // Si falla guardar el usuario, igual intentamos el chat
      error.value = e instanceof Error ? `Aviso al guardar mensaje: ${e.message}` : 'Aviso al guardar mensaje'
    }

    escribiendo.value = true

    try {
      if (!isN8nConfigured()) {
        throw new Error('Configura VITE_N8N_WEBHOOK_URL en .env.local')
      }

      const historial = mensajes.value.map((m) => ({
        rol: m.rol,
        contenido: typeof m.contenido === 'string' ? m.contenido : String(m.contenido ?? ''),
      }))

      const respuesta = await sendToN8n({
        message: contenido,
        conversacionId: conv.id,
        userId: auth.user.id,
        historial,
      })

      // Mostrar siempre la respuesta del IA, aunque falle Supabase/CRM
      try {
        await guardarMensaje(conv.id, 'asistente', respuesta.reply, {
          fuente: respuesta.fuente,
          accion: respuesta.accion,
        })
      } catch {
        mensajes.value.push({
          id: crypto.randomUUID(),
          conversacion_id: conv.id,
          rol: 'asistente',
          contenido: respuesta.reply,
          metadata: {
            fuente: respuesta.fuente,
            accion: respuesta.accion,
          },
          created_at: new Date().toISOString(),
        })
      }

      try {
        await aplicarMetadataN8n(respuesta, conv.id, crm)
      } catch {
        /* no bloquear el chat por CRM */
      }

      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al conectar con n8n'
    } finally {
      escribiendo.value = false
    }
  }

  return {
    conversaciones,
    mensajes,
    conversacionActiva,
    escribiendo,
    loading,
    error,
    fuenteActual,
    quizActivo,
    cargarConversaciones,
    crearConversacion,
    obtenerOCrearConversacion,
    seleccionarConversacion,
    cargarMensajes,
    enviarMensaje,
    renombrarConversacion,
    eliminarConversacion,
  }
})
