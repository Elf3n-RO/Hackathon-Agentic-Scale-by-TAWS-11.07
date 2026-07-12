<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getSupabase } from '@/services/supabase'

const router = useRouter()
const auth = useAuthStore()
const status = ref('Confirmando tu cuenta...')
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const supabase = getSupabase()
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const hash = window.location.hash

    if (code) {
      const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (exchangeErr) throw exchangeErr
    } else if (hash.includes('access_token') || hash.includes('error')) {
      // Flujo implícito: el cliente lee el hash
      const { error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr) throw sessionErr
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      throw new Error(
        'No se pudo confirmar la sesión. El enlace puede haber expirado. Intenta iniciar sesión o regístrate de nuevo.',
      )
    }

    await auth.applySessionUser(session.user)
    status.value = 'Cuenta confirmada. Entrando...'
    await router.replace('/app')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al confirmar la cuenta'
    status.value = 'No se pudo confirmar'
    setTimeout(() => {
      router.replace({ name: 'login', query: { confirmed: '0' } })
    }, 3500)
  }
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="auth-header">
        <span class="auth-logo">📈</span>
        <h1>{{ status }}</h1>
        <p v-if="!error" class="text-muted">Un momento...</p>
        <p v-else class="form-error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, var(--color-navy-dark), var(--color-navy));
  padding: 1rem;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 2rem;
}

.auth-header {
  text-align: center;
}

.auth-logo {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.auth-header h1 {
  font-size: 1.25rem;
  color: var(--color-navy);
}
</style>
