<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useCrmStore } from '@/stores/crm'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import ChatMessages from '@/components/chat/ChatMessages.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import CrmPanel from '@/components/crm/CrmPanel.vue'
import QuizPanel from '@/components/chat/QuizPanel.vue'

const chat = useChatStore()
const crm = useCrmStore()

const mensaje = ref('')
const messagesRef = ref<InstanceType<typeof ChatMessages> | null>(null)
const mostrarAside = ref(true)

onMounted(async () => {
  await Promise.all([crm.cargarLeads(), chat.obtenerOCrearConversacion()])
  if (chat.mensajes.length > 0) mostrarAside.value = false
})

watch(() => chat.mensajes.length, async () => {
  await nextTick()
  messagesRef.value?.scrollToBottom()
})

watch(() => chat.conversacionActiva?.id, (id) => {
  if (id) crm.seleccionarLeadPorConversacion(id)
})

async function enviar() {
  if (!mensaje.value.trim()) return
  const texto = mensaje.value
  mensaje.value = ''
  mostrarAside.value = false
  await chat.enviarMensaje(texto)
}

async function nuevaConversacion() {
  mostrarAside.value = true
  await chat.crearConversacion()
}

function onIniciarQuiz() {
  mostrarAside.value = false
}

async function eliminarChatActual() {
  const id = chat.conversacionActiva?.id
  if (!id) return
  if (!confirm('¿Eliminar esta conversación? El admin podrá verla en el historial eliminado.')) return
  await chat.eliminarConversacion(id)
}
</script>

<template>
  <div class="chat-page">
    <ChatSidebar @nueva="nuevaConversacion" />

    <div class="chat-main">
      <div v-if="!chat.conversacionActiva" class="chat-empty">
        <span class="empty-icon">💬</span>
        <h2>Iniciando chat...</h2>
      </div>

      <template v-else>
        <div class="chat-header">
          <div>
            <h2>{{ chat.conversacionActiva.titulo }}</h2>
            <p class="text-sm text-muted">Asistente IA — conectado a n8n</p>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-eliminar"
            title="Eliminar chat"
            @click="eliminarChatActual"
          >
            Eliminar chat
          </button>
        </div>

        <ChatMessages ref="messagesRef" :escribiendo="chat.escribiendo" />

        <p v-if="chat.error" class="chat-error">{{ chat.error }}</p>

        <ChatInput v-model="mensaje" :disabled="chat.escribiendo" @send="enviar" />
      </template>
    </div>

    <aside v-if="mostrarAside" class="chat-aside">
      <CrmPanel :lead="crm.leadActivo" />
      <QuizPanel
        :fuente="chat.fuenteActual"
        :quiz="chat.quizActivo"
        @iniciar-quiz="onIniciarQuiz"
      />
    </aside>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--color-white);
}

.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-gray-100);
}

.chat-header h2 {
  font-size: 1.125rem;
  color: var(--color-navy);
  margin-bottom: 0.125rem;
}

.btn-eliminar {
  flex-shrink: 0;
  color: var(--color-danger);
  border: 1px solid var(--color-gray-200);
}

.btn-eliminar:hover {
  background: rgba(220, 38, 38, 0.06);
  border-color: var(--color-danger);
}

.chat-error {
  padding: 0 1.25rem 0.5rem;
  color: var(--color-danger);
  font-size: 0.8125rem;
}

.chat-aside {
  width: 320px;
  border-left: 1px solid var(--color-gray-200);
  background: var(--color-gray-50);
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

@media (max-width: 1024px) {
  .chat-aside { display: none; }
}
</style>
