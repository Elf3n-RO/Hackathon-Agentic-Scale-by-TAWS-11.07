<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Conversacion, Mensaje, Profile } from '@/types'
import {
  actionLabel,
  fetchPendingFollowups,
  reviewFollowup,
  stageLabel,
  type FollowupPending,
} from '@/services/followup'
import { fetchConversationMessages, fetchUserConversations } from '@/services/chatHistory'

const auth = useAuthStore()
const router = useRouter()

const profiles = ref<Profile[]>([])
const filteredProfiles = ref<Profile[]>([])
const userQuery = ref('')
const loadingUsers = ref(true)
const usersError = ref<string | null>(null)

const followups = ref<FollowupPending[]>([])
const loadingFollowups = ref(true)
const followupError = ref<string | null>(null)
const actionBusyId = ref<string | null>(null)
const editingId = ref<string | null>(null)
const editedAction = ref('')
const actionMessage = ref<string | null>(null)

const selectedUser = ref<Profile | null>(null)
const activas = ref<Conversacion[]>([])
const loadingHistory = ref(false)
const historyError = ref<string | null>(null)
const selectedConv = ref<Conversacion | null>(null)
const convMessages = ref<Mensaje[]>([])
const loadingMessages = ref(false)

let pollTimer: ReturnType<typeof setInterval> | null = null

const stats = computed(() => ({
  total: profiles.value.length,
  clientes: profiles.value.filter((p) => p.role === 'cliente').length,
  admins: profiles.value.filter((p) => p.role === 'admin').length,
  pendientes: followups.value.length,
}))

async function loadUsers() {
  loadingUsers.value = true
  usersError.value = null
  try {
    profiles.value = await auth.fetchAllProfiles()
    applyUserFilter()
  } catch (e) {
    usersError.value = e instanceof Error ? e.message : 'Error al cargar usuarios'
  } finally {
    loadingUsers.value = false
  }
}

function applyUserFilter() {
  const q = userQuery.value.trim().toLowerCase()
  if (!q) {
    filteredProfiles.value = profiles.value
    return
  }
  filteredProfiles.value = profiles.value.filter((p) => {
    return (
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.role || '').toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    )
  })
}

async function onSearchUsers() {
  loadingUsers.value = true
  usersError.value = null
  try {
    filteredProfiles.value = await auth.searchProfiles(userQuery.value)
  } catch (e) {
    usersError.value = e instanceof Error ? e.message : 'Error al buscar usuarios'
  } finally {
    loadingUsers.value = false
  }
}

async function openUserHistory(user: Profile) {
  selectedUser.value = user
  selectedConv.value = null
  convMessages.value = []
  loadingHistory.value = true
  historyError.value = null
  try {
    const data = await fetchUserConversations(user.id)
    activas.value = data.activas
  } catch (e) {
    historyError.value = e instanceof Error ? e.message : 'Error al cargar historial'
    activas.value = []
  } finally {
    loadingHistory.value = false
  }
}

function closeUserHistory() {
  selectedUser.value = null
  selectedConv.value = null
  convMessages.value = []
  activas.value = []
}

async function openConversation(conv: Conversacion) {
  selectedConv.value = conv
  loadingMessages.value = true
  try {
    convMessages.value = await fetchConversationMessages(conv.id)
  } catch (e) {
    historyError.value = e instanceof Error ? e.message : 'Error al cargar mensajes'
    convMessages.value = []
  } finally {
    loadingMessages.value = false
  }
}

async function loadFollowups() {
  loadingFollowups.value = true
  followupError.value = null
  try {
    followups.value = await fetchPendingFollowups()
  } catch (e) {
    followupError.value = e instanceof Error ? e.message : 'Error al cargar propuestas'
  } finally {
    loadingFollowups.value = false
  }
}

function startEdit(item: FollowupPending) {
  editingId.value = item.id
  editedAction.value = item.action_details || actionLabel(item.suggested_action)
}

function cancelEdit() {
  editingId.value = null
  editedAction.value = ''
}

async function submitReview(
  item: FollowupPending,
  status: 'approved' | 'edited' | 'rejected',
) {
  actionBusyId.value = item.id
  actionMessage.value = null
  followupError.value = null

  try {
    const reviewed_by = auth.userName || auth.profile?.email || 'admin'
    const payload =
      status === 'edited'
        ? {
            followup_id: item.id,
            status,
            reviewed_by,
            edited_action: editedAction.value.trim(),
          }
        : {
            followup_id: item.id,
            status,
            reviewed_by,
          }

    if (status === 'edited' && !editedAction.value.trim()) {
      followupError.value = 'Escribe la acción editada antes de guardar.'
      return
    }

    const result = await reviewFollowup(payload)
    if (!result.ok) {
      followupError.value = (result.errors || [result.error || 'No se pudo guardar']).join(' · ')
      return
    }

    followups.value = followups.value.filter((f) => f.id !== item.id)
    editingId.value = null
    editedAction.value = ''
    actionMessage.value =
      status === 'approved'
        ? 'Propuesta aprobada'
        : status === 'edited'
          ? 'Propuesta editada y guardada'
          : 'Propuesta rechazada'
  } catch (e) {
    followupError.value = e instanceof Error ? e.message : 'Error al revisar propuesta'
  } finally {
    actionBusyId.value = null
  }
}

onMounted(async () => {
  if (!auth.isAdmin) {
    router.replace('/app')
    return
  }

  await Promise.all([loadUsers(), loadFollowups()])
  pollTimer = setInterval(() => {
    if (auth.isAdmin) loadFollowups()
  }, 30000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1>Panel de Administración</h1>
        <p class="text-muted">Usuarios, historial de chats y seguimiento comercial</p>
      </div>
      <button class="btn btn-secondary btn-sm" :disabled="loadingFollowups" @click="loadFollowups">
        Refrescar propuestas
      </button>
    </div>

    <div class="stats-row">
      <div class="stat-mini card">
        <span class="stat-num">{{ stats.total }}</span>
        <span class="text-sm text-muted">Usuarios</span>
      </div>
      <div class="stat-mini card">
        <span class="stat-num">{{ stats.clientes }}</span>
        <span class="text-sm text-muted">Clientes</span>
      </div>
      <div class="stat-mini card">
        <span class="stat-num">{{ stats.admins }}</span>
        <span class="text-sm text-muted">Admins</span>
      </div>
      <div class="stat-mini card">
        <span class="stat-num">{{ stats.pendientes }}</span>
        <span class="text-sm text-muted">Hitos importantes</span>
      </div>
    </div>

    <div class="grid-2">
      <section class="card">
        <div class="card-header flex justify-between items-center">
          <span>Usuarios registrados</span>
          <button class="btn btn-secondary btn-sm" :disabled="loadingUsers" @click="loadUsers">
            Recargar
          </button>
        </div>
        <div class="card-body">
          <div class="search-row">
            <input
              v-model="userQuery"
              class="form-input"
              type="search"
              placeholder="Buscar por nombre, email, rol o ID..."
              @keyup.enter="onSearchUsers"
              @input="applyUserFilter"
            />
            <button class="btn btn-primary btn-sm" :disabled="loadingUsers" @click="onSearchUsers">
              Buscar
            </button>
          </div>

          <p v-if="usersError" class="form-error">{{ usersError }}</p>
          <p v-if="loadingUsers" class="text-muted text-sm">Cargando usuarios...</p>

          <div v-else class="table-wrap">
            <table class="users-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Historial</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in filteredProfiles" :key="p.id">
                  <td>{{ p.full_name || '—' }}</td>
                  <td>{{ p.email }}</td>
                  <td>
                    <span class="badge" :class="p.role === 'admin' ? 'badge-warning' : 'badge-teal'">
                      {{ p.role }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-sm" @click="openUserHistory(p)">
                      Ver chats
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="!filteredProfiles.length" class="text-muted text-sm text-center mt-1">
              No hay usuarios que coincidan.
            </p>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-header">Seguimiento pendiente (IA)</div>
        <div class="card-body">
          <p class="followup-hint text-sm text-muted">
            Solo se muestran propuestas en hitos comerciales importantes: decisión de compra,
            solicitud de reunión, derivación a especialista u objeciones relevantes.
          </p>
          <p v-if="actionMessage" class="ok-msg">{{ actionMessage }}</p>
          <p v-if="followupError" class="form-error">{{ followupError }}</p>
          <p v-if="loadingFollowups && !followups.length" class="text-muted text-sm">Cargando propuestas...</p>

          <div v-for="item in followups" :key="item.id" class="followup-card">
            <div class="followup-top">
              <strong>{{ item.needs_summary || 'Sin resumen' }}</strong>
              <span class="badge badge-navy">{{ stageLabel(item.funnel_stage) }}</span>
            </div>
            <p class="text-sm"><strong>Perfil:</strong> {{ item.profile_summary || '—' }}</p>
            <p class="text-sm"><strong>Objeciones:</strong> {{ item.objections || '—' }}</p>
            <p class="text-sm action-line">
              <strong>Acción sugerida:</strong>
              {{ actionLabel(item.suggested_action) }}
              <span v-if="item.action_details"> — {{ item.action_details }}</span>
            </p>
            <p class="text-sm text-muted">
              {{ new Date(item.created_at).toLocaleString('es') }} · session {{ item.session_id.slice(0, 8) }}…
            </p>

            <div v-if="editingId === item.id" class="edit-box">
              <textarea v-model="editedAction" class="form-input" rows="3" placeholder="Acción editada..." />
              <div class="flex gap-1 mt-1">
                <button
                  class="btn btn-primary btn-sm"
                  :disabled="actionBusyId === item.id"
                  @click="submitReview(item, 'edited')"
                >
                  Guardar edición
                </button>
                <button class="btn btn-secondary btn-sm" @click="cancelEdit">Cancelar</button>
              </div>
            </div>

            <div v-else class="accion-btns">
              <button
                class="btn btn-primary btn-sm"
                :disabled="actionBusyId === item.id"
                @click="submitReview(item, 'approved')"
              >
                ✓ Aprobar
              </button>
              <button class="btn btn-secondary btn-sm" :disabled="actionBusyId === item.id" @click="startEdit(item)">
                ✏️ Editar
              </button>
              <button
                class="btn btn-danger btn-sm"
                :disabled="actionBusyId === item.id"
                @click="submitReview(item, 'rejected')"
              >
                ✗ Rechazar
              </button>
            </div>
          </div>

          <p v-if="!loadingFollowups && !followups.length" class="text-muted text-sm text-center">
            No hay hitos comerciales pendientes de revisión.
          </p>
        </div>
      </section>
    </div>

    <!-- Historial de chats del usuario -->
    <div v-if="selectedUser" class="history-overlay" @click.self="closeUserHistory">
      <div class="history-modal card">
        <div class="card-header flex justify-between items-center">
          <div>
            <strong>Historial de {{ selectedUser.full_name || selectedUser.email }}</strong>
            <p class="text-sm text-muted">
              Chats activos guardados en Supabase ({{ activas.length }}).
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" @click="closeUserHistory">Cerrar</button>
        </div>

        <div class="history-body">
          <div class="history-sidebar">
            <p v-if="historyError" class="form-error">{{ historyError }}</p>
            <p v-if="loadingHistory" class="text-muted text-sm">Cargando chats...</p>

            <button
              v-for="conv in activas"
              :key="conv.id"
              class="conv-item"
              :class="{ active: selectedConv?.id === conv.id }"
              @click="openConversation(conv)"
            >
              <div class="conv-title">{{ conv.titulo || 'Chat IA' }}</div>
              <div class="conv-meta">
                <span class="badge badge-success">Activo</span>
                <span class="text-sm text-muted">
                  {{ new Date(conv.updated_at).toLocaleDateString('es') }}
                </span>
              </div>
            </button>

            <p v-if="!loadingHistory && !activas.length" class="text-muted text-sm text-center">
              Sin conversaciones activas.
            </p>
          </div>

          <div class="history-messages">
            <div v-if="!selectedConv" class="empty-messages text-muted">
              Selecciona un chat para ver los mensajes guardados: lo que escribió el usuario y lo que respondió la IA.
            </div>

            <template v-else>
              <div class="messages-header">
                <strong>{{ selectedConv.titulo }}</strong>
                <span class="badge badge-success">Activo</span>
              </div>

              <p v-if="loadingMessages" class="text-muted text-sm">Cargando mensajes...</p>

              <div v-else class="messages-list">
                <div
                  v-for="msg in convMessages"
                  :key="msg.id"
                  class="msg-row"
                  :class="msg.rol"
                >
                  <div class="msg-role">
                    {{ msg.rol === 'usuario' ? 'Usuario' : 'IA' }}
                  </div>
                  <div class="msg-bubble">{{ msg.contenido }}</div>
                  <time class="msg-time">
                    {{ new Date(msg.created_at).toLocaleString('es') }}
                  </time>
                </div>
                <p v-if="!convMessages.length" class="text-muted text-sm text-center">
                  Este chat no tiene mensajes.
                </p>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  padding: 2rem;
  max-width: 1200px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.75rem;
  color: var(--color-navy);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.search-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.search-row .form-input {
  flex: 1;
}

.table-wrap {
  overflow-x: auto;
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

.followup-hint {
  margin-bottom: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: rgba(56, 189, 248, 0.08);
  border-radius: var(--radius-sm);
  line-height: 1.45;
}

.followup-card {
  border: 1px solid var(--color-gray-100);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin-bottom: 0.75rem;
}

.followup-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.action-line {
  background: rgba(45, 212, 191, 0.08);
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  margin: 0.5rem 0;
}

.accion-btns,
.edit-box {
  margin-top: 0.75rem;
}

.accion-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ok-msg {
  color: var(--color-success);
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.history-overlay {
  position: fixed;
  inset: 0;
  background: rgba(6, 20, 40, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
}

.history-modal {
  width: min(1100px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-body {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 420px;
  max-height: calc(90vh - 72px);
}

.history-sidebar {
  border-right: 1px solid var(--color-gray-100);
  padding: 1rem;
  overflow-y: auto;
}

.filter-row {
  display: flex;
  gap: 0.375rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.conv-item {
  width: 100%;
  text-align: left;
  background: transparent;
  border: 1px solid var(--color-gray-100);
  border-radius: var(--radius-sm);
  padding: 0.625rem 0.75rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.conv-item:hover,
.conv-item.active {
  border-color: var(--color-teal);
  background: rgba(45, 212, 191, 0.08);
}

.conv-title {
  font-weight: 600;
  color: var(--color-navy);
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.conv-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.history-messages {
  padding: 1rem 1.25rem;
  overflow-y: auto;
  background: var(--color-gray-50);
}

.messages-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.empty-messages {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 2rem;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.msg-row {
  max-width: 85%;
}

.msg-row.usuario {
  align-self: flex-end;
}

.msg-row.asistente {
  align-self: flex-start;
}

.msg-role {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-gray-500);
  margin-bottom: 0.2rem;
}

.msg-bubble {
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius);
  background: var(--color-white);
  border: 1px solid var(--color-gray-100);
  white-space: pre-wrap;
  font-size: 0.9375rem;
}

.msg-row.usuario .msg-bubble {
  background: var(--color-navy);
  color: white;
  border-color: transparent;
}

.msg-time {
  display: block;
  font-size: 0.6875rem;
  color: var(--color-gray-500);
  margin-top: 0.25rem;
}

@media (max-width: 960px) {
  .grid-2,
  .stats-row,
  .history-body {
    grid-template-columns: 1fr;
  }
}
</style>
