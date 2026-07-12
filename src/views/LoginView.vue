<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)

const confirmOk = route.query.confirmed === '1'
const confirmFail = route.query.confirmed === '0'

async function handleLogin() {
  loading.value = true
  const ok = await auth.signIn(email.value, password.value)
  loading.value = false
  if (ok) {
    const redirect = (route.query.redirect as string) || '/app'
    router.push(redirect)
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="auth-header">
        <span class="auth-logo">📈</span>
        <h1>Iniciar sesión</h1>
        <p class="text-muted">SyntaxError Track1</p>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">Correo electrónico</label>
          <input id="email" v-model="email" type="email" class="form-input" placeholder="tu@email.com" required />
        </div>
        <div class="form-group">
          <label for="password">Contraseña</label>
          <input id="password" v-model="password" type="password" class="form-input" placeholder="••••••••" required />
        </div>

        <p v-if="confirmOk" class="text-sm mb-2" style="color: var(--color-success)">
          Correo confirmado. Ya puedes iniciar sesión.
        </p>
        <p v-if="confirmFail" class="form-error mb-2">
          No se pudo confirmar el enlace. Prueba iniciar sesión o registrarte de nuevo.
        </p>
        <p v-if="auth.error" class="form-error mb-2">{{ auth.error }}</p>

        <button type="submit" class="btn btn-primary w-full" :disabled="loading">
          {{ loading ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </form>

      <p class="auth-footer text-sm text-muted">
        ¿No tienes cuenta?
        <RouterLink to="/registro">Regístrate aquí</RouterLink>
      </p>
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
  margin-bottom: 1.5rem;
}

.auth-logo {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.auth-header h1 {
  font-size: 1.5rem;
  color: var(--color-navy);
}

.auth-footer {
  text-align: center;
  margin-top: 1.25rem;
}
</style>
