import type { FollowupPending } from '@/services/followup'

const IMPORTANT_STAGES = new Set(['DECISION', 'EVALUACION'])
const IMPORTANT_ACTIONS = new Set(['agendar_reunion', 'derivar_especialista'])
const LOW_PRIORITY_STAGES = new Set(['SIN_CLASIFICAR', 'DESCUBRIMIENTO'])

const TRIVIAL_OBJECTIONS = [
  'ninguna detectada',
  'ninguna',
  'sin objeciones',
  'no detectada',
  'n/a',
  '—',
  '-',
  'none',
]

function norm(value: unknown): string {
  return String(value ?? '').trim()
}

function upper(value: unknown): string {
  return norm(value).toUpperCase()
}

function lower(value: unknown): string {
  return norm(value).toLowerCase()
}

function hasRealObjections(objections: string): boolean {
  const text = lower(objections)
  if (!text) return false
  return !TRIVIAL_OBJECTIONS.some((phrase) => text === phrase || text.includes(phrase))
}

function hasCommercialProfile(profile: string): boolean {
  const text = lower(profile)
  if (text.length < 12) return false
  const signals = [
    'b2b',
    'b2c',
    'presupuesto',
    'capital',
    'empresa',
    'urgente',
    'alta prioridad',
    'prioridad alta',
    'listo para',
    'reunión',
    'reunion',
  ]
  return signals.some((s) => text.includes(s))
}

/** Solo propuestas que requieren revisión del administrador en hitos comerciales. */
export function isImportantFollowup(item: FollowupPending): boolean {
  const stage = upper(item.funnel_stage)
  const action = lower(item.suggested_action)
  const needs = norm(item.needs_summary)
  const profile = norm(item.profile_summary)
  const objections = norm(item.objections)

  if (stage === 'DECISION') return true

  if (IMPORTANT_ACTIONS.has(action)) return true

  if (IMPORTANT_STAGES.has(stage) && action !== 'enviar_material_educativo') return true

  if (hasRealObjections(objections) && !LOW_PRIORITY_STAGES.has(stage)) return true

  if (hasCommercialProfile(profile) && IMPORTANT_STAGES.has(stage)) return true

  if (
    action === 'enviar_material_educativo' &&
    LOW_PRIORITY_STAGES.has(stage) &&
    !hasRealObjections(objections)
  ) {
    return false
  }

  if (needs.length < 24 && LOW_PRIORITY_STAGES.has(stage)) return false

  return false
}

export function filterImportantFollowups(items: FollowupPending[]): FollowupPending[] {
  return items.filter(isImportantFollowup)
}
