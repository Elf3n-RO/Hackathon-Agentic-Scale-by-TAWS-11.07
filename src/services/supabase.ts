import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const useMock = import.meta.env.VITE_USE_MOCK === 'true'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (useMock) {
    throw new Error('Supabase no disponible en modo mock')
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local')
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey)
  }
  return client
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && !useMock)
