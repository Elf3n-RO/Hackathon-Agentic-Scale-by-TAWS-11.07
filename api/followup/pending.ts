type VercelRequest = {
  method?: string
  body?: unknown
}

type VercelResponse = {
  status: (code: number) => VercelResponse
  setHeader: (name: string, value: string) => void
  json: (body: unknown) => void
  send: (body: unknown) => void
  end: () => void
}

type FollowupRow = {
  funnel_stage?: string
  suggested_action?: string
  needs_summary?: string
  profile_summary?: string
  objections?: string
}

export const config = {
  maxDuration: 30,
}

function n8nBaseUrl(): string {
  const raw =
    process.env.N8N_BASE_URL?.trim() ||
    process.env.VITE_N8N_BASE_URL?.trim() ||
    'https://primary-production-3b7c.up.railway.app'
  return raw.replace(/\/$/, '')
}

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
}

const IMPORTANT_STAGES = new Set(['DECISION', 'EVALUACION'])
const IMPORTANT_ACTIONS = new Set(['agendar_reunion', 'derivar_especialista'])
const LOW_PRIORITY_STAGES = new Set(['SIN_CLASIFICAR', 'DESCUBRIMIENTO'])

function isImportantFollowup(item: FollowupRow): boolean {
  const stage = String(item.funnel_stage ?? '').trim().toUpperCase()
  const action = String(item.suggested_action ?? '').trim().toLowerCase()
  const needs = String(item.needs_summary ?? '').trim()
  const profile = String(item.profile_summary ?? '').trim().toLowerCase()
  const objections = String(item.objections ?? '').trim().toLowerCase()

  if (stage === 'DECISION') return true
  if (IMPORTANT_ACTIONS.has(action)) return true
  if (IMPORTANT_STAGES.has(stage) && action !== 'enviar_material_educativo') return true

  const trivialObjections = ['ninguna detectada', 'ninguna', 'sin objeciones', 'no detectada']
  const hasObjections =
    objections.length > 0 && !trivialObjections.some((p) => objections.includes(p))
  if (hasObjections && !LOW_PRIORITY_STAGES.has(stage)) return true

  const profileSignals = ['b2b', 'b2c', 'presupuesto', 'capital', 'urgente', 'alta prioridad']
  if (IMPORTANT_STAGES.has(stage) && profileSignals.some((s) => profile.includes(s))) return true

  if (
    action === 'enviar_material_educativo' &&
    LOW_PRIORITY_STAGES.has(stage) &&
    !hasObjections
  ) {
    return false
  }

  if (needs.length < 24 && LOW_PRIORITY_STAGES.has(stage)) return false
  return false
}

function filterImportant<T extends FollowupRow>(items: T[]): T[] {
  return items.filter(isImportantFollowup)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    setCors(res)
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Usa GET' })
  }

  setCors(res)

  try {
    const upstream = await fetch(`${n8nBaseUrl()}/webhook/followup/pending`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    const text = await upstream.text()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')

    if (!upstream.ok) {
      return res.status(upstream.status).send(text)
    }

    if (!text.trim()) {
      return res.status(200).json([])
    }

    const parsed = JSON.parse(text) as unknown
    if (Array.isArray(parsed)) {
      return res.status(200).json(filterImportant(parsed))
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { data?: unknown }).data)) {
      const wrapped = parsed as { data: FollowupRow[] }
      return res.status(200).json({ ...wrapped, data: filterImportant(wrapped.data) })
    }

    return res.status(200).send(text)
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'error de red'
    return res.status(502).json({ error: `No se pudo contactar n8n (${detail})` })
  }
}
