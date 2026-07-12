export type FunnelStage = 'DESCUBRIMIENTO' | 'EVALUACION' | 'DECISION' | 'SIN_CLASIFICAR'
export type SuggestedAction = 'agendar_reunion' | 'enviar_material_educativo' | 'derivar_especialista'
export type FollowupReviewStatus = 'approved' | 'edited' | 'rejected'

export interface FollowupPending {
  id: string
  session_id: string
  needs_summary: string
  profile_summary: string
  objections: string
  funnel_stage: FunnelStage | string
  suggested_action: SuggestedAction | string
  action_details: string
  created_at: string
}

export interface FollowupReviewRequest {
  followup_id: string
  status: FollowupReviewStatus
  reviewed_by: string
  edited_action?: string | null
}

export interface FollowupReviewResponse {
  ok: boolean
  errors?: string[]
  error?: string
  followup?: {
    id: string
    approval_status: string
    final_action: string
  }
}

function pendingUrl() {
  return '/api/followup/pending'
}

function reviewUrl() {
  return '/api/followup/review'
}

export async function fetchPendingFollowups(): Promise<FollowupPending[]> {
  const res = await fetch(pendingUrl(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  const raw = await res.text()
  if (!res.ok) {
    throw new Error(`Error al listar followups (${res.status}): ${raw.slice(0, 160)}`)
  }

  if (!raw.trim()) return []

  const data = JSON.parse(raw) as unknown
  if (Array.isArray(data)) return data as FollowupPending[]
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: FollowupPending[] }).data
  }
  return []
}

export async function reviewFollowup(
  payload: FollowupReviewRequest,
): Promise<FollowupReviewResponse> {
  const res = await fetch(reviewUrl(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const raw = await res.text()
  let parsed: FollowupReviewResponse
  try {
    parsed = JSON.parse(raw) as FollowupReviewResponse
  } catch {
    throw new Error(`Respuesta inválida del review (${res.status}): ${raw.slice(0, 160)}`)
  }

  if (!res.ok && parsed.ok !== false) {
    throw new Error(`Error HTTP ${res.status} al revisar followup`)
  }

  return parsed
}

export function actionLabel(action: string): string {
  const map: Record<string, string> = {
    agendar_reunion: 'Agendar reunión',
    enviar_material_educativo: 'Enviar material educativo',
    derivar_especialista: 'Derivar a especialista',
  }
  return map[action] ?? action
}

export function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    DESCUBRIMIENTO: 'Descubrimiento',
    EVALUACION: 'Evaluación',
    DECISION: 'Decisión',
    SIN_CLASIFICAR: 'Sin clasificar',
  }
  return map[stage] ?? stage
}
