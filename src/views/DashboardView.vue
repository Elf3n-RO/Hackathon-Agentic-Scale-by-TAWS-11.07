<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCrmStore } from '@/stores/crm'
import { useChatStore } from '@/stores/chat'

const auth = useAuthStore()
const crm = useCrmStore()
const chat = useChatStore()
const router = useRouter()

onMounted(async () => {
  await Promise.all([chat.cargarConversaciones(), crm.cargarLeads()])
})

const stats = computed(() => [
  { label: 'Conversaciones', value: chat.conversaciones.length, icon: '💬' },
  { label: 'Leads CRM', value: crm.leads.length, icon: '📊' },
])

function irAChat() {
  router.push({ name: 'chat' })
}
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <div>
        <h1>¡Hola, {{ auth.userName }}!</h1>
        <p class="text-muted">Bienvenido a SyntaxError Track1</p>
      </div>
      <span class="badge badge-teal">{{ auth.profile?.role }}</span>
    </div>

    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-card card">
        <span class="stat-icon">{{ stat.icon }}</span>
        <div>
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <div class="actions-grid">
      <div class="action-card card" @click="irAChat()">
        <span class="action-icon">💬</span>
        <h3>Chat IA</h3>
        <p>Conversación libre conectada a n8n. Califica leads y educación financiera desde un solo chat.</p>
        <button class="btn btn-primary btn-sm">Abrir chat</button>
      </div>
      <div v-if="auth.isAdmin" class="action-card card" @click="router.push('/app/admin')">
        <span class="action-icon">⚙️</span>
        <h3>Panel de Administración</h3>
        <p>Usuarios registrados y seguimiento IA solo en hitos comerciales importantes.</p>
        <button class="btn btn-navy btn-sm">Abrir panel</button>
      </div>
    </div>

    <div v-if="crm.leads.length" class="card mt-2">
      <div class="card-header">Leads recientes</div>
      <div class="card-body">
        <div v-for="lead in crm.leads.slice(0, 5)" :key="lead.id" class="lead-row">
          <div>
            <strong>{{ lead.tipo ?? 'Sin clasificar' }}</strong>
            <span class="text-muted text-sm"> — {{ lead.interes || 'Sin interés' }}</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="priority-bar" style="width: 80px">
              <div class="priority-bar-fill" :style="{ width: lead.prioridad + '%' }" />
            </div>
            <span class="badge badge-navy">{{ lead.prioridad }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 2rem;
  max-width: 1100px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.75rem;
  color: var(--color-navy);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
}

.stat-icon { font-size: 2rem; }

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-navy);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-gray-500);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
}

.action-card {
  padding: 1.5rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.action-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.75rem;
}

.action-card h3 {
  color: var(--color-navy);
  margin-bottom: 0.5rem;
}

.action-card p {
  color: var(--color-gray-500);
  font-size: 0.9375rem;
  margin-bottom: 1rem;
}

.lead-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-gray-100);
}

.lead-row:last-child { border-bottom: none; }
</style>
