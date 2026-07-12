import type { AuthError, PostgrestError } from '@supabase/supabase-js'
import type { UserRole } from '@/types'

export function formatSupabaseError(err: unknown): string {
  if (!err) return 'Error desconocido'
  if (typeof err === 'string') return err

  const authErr = err as AuthError
  if (authErr.message) {
    if (authErr.message === 'Invalid login credentials') {
      return 'Credenciales incorrectas'
    }
    if (authErr.message.includes('already registered') || authErr.message.includes('already been registered')) {
      return 'Este correo ya está registrado'
    }
    if (authErr.message.includes('Password')) {
      return 'La contraseña debe tener al menos 6 caracteres'
    }
    if (authErr.message.includes('Database error saving new user')) {
      return 'Error en la base de datos. Ejecuta supabase/schema.sql en el SQL Editor de Supabase.'
    }
    return authErr.message
  }

  const pgErr = err as PostgrestError
  if (pgErr.code === 'PGRST116') {
    return 'Perfil no encontrado. Verifica que ejecutaste supabase/schema.sql en Supabase.'
  }
  if (pgErr.message) return pgErr.message
  if (pgErr.code) return `Error de base de datos (${pgErr.code})`

  if (err instanceof Error && err.message) return err.message

  try {
    const json = JSON.stringify(err)
    if (json && json !== '{}') return json
  } catch {
    /* ignore */
  }

  return 'Error al procesar la solicitud'
}

export function isEmailConfirmationRequired(session: unknown, user: unknown): boolean {
  return Boolean(user && !session)
}
