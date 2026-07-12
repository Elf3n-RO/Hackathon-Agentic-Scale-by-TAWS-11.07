import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LeadCRM, AccionComercial, AccionEstado } from '@/types'
import { getSupabase, useMock } from '@/services/supabase'
import { useAuthStore } from './auth'

const mockLeads: LeadCRM[] = []
const mockAcciones: AccionComercial[] = []

export const useCrmStore = defineStore('crm', () => {
  const leads = ref<LeadCRM[]>([])
  const acciones = ref<AccionComercial[]>([])
  const leadActivo = ref<LeadCRM | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function cargarLeads() {
    const auth = useAuthStore()
    if (!auth.user) return

    loading.value = true
    try {
      if (useMock) {
        if (auth.isAdmin) {
          leads.value = [...mockLeads]
        } else {
          leads.value = mockLeads.filter((l) => l.user_id === auth.user!.id)
        }
        return
      }

      const supabase = getSupabase()
      let query = supabase
        .from('leads_crm')
        .select('*, profiles(full_name, email, role)')
        .order('updated_at', { ascending: false })

      if (auth.isCliente) {
        query = query.eq('user_id', auth.user.id)
      }

      const { data, error: err } = await query
      if (err) throw err
      leads.value = (data ?? []) as LeadCRM[]
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar leads'
    } finally {
      loading.value = false
    }
  }

  async function cargarAcciones() {
    loading.value = true
    try {
      if (useMock) {
        acciones.value = [...mockAcciones]
        return
      }

      const supabase = getSupabase()
      const { data, error: err } = await supabase
        .from('acciones_comerciales')
        .select('*, leads_crm(*, profiles(full_name, email))')
        .order('created_at', { ascending: false })

      if (err) throw err
      acciones.value = (data ?? []) as AccionComercial[]
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar acciones'
    } finally {
      loading.value = false
    }
  }

  async function upsertLeadFromChat(conversacionId: string, datos: Partial<LeadCRM>) {
    const auth = useAuthStore()
    if (!auth.user) return

    const existente = leads.value.find((l) => l.conversacion_id === conversacionId)

    const payload = {
      user_id: auth.user.id,
      conversacion_id: conversacionId,
      tipo: datos.tipo ?? existente?.tipo ?? null,
      interes: datos.interes || existente?.interes || '',
      presupuesto: datos.presupuesto || existente?.presupuesto || '',
      urgencia: datos.urgencia || existente?.urgencia || '',
      prioridad: datos.prioridad ?? existente?.prioridad ?? 0,
      resumen: datos.resumen || existente?.resumen || '',
      objeciones: datos.objeciones || existente?.objeciones || '',
      etapa: datos.etapa || existente?.etapa || 'nuevo',
      siguiente_accion: datos.siguiente_accion || existente?.siguiente_accion || '',
    }

    if (useMock) {
      if (existente) {
        Object.assign(existente, payload, { updated_at: new Date().toISOString() })
        leadActivo.value = existente
      } else {
        const nuevo: LeadCRM = {
          id: crypto.randomUUID(),
          consentimiento: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...payload,
        } as LeadCRM
        mockLeads.unshift(nuevo)
        leads.value.unshift(nuevo)
        leadActivo.value = nuevo

        if (payload.siguiente_accion) {
          mockAcciones.unshift({
            id: crypto.randomUUID(),
            lead_id: nuevo.id,
            propuesta: payload.siguiente_accion,
            estado: 'pendiente',
            ejecutivo_id: null,
            notas: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
      }
      return
    }

    const supabase = getSupabase()

    if (existente) {
      const { data, error: err } = await supabase
        .from('leads_crm')
        .update(payload)
        .eq('id', existente.id)
        .select()
        .single()
      if (err) throw err
      const idx = leads.value.findIndex((l) => l.id === existente.id)
      if (idx >= 0) leads.value[idx] = data as LeadCRM
      leadActivo.value = data as LeadCRM
    } else {
      const { data, error: err } = await supabase
        .from('leads_crm')
        .insert(payload)
        .select()
        .single()
      if (err) throw err
      leads.value.unshift(data as LeadCRM)
      leadActivo.value = data as LeadCRM

      if (payload.siguiente_accion) {
        await supabase.from('acciones_comerciales').insert({
          lead_id: (data as LeadCRM).id,
          propuesta: payload.siguiente_accion,
          estado: 'pendiente',
        })
      }
    }
  }

  async function registrarInteresTutor(conversacionId: string, tema: string) {
    const auth = useAuthStore()
    if (!auth.user) return

    await upsertLeadFromChat(conversacionId, {
      interes: tema,
      etapa: 'interes_educativo',
      consentimiento: true,
      siguiente_accion: 'Enviar material educativo de Futuro Academy',
    })

    if (!useMock) {
      const supabase = getSupabase()
      await supabase.from('evaluaciones_quiz').insert({
        user_id: auth.user.id,
        conversacion_id: conversacionId,
        tema,
        resultado: 'Interés registrado con consentimiento',
        puntaje: 0,
      })
    }
  }

  async function gestionarAccion(
    accionId: string,
    estado: AccionEstado,
    notas?: string,
    propuestaEditada?: string,
  ) {
    const auth = useAuthStore()
    if (!auth.user) return false

    const updates = {
      estado,
      notas: notas ?? '',
      ejecutivo_id: auth.user.id,
      ...(propuestaEditada ? { propuesta: propuestaEditada } : {}),
    }

    if (useMock) {
      const a = mockAcciones.find((x) => x.id === accionId)
      if (a) Object.assign(a, updates, { updated_at: new Date().toISOString() })
      await cargarAcciones()
      return true
    }

    const supabase = getSupabase()
    const { error: err } = await supabase
      .from('acciones_comerciales')
      .update(updates)
      .eq('id', accionId)

    if (err) {
      error.value = err.message
      return false
    }

    await cargarAcciones()
    return true
  }

  function seleccionarLeadPorConversacion(conversacionId: string) {
    leadActivo.value = leads.value.find((l) => l.conversacion_id === conversacionId) ?? null
  }

  return {
    leads,
    acciones,
    leadActivo,
    loading,
    error,
    cargarLeads,
    cargarAcciones,
    upsertLeadFromChat,
    registrarInteresTutor,
    gestionarAccion,
    seleccionarLeadPorConversacion,
  }
})
