<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCrmStore } from '@/stores/crm'
import type { AccionComercial } from '@/types'

const crm = useCrmStore()
const editando = ref<string | null>(null)
const propuestaEditada = ref('')
const notas = ref('')

onMounted(async () => {
  await Promise.all([crm.cargarLeads(), crm.cargarAcciones()])
})

function iniciarEditar(accion: AccionComercial) {
  editando.value = accion.id
  propuestaEditada.value = accion.propuesta
  notas.value = accion.notas
}

async function aprobar(id: string) {
  await crm.gestionarAccion(id, 'aprobada', notas.value)
  editando.value = null
}

async function rechazar(id: string) {
  await crm.gestionarAccion(id, 'rechazada', notas.value)
  editando.value = null
}

async function guardarEdicion(id: string) {
  await crm.gestionarAccion(id, 'editada', notas.value, propuestaEditada.value)
  editando.value = null
}

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    pendiente: 'badge-warning',
    aprobada: 'badge-success',
    editada: 'badge-teal',
    rechazada: 'badge-danger',
  }
  return map[estado] ?? 'badge-navy'
}
</script>

<template>
  <div class="exec-page">
    <div class="page-header">
      <h1>Panel CRM — Ejecutivo</h1>
      <p class="text-muted">Revisa leads y gestiona acciones comerciales propuestas</p>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">Leads ({{ crm.leads.length }})</div>
        <div class="card-body leads-list">
          <div v-for="lead in crm.leads" :key="lead.id" class="lead-card">
            <div class="lead-top">
              <strong>{{ lead.profiles?.full_name ?? 'Prospecto' }}</strong>
              <span class="badge badge-navy">{{ lead.tipo ?? 'N/A' }}</span>
            </div>
            <div class="lead-meta text-sm text-muted">
              {{ lead.interes || 'Sin interés' }} · Etapa: {{ lead.etapa }}
            </div>
            <div class="priority-row">
              <div class="priority-bar" style="flex:1">
                <div class="priority-bar-fill" :style="{ width: lead.prioridad + '%' }" />
              </div>
              <span class="badge" :class="lead.prioridad >= 60 ? 'badge-danger' : 'badge-warning'">
                {{ lead.prioridad }}%
              </span>
            </div>
            <p v-if="lead.resumen" class="lead-resumen text-sm">{{ lead.resumen }}</p>
            <p v-if="lead.objeciones" class="text-sm"><strong>Objeciones:</strong> {{ lead.objeciones }}</p>
            <p v-if="lead.siguiente_accion" class="next-action text-sm">
              <strong>Acción sugerida:</strong> {{ lead.siguiente_accion }}
            </p>
          </div>
          <p v-if="!crm.leads.length" class="text-muted text-sm text-center">No hay leads registrados.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-header">Acciones comerciales</div>
        <div class="card-body">
          <div v-for="accion in crm.acciones" :key="accion.id" class="accion-card">
            <div class="accion-top">
              <span class="badge" :class="estadoBadge(accion.estado)">{{ accion.estado }}</span>
              <time class="text-sm text-muted">{{ new Date(accion.created_at).toLocaleDateString('es') }}</time>
            </div>

            <template v-if="editando === accion.id">
              <textarea v-model="propuestaEditada" class="form-input mt-1" rows="2" />
              <textarea v-model="notas" class="form-input mt-1" rows="2" placeholder="Notas del ejecutivo..." />
              <div class="flex gap-1 mt-1">
                <button class="btn btn-primary btn-sm" @click="guardarEdicion(accion.id)">Guardar edición</button>
                <button class="btn btn-secondary btn-sm" @click="editando = null">Cancelar</button>
              </div>
            </template>

            <template v-else>
              <p class="accion-propuesta">{{ accion.propuesta }}</p>
              <p v-if="accion.notas" class="text-sm text-muted">Notas: {{ accion.notas }}</p>

              <div v-if="accion.estado === 'pendiente'" class="accion-btns">
                <button class="btn btn-primary btn-sm" @click="aprobar(accion.id)">✓ Aprobar</button>
                <button class="btn btn-secondary btn-sm" @click="iniciarEditar(accion)">✏️ Editar</button>
                <button class="btn btn-danger btn-sm" @click="rechazar(accion.id)">✗ Rechazar</button>
              </div>
            </template>
          </div>
          <p v-if="!crm.acciones.length" class="text-muted text-sm text-center">No hay acciones pendientes.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exec-page {
  padding: 2rem;
  max-width: 1200px;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.75rem;
  color: var(--color-navy);
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.leads-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 70vh;
  overflow-y: auto;
}

.lead-card, .accion-card {
  border: 1px solid var(--color-gray-100);
  border-radius: var(--radius-sm);
  padding: 1rem;
}

.lead-top, .accion-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}

.priority-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.lead-resumen {
  color: var(--color-gray-700);
  margin: 0.375rem 0;
}

.next-action {
  background: rgba(45, 212, 191, 0.08);
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  margin-top: 0.5rem;
}

.accion-propuesta {
  font-weight: 600;
  color: var(--color-navy);
  margin: 0.5rem 0;
}

.accion-btns {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

@media (max-width: 900px) {
  .grid-2 { grid-template-columns: 1fr; }
}
</style>
