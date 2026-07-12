<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const fullName = ref('')
const saving = ref(false)
const saved = ref(false)

onMounted(() => {
  fullName.value = auth.profile?.full_name ?? ''
})

async function guardar() {
  saving.value = true
  saved.value = false
  const ok = await auth.updateProfile({ full_name: fullName.value })
  saving.value = false
  if (ok) saved.value = true
}
</script>

<template>
  <div class="profile-page">
    <div class="page-header">
      <h1>Mi perfil</h1>
      <p class="text-muted">Gestiona tu información personal</p>
    </div>

    <div class="card profile-card">
      <div class="card-body">
        <div class="profile-avatar">
          {{ auth.userName.charAt(0).toUpperCase() }}
        </div>

        <form @submit.prevent="guardar">
          <div class="form-group">
            <label for="name">Nombre completo</label>
            <input id="name" v-model="fullName" type="text" class="form-input" />
          </div>

          <div class="form-group">
            <label>Correo electrónico</label>
            <input :value="auth.profile?.email" type="email" class="form-input" disabled />
          </div>

          <div class="form-group">
            <label>Rol</label>
            <span class="badge badge-teal">{{ auth.profile?.role }}</span>
          </div>

          <p v-if="saved" class="text-sm" style="color: var(--color-success)">Perfil actualizado.</p>

          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  padding: 2rem;
  max-width: 560px;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.75rem;
  color: var(--color-navy);
}

.profile-card { padding: 0; }

.profile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-teal), var(--color-sky));
  color: var(--color-navy-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}
</style>
