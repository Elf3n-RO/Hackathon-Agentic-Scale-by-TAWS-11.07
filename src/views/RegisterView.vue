<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types'

const auth = useAuthStore()
const router = useRouter()

const fullName = ref('')
const email = ref('')
const password = ref('')
const role = ref<UserRole>('cliente')
const loading = ref(false)
const success = ref(false)

async function handleRegister() {
  loading.value = true
  success.value = false
  const ok = await auth.signUp(fullName.value, email.value, password.value, role.value)
  loading.value = false
  if (ok) {
    if (auth.infoMessage) {
      success.value = false
      return
    }
    success.value = true
    setTimeout(() => router.push('/app'), 1500)
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card card">
      <div class="auth-header">
        <span class="auth-logo">📈</span>
        <h1>Crear cuenta</h1>
        <p class="text-muted">SyntaxError Track1</p>
      </div>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="name">Nombre completo</label>
          <input id="name" v-model="fullName" type="text" class="form-input" placeholder="Tu nombre" required />
        </div>
        <div class="form-group">
          <label for="email">Correo electrónico</label>
          <input id="email" v-model="email" type="email" class="form-input" placeholder="tu@email.com" required />
        </div>
        <div class="form-group">
          <label for="password">Contraseña</label>
          <input id="password" v-model="password" type="password" class="form-input" placeholder="Mínimo 6 caracteres" minlength="6" required />
        </div>
        <div class="form-group">
          <label for="role">Tipo de usuario</label>
          <select id="role" v-model="role" class="form-input">
            <option value="cliente">Cliente</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <p v-if="auth.error" class="form-error mb-2">{{ auth.error }}</p>
        <p v-if="auth.infoMessage" class="text-sm mb-2" style="color: var(--color-success)">{{ auth.infoMessage }}</p>
        <p v-if="success" class="text-sm" style="color: var(--color-success)">¡Cuenta creada! Redirigiendo...</p>

        <button type="submit" class="btn btn-primary w-full" :disabled="loading">
          {{ loading ? 'Creando cuenta...' : 'Registrarme' }}
        </button>
      </form>

      <p class="auth-footer text-sm text-muted">
        ¿Ya tienes cuenta?
        <RouterLink to="/login">Inicia sesión</RouterLink>
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
