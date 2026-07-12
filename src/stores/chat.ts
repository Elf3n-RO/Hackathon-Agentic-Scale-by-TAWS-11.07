import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Conversacion, Mensaje, LeadCRM, N8nChatResponse } from '@/types'
import { getSupabase, useMock } from '@/services/supabase'
import { sendToN8n, isN8nConfigured } from '@/services/n8n'
import { useAuthStore } from './auth'
import { useCrmStore } from './crm'
import { softDeleteConversation } from '@/services/chatHistory'

const mockConversaciones: Conversacion[] = []
const mockMensajes: Record<string, Mensaje[]> = {}

function tituloDesdeMensaje(texto: string): string {
  const t = texto.trim().replace(/\s+/g, ' ')
  if (!t) return 'Chat IA'
  return t.length > 42 ? `${t.slice(0, 42)}…` : t
}

function esActiva(c: Conversacion): boolean {
  return c.estado !== 'eliminada' && !c.deleted_at
}

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
        conversaciones.value = mockConversaciones.filter(
          (c) => c.user_id === auth.user!.id && esActiva(c),
        )
        return
      }

      const supabase = getSupabase()
      const { data, error: err } = await supabase
        .from('conversaciones')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('updated_at', { ascending: false })

      if (err) throw err
      conversaciones.value = ((data ?? []) as Conversacion[]).filter(esActiva)
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
      titulo: titulo ?? `Chat ${new Date().toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
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
    await cargarConversaciones()
    if (conversacionActiva.value && esActiva(conversacionActiva.value)) {
      const stillThere = conversaciones.value.find((c) => c.id === conversacionActiva.value!.id)
      if (stillThere) {
        await seleccionarConversacion(stillThere)
        return conversacionActiva.value
      }
    }
    if (conversaciones.value.length) {
      await seleccionarConversacion(conversaciones.value[0])
      return conversacionActiva.value
    }
    return crearConversacion()
  }

  async function seleccionarConversacion(conv: Conversacion) {
    conversacionActiva.value = conv
    mensajes.value = []
    fuenteActual.value = null
    quizActivo.value = null
    await cargarMensajes(conv.id)
  }

  async function cargarMensajes(conversacionId: string) {
    if (useMock) {
      if (conversacionActiva.value?.id === conversacionId) {
        mensajes.value = [...(mockMensajes[conversacionId] ?? [])]
      }
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
    // Solo aplicar si seguimos en el mismo chat (evita carrera al cambiar rápido)
    if (conversacionActiva.value?.id === conversacionId) {
      mensajes.value = (data ?? []) as Mensaje[]
    }
  }

  function pushLocal(
    conversacionId: string,
    rol: 'usuario' | 'asistente',
    contenido: string,
    metadata?: Record<string, unknown>,
  ): Mensaje {
    const m: Mensaje = {
      id: crypto.randomUUID(),
      conversacion_id: conversacionId,
      rol,
      contenido,
      metadata,
      created_at: new Date().toISOString(),
    }
    if (useMock) {
      if (!mockMensajes[conversacionId]) mockMensajes[conversacionId] = []
      mockMensajes[conversacionId].push(m)
    }
    if (conversacionActiva.value?.id === conversacionId) mensajes.value.push(m)
    return m
  }

  async function persistirMensaje(
    conversacionId: string,
    rol: 'usuario' | 'asistente',
    contenido: string,
    metadata?: Record<string, unknown>,
    localId?: string,
  ): Promise<Mensaje | null> {
    if (useMock) return null

    const row: Record<string, unknown> = {
      conversacion_id: conversacionId,
      rol,
      contenido,
    }
    if (metadata) row.metadata = metadata

    const supabase = getSupabase()
    const { data, error: err } = await supabase.from('mensajes').insert(row).select().single()
    if (err) throw err

    const saved = data as Mensaje
    if (localId && conversacionActiva.value?.id === conversacionId) {
      const idx = mensajes.value.findIndex((m) => m.id === localId)
      if (idx >= 0) mensajes.value[idx] = saved
    }

    await supabase
      .from('conversaciones')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversacionId)

    return saved
  }

  async function renombrarConversacion(id: string, titulo: string) {
    if (useMock) {
      const c = conversaciones.value.find((x) => x.id === id)
      if (c) c.titulo = titulo
      return
    }
    const supabase = getSupabase()
    const { error: err } = await supabase.from('conversaciones').update({ titulo }).eq('id', id)
    if (err) {
      error.value = err.message
      return
    }
    const c = conversaciones.value.find((x) => x.id === id)
    if (c) c.titulo = titulo
    if (conversacionActiva.value?.id === id) conversacionActiva.value.titulo = titulo
  }

  async function eliminarConversacion(id: string) {
    const auth = useAuthStore()
    if (!auth.user) return false

    error.value = null

    try {
      if (useMock) {
        const c = mockConversaciones.find((x) => x.id === id)
        if (c) {
          c.estado = 'eliminada'
          c.deleted_at = new Date().toISOString()
        }
        delete mockMensajes[id]
      } else {
        await softDeleteConversation(auth.user.id, id)
      }

      conversaciones.value = conversaciones.value.filter((c) => c.id !== id)
      if (conversacionActiva.value?.id === id) {
        conversacionActiva.value = null
        mensajes.value = []
        if (conversaciones.value.length) {
          await seleccionarConversacion(conversaciones.value[0])
        } else {
          await crearConversacion()
        }
      }
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No se pudo eliminar el chat'
      return false
    }
  }

  async function aplicarMetadataN8n(
    respuesta: N8nChatResponse,
    convId: string,
    crm: ReturnType<typeof useCrmStore>,
  ) {
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
    const texto = contenido.trim()
    if (!texto) return

    error.value = null

    // Mostrar mensaje del usuario al instante (aunque falle Supabase)
    const localUser = pushLocal(conv.id, 'usuario', texto)

    // Renombrar chat vacío con el primer mensaje
    if (mensajes.value.filter((m) => m.rol === 'usuario').length === 1) {
      const nuevoTitulo = tituloDesdeMensaje(texto)
      void renombrarConversacion(conv.id, nuevoTitulo)
    }

    try {
      await persistirMensaje(conv.id, 'usuario', texto, undefined, localUser.id)
    } catch (e) {
      error.value =
        e instanceof Error
          ? `No se guardó en historial: ${e.message}`
          : 'No se guardó el mensaje en historial'
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
        message: texto,
        conversacionId: conv.id,
        userId: auth.user.id,
        historial,
      })

      const localAi = pushLocal(conv.id, 'asistente', respuesta.reply, {
        fuente: respuesta.fuente,
        accion: respuesta.accion,
      })

      try {
        await persistirMensaje(
          conv.id,
          'asistente',
          respuesta.reply,
          { fuente: respuesta.fuente, accion: respuesta.accion },
          localAi.id,
        )
      } catch {
        /* ya está visible en pantalla */
      }

      try {
        await aplicarMetadataN8n(respuesta, conv.id, crm)
      } catch {
        /* no bloquear el chat por CRM */
      }

      if (!error.value?.startsWith('No se guardó')) error.value = null
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
