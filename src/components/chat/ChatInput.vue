<script setup lang="ts">
const model = defineModel<string>({ required: true })

defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ send: [] }>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (model.value.trim()) emit('send')
  }
}
</script>

<template>
  <div class="chat-input-area">
    <textarea
      v-model="model"
      class="chat-textarea"
      placeholder="Escribe libremente tu pregunta o mensaje..."
      rows="3"
      :disabled="disabled"
      @keydown="onKeydown"
    />
    <button class="btn btn-primary send-btn" :disabled="disabled || !model.trim()" @click="emit('send')">
      Enviar ➤
    </button>
  </div>
</template>

<style scoped>
.chat-input-area {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--color-gray-100);
  background: var(--color-white);
}

.chat-textarea {
  flex: 1;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  resize: vertical;
  min-height: 72px;
  max-height: 200px;
  font-size: 0.9375rem;
  line-height: 1.5;
}

.chat-textarea:focus {
  outline: none;
  border-color: var(--color-teal);
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.15);
}

.send-btn {
  align-self: flex-end;
  flex-shrink: 0;
}
</style>
