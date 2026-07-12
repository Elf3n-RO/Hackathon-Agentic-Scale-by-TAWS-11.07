import type { Conversacion, Mensaje, Profile } from '@/types'
import { getSupabase, useMock } from '@/services/supabase'

const MAX_DELETED = 10

export interface UserChatHistory {
  profile: Profile
  activas: Conversacion[]
  eliminadas: Conversacion[]
}

function isEliminada(c: Conversacion): boolean {
  return c.estado === 'eliminada' || Boolean(c.deleted_at)
}

export async function fetchUserConversations(userId: string): Promise<{
  activas: Conversacion[]
  eliminadas: Conversacion[]
}> {
  if (useMock) {
    return { activas: [], eliminadas: [] }
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('conversaciones')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error

  const all = (data ?? []) as Conversacion[]
  return {
    activas: all.filter((c) => !isEliminada(c)),
    eliminadas: all
      .filter((c) => isEliminada(c))
      .sort((a, b) => {
        const da = a.deleted_at || a.updated_at
        const db = b.deleted_at || b.updated_at
        return new Date(db).getTime() - new Date(da).getTime()
      }),
  }
}

export async function fetchConversationMessages(conversacionId: string): Promise<Mensaje[]> {
  if (useMock) return []

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('mensajes')
    .select('*')
    .eq('conversacion_id', conversacionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as Mensaje[]
}

/**
 * Soft-delete. Si el UPDATE no afecta filas (RLS/schema), intenta DELETE duro.
 * Verifica siempre que la fila haya cambiado.
 */
export async function softDeleteConversation(userId: string, conversacionId: string) {
  if (useMock) return

  const supabase = getSupabase()
  const now = new Date().toISOString()

  const { data: updated, error } = await supabase
    .from('conversaciones')
    .update({
      estado: 'eliminada',
      deleted_at: now,
      updated_at: now,
    })
    .eq('id', conversacionId)
    .eq('user_id', userId)
    .select('id')

  if (error) {
    // Si faltan columnas estado/deleted_at, borrar en duro
    const { error: delErr } = await supabase
      .from('conversaciones')
      .delete()
      .eq('id', conversacionId)
      .eq('user_id', userId)

    if (delErr) throw new Error(error.message || delErr.message)
    return
  }

  if (!updated?.length) {
    const { data: deleted, error: delErr } = await supabase
      .from('conversaciones')
      .delete()
      .eq('id', conversacionId)
      .eq('user_id', userId)
      .select('id')

    if (delErr) throw delErr
    if (!deleted?.length) {
      throw new Error('No se pudo eliminar el chat (sin permiso o no existe)')
    }
    return
  }

  // Mantener solo las 10 eliminadas más recientes
  const { data: deletedList, error: listErr } = await supabase
    .from('conversaciones')
    .select('id, deleted_at, updated_at')
    .eq('user_id', userId)
    .eq('estado', 'eliminada')
    .order('deleted_at', { ascending: false })

  if (listErr) return // soft-delete ya OK; purga es best-effort

  const rows = (deletedList ?? []).slice().sort((a, b) => {
    const da = a.deleted_at ? new Date(a.deleted_at).getTime() : 0
    const db = b.deleted_at ? new Date(b.deleted_at).getTime() : 0
    return db - da
  })
  if (rows.length > MAX_DELETED) {
    const toPurge = rows.slice(MAX_DELETED).map((r) => r.id)
    if (toPurge.length) {
      await supabase.from('conversaciones').delete().in('id', toPurge)
    }
  }
}
