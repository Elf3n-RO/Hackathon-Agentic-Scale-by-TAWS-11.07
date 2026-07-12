<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'

defineProps<{ escribiendo: boolean }>()

const chat = useChatStore()
const container = ref<HTMLElement | null>(null)

function scrollToBottom() {
  if (container.value) {
    container.value.scrollTop = container.value.scrollHeight
  }
}

defineExpose({ scrollToBottom })
</script>

<template>
  <div ref="container" class="messages-container">
    <div v-if="!chat.mensajes.length && !escribiendo" class="chat-hint">
      <p>Escribe libremente. Tu mensaje se envía directamente al agente IA en n8n.</p>
    </div>

    <div
      v-for="msg in chat.mensajes"
      :key="msg.id"
      class="message"
      :class="msg.rol"
    >
      <div class="message-avatar">
        {{ msg.rol === 'usuario' ? '👤' : '🤖' }}
      </div>
      <div class="message-bubble">
        <p>{{ msg.contenido }}</p>
        <span v-if="msg.metadata?.fuente" class="message-source text-sm">
          📚 Fuente: {{ String(msg.metadata.fuente) }}
        </span>
        <time class="message-time">{{ new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) }}</time>
      </div>
    </div>

    <div v-if="escribiendo" class="message asistente">
      <div class="message-avatar">🤖</div>
      <div class="message-bubble typing">
        <span /><span /><span />
      </div>
    </div>
  </div>
</template>

<style scoped>
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chat-hint {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-gray-500);
  font-size: 0.9375rem;
}

.message {
  display: flex;
  gap: 0.75rem;
  max-width: 85%;
}

.message.usuario {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.message-bubble {
  background: var(--color-gray-100);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  position: relative;
}

.message.usuario .message-bubble {
  background: var(--color-navy);
  color: var(--color-white);
}

.message-bubble p {
  font-size: 0.9375rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.message-source {
  display: block;
  margin-top: 0.5rem;
  color: var(--color-teal-dark);
  font-style: italic;
}

.message.usuario .message-source { color: var(--color-teal); }

.message-time {
  display: block;
  font-size: 0.6875rem;
  opacity: 0.5;
  margin-top: 0.375rem;
}

.typing {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 0.875rem 1rem;
}

.typing span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-gray-400);
  animation: bounce 1.2s infinite;
}

.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}
</style>
