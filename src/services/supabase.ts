import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Fallbacks públicos (anon key) para que el build en Vercel funcione sin panel de env
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  'https://gcorxawzjhmxtmadnhbh.supabase.co'
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdjb3J4YXd6amhteHRtYWRuaGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3ODYzMDEsImV4cCI6MjA5OTM2MjMwMX0.M__77XaL933phx840o4wHh19sPEOZnHEfV8Wf3gT1LA'

export const useMock = import.meta.env.VITE_USE_MOCK === 'true'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (useMock) {
    throw new Error('Supabase no disponible en modo mock')
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey)
  }
  return client
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && !useMock)