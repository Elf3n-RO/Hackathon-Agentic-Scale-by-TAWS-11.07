import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/types'
import { getSupabase, useMock } from '@/services/supabase'
import { formatSupabaseError, isEmailConfirmationRequired } from '@/utils/errors'

const MOCK_USERS: Record<string, { password: string; profile: Profile }> = {
  'cliente@demo.com': {
    password: 'demo1234',
    profile: {
      id: 'mock-cliente-1',
      full_name: 'María López',
      email: 'cliente@demo.com',
      role: 'cliente',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  'ejecutivo@demo.com': {
    password: 'demo1234',
    profile: {
      id: 'mock-ejecutivo-1',
      full_name: 'Carlos Ruiz',
      email: 'ejecutivo@demo.com',
      role: 'ejecutivo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  'admin@demo.com': {
    password: 'demo1234',
    profile: {
      id: 'mock-admin-1',
      full_name: 'Ana Admin',
      email: 'admin@demo.com',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
}

let initialized = false

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const profile = ref<Profile | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const infoMessage = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const isCliente = computed(() => profile.value?.role === 'cliente')
  const isEjecutivo = computed(() => profile.value?.role === 'ejecutivo')
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const userName = computed(() => profile.value?.full_name || profile.value?.email || 'Usuario')

  async function fetchProfile(userId: string) {
    if (useMock) return

    const supabase = getSupabase()
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (err) throw err
    if (data) profile.value = data as Profile
  }

  async function ensureProfile(
    userId: string,
    fullName: string,
    email: string,
    role: UserRole,
  ) {
    const supabase = getSupabase()
    const { data, error: err } = await supabase
      .from('profiles')
      .upsert(
        { id: userId, full_name: fullName, email, role },
        { onConflict: 'id' },
      )
      .select()
      .single()

    if (err) throw err
    profile.value = data as Profile
  }

  async function init() {
    if (initialized) return
    initialized = true

    loading.value = true
    error.value = null

    try {
      if (useMock) {
        loading.value = false
        return
      }

      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        user.value = session.user
        await fetchProfile(session.user.id)
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        user.value = session?.user ?? null
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          profile.value = null
        }
      })
    } catch (e) {
      error.value = formatSupabaseError(e)
    } finally {
      loading.value = false
    }
  }

  async function signIn(email: string, password: string) {
    error.value = null

    if (useMock) {
      const mock = MOCK_USERS[email.toLowerCase()]
      if (!mock || mock.password !== password) {
        error.value = 'Credenciales incorrectas'
        return false
      }
      user.value = { id: mock.profile.id, email } as User
      profile.value = mock.profile
      return true
    }

    const supabase = getSupabase()
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      error.value = formatSupabaseError(err)
      return false
    }

    user.value = data.user
    try {
      await fetchProfile(data.user.id)
      if (!profile.value) {
        await ensureProfile(
          data.user.id,
          data.user.user_metadata?.full_name ?? '',
          data.user.email ?? email,
          (data.user.user_metadata?.role as UserRole) ?? 'cliente',
        )
      }
    } catch (e) {
      error.value = formatSupabaseError(e)
      return false
    }
    return true
  }

  async function signUp(fullName: string, email: string, password: string, role: UserRole = 'cliente'): Promise<boolean> {
    error.value = null
    infoMessage.value = null

    if (useMock) {
      error.value = 'Registro deshabilitado en modo mock'
      return false
    }

    const supabase = getSupabase()

    try {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
        },
      })

      if (err) {
        error.value = formatSupabaseError(err)
        return false
      }

      if (!data.user) {
        error.value = 'No se pudo crear la cuenta. Intenta de nuevo.'
        return false
      }

      if (isEmailConfirmationRequired(data.session, data.user)) {
        infoMessage.value = 'Cuenta creada. Revisa tu correo para confirmar antes de iniciar sesión.'
        return true
      }

      user.value = data.user

      try {
        await fetchProfile(data.user.id)
        if (!profile.value) {
          await ensureProfile(data.user.id, fullName, email, role)
        }
      } catch (e) {
        error.value = formatSupabaseError(e)
        return false
      }

      return true
    } catch (e) {
      error.value = formatSupabaseError(e)
      return false
    }
  }

  async function signOut() {
    if (useMock) {
      user.value = null
      profile.value = null
      return
    }
    const supabase = getSupabase()
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
  }

  async function updateProfile(updates: Partial<Pick<Profile, 'full_name'>>) {
    if (!user.value) return false

    if (useMock) {
      if (profile.value) profile.value = { ...profile.value, ...updates }
      return true
    }

    const supabase = getSupabase()
    const { error: err } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.value.id)

    if (err) {
      error.value = err.message
      return false
    }

    if (profile.value) profile.value = { ...profile.value, ...updates }
    return true
  }

  async function fetchAllProfiles(): Promise<Profile[]> {
    if (useMock) return Object.values(MOCK_USERS).map((u) => u.profile)

    const supabase = getSupabase()
    const { data, error: err } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (err) throw err
    return (data ?? []) as Profile[]
  }

  return {
    user,
    profile,
    loading,
    error,
    infoMessage,
    isAuthenticated,
    isCliente,
    isEjecutivo,
    isAdmin,
    userName,
    init,
    signIn,
    signUp,
    signOut,
    updateProfile,
    fetchAllProfiles,
  }
})
