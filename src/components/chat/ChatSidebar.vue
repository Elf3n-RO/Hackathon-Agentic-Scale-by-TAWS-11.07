<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'

defineEmits<{ nueva: [] }>()

const chat = useChatStore()
const renombrando = ref<string | null>(null)
const nuevoTitulo = ref('')

function iniciarRenombrar(id: string, titulo: string) {
  renombrando.value = id
  nuevoTitulo.value = titulo
}

async function confirmarRenombrar(id: string) {
  if (nuevoTitulo.value.trim()) {
    await chat.renombrarConversacion(id, nuevoTitulo.value.trim())
  }
  renombrando.value = null
}

async function eliminar(id: string) {
  if (confirm('¿Eliminar esta conversación?')) {
    await chat.eliminarConversacion(id)
  }
}
</script>

<template>
  <aside class="chat-sidebar">
    <div class="sidebar-top">
      <h3>Historial</h3>
      <button class="btn btn-primary btn-sm w-full" @click="$emit('nueva')">
        + Nueva conversación
      </button>
    </div>

    <div class="conv-list">
      <div
        v-for="conv in chat.conversaciones"
        :key="conv.id"
        class="conv-item"
        :class="{ active: chat.conversacionActiva?.id === conv.id }"
        @click="chat.seleccionarConversacion(conv)"
      >
        <div class="conv-info">
          <template v-if="renombrando === conv.id">
            <input
              v-model="nuevoTitulo"
              class="form-input"
              @keyup.enter="confirmarRenombrar(conv.id)"
              @blur="confirmarRenombrar(conv.id)"
              @click.stop
            />
          </template>
          <template v-else>
            <span class="conv-icon">💬</span>
            <div>
              <div class="conv-title">{{ conv.titulo }}</div>
              <div class="conv-date text-sm text-muted">
                {{ new Date(conv.updated_at).toLocaleDateString('es') }}
              </div>
            </div>
          </template>
        </div>
        <div class="conv-actions" @click.stop>
          <button class="btn-icon btn-sm" title="Renombrar" @click="iniciarRenombrar(conv.id, conv.titulo)">✏️</button>
          <button class="btn-icon btn-sm" title="Eliminar" @click="eliminar(conv.id)">🗑️</button>
        </div>
      </div>

      <p v-if="!chat.conversaciones.length" class="text-muted text-sm text-center" style="padding: 1rem">
        Sin conversaciones aún
      </p>
    </div>
  </aside>
</template>

<style scoped>
.chat-sidebar {
  width: 280px;
  border-right: 1px solid var(--color-gray-200);
  background: var(--color-gray-50);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-top {
  padding: 1rem;
  border-bottom: 1px solid var(--color-gray-200);
}

.sidebar-top h3 {
  font-size: 0.875rem;
  color: var(--color-gray-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.conv-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.conv-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 0.25rem;
}

.conv-item:hover { background: var(--color-gray-100); }
.conv-item.active { background: rgba(45, 212, 191, 0.12); }

.conv-info {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
  flex: 1;
}

.conv-icon { font-size: 1.25rem; flex-shrink: 0; }

.conv-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-navy);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-actions {
  display: none;
  gap: 0.125rem;
}

.conv-item:hover .conv-actions { display: flex; }

@media (max-width: 768px) {
  .chat-sidebar { width: 64px; }
  .sidebar-top h3, .sidebar-top .btn, .conv-title, .conv-date, .conv-actions { display: none; }
}
</style>
