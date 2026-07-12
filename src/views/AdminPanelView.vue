<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { Profile } from '@/types'

const auth = useAuthStore()
const profiles = ref<Profile[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    profiles.value = await auth.fetchAllProfiles()
  } finally {
    loading.value = false
  }
})

function roleBadge(role: string) {
  const map: Record<string, string> = {
    cliente: 'badge-teal',
    ejecutivo: 'badge-navy',
    admin: 'badge-warning',
  }
  return map[role] ?? 'badge-navy'
}
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <h1>Panel de Administración</h1>
      <p class="text-muted">Gestión de usuarios y configuración del sistema</p>
    </div>

    <div class="stats-row">
      <div class="stat-mini card">
        <span class="stat-num">{{ profiles.length }}</span>
        <span class="text-sm text-muted">Usuarios totales</span>
      </div>
      <div class="stat-mini card">
        <span class="stat-num">{{ profiles.filter(p => p.role === 'cliente').length }}</span>
        <span class="text-sm text-muted">Clientes</span>
      </div>
      <div class="stat-mini card">
        <span class="stat-num">{{ profiles.filter(p => p.role === 'ejecutivo').length }}</span>
        <span class="text-sm text-muted">Ejecutivos</span>
      </div>
    </div>

    <div class="card">
      <div class="card-header">Usuarios registrados</div>
      <div class="card-body">
        <div v-if="loading" class="text-muted text-sm">Cargando...</div>
        <table v-else class="users-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Registro</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in profiles" :key="p.id">
              <td>{{ p.full_name || '—' }}</td>
              <td>{{ p.email }}</td>
              <td><span class="badge" :class="roleBadge(p.role)">{{ p.role }}</span></td>
              <td class="text-sm text-muted">{{ new Date(p.created_at).toLocaleDateString('es') }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!loading && !profiles.length" class="text-muted text-sm text-center">No hay usuarios.</p>
      </div>
    </div>

    <div class="card mt-2">
      <div class="card-header">Configuración</div>
      <div class="card-body config-info">
        <div class="config-row">
          <span>Modo mock</span>
          <span class="badge badge-teal">{{ import.meta.env.VITE_USE_MOCK === 'true' ? 'Activo' : 'Desactivado' }}</span>
        </div>
        <div class="config-row">
          <span>Supabase</span>
          <span class="badge badge-success">Conectado</span>
        </div>
        <div class="config-row">
          <span>Webhook n8n</span>
          <span class="badge" :class="import.meta.env.VITE_N8N_WEBHOOK_URL ? 'badge-success' : 'badge-warning'">
            {{ import.meta.env.VITE_N8N_WEBHOOK_URL ? 'Configurado' : 'Pendiente' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  padding: 2rem;
  max-width: 900px;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.75rem;
  color: var(--color-navy);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-mini {
  padding: 1rem;
  text-align: center;
}

.stat-num {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-navy);
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-gray-100);
  font-size: 0.9375rem;
}

.users-table th {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-gray-500);
  letter-spacing: 0.04em;
}

.config-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.9375rem;
}
</style>
