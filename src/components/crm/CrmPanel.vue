<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LeadCRM } from '@/types'

const props = defineProps<{ lead: LeadCRM | null }>()

const prioridadLabel = computed(() => {
  const p = props.lead?.prioridad ?? 0
  if (p >= 70) return 'Alta'
  if (p >= 40) return 'Media'
  return 'Baja'
})

const prioridadClass = computed(() => {
  const p = props.lead?.prioridad ?? 0
  if (p >= 70) return 'badge-danger'
  if (p >= 40) return 'badge-warning'
  return 'badge-teal'
})
</script>

<template>
  <div class="crm-panel">
    <div class="panel-header">
      <h3>📊 Ficha CRM</h3>
    </div>

    <div v-if="!lead" class="panel-empty">
      <p class="text-muted text-sm">Conversa con el asesor para generar datos del lead.</p>
    </div>

    <div v-else class="panel-body">
      <div class="field">
        <label>Tipo</label>
        <span class="badge badge-navy">{{ lead.tipo ?? 'Sin clasificar' }}</span>
      </div>

      <div class="field">
        <label>Prioridad</label>
        <div class="flex items-center gap-1">
          <div class="priority-bar" style="flex:1">
            <div class="priority-bar-fill" :style="{ width: lead.prioridad + '%' }" />
          </div>
          <span class="badge" :class="prioridadClass">{{ lead.prioridad }}% {{ prioridadLabel }}</span>
        </div>
      </div>

      <div class="field">
        <label>Interés</label>
        <p>{{ lead.interes || '—' }}</p>
      </div>

      <div class="field">
        <label>Presupuesto</label>
        <p>{{ lead.presupuesto || '—' }}</p>
      </div>

      <div class="field">
        <label>Urgencia</label>
        <p>{{ lead.urgencia || '—' }}</p>
      </div>

      <div class="field">
        <label>Etapa</label>
        <span class="badge badge-teal">{{ lead.etapa }}</span>
      </div>

      <div class="field">
        <label>Resumen</label>
        <p class="text-sm">{{ lead.resumen || '—' }}</p>
      </div>

      <div v-if="lead.objeciones" class="field">
        <label>Objeciones</label>
        <p class="text-sm">{{ lead.objeciones }}</p>
      </div>

      <div v-if="lead.siguiente_accion" class="field action-field">
        <label>Siguiente acción</label>
        <p class="action-text">{{ lead.siguiente_accion }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crm-panel {
  height: 100%;
}

.panel-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-gray-200);
}

.panel-header h3 {
  font-size: 0.9375rem;
  color: var(--color-navy);
}

.panel-empty, .panel-body {
  padding: 1.25rem;
}

.field {
  margin-bottom: 1rem;
}

.field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-gray-500);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.25rem;
}

.field p {
  font-size: 0.9375rem;
  color: var(--color-gray-700);
}

.action-field {
  background: rgba(45, 212, 191, 0.08);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
}

.action-text {
  font-weight: 600;
  color: var(--color-navy);
}
</style>
