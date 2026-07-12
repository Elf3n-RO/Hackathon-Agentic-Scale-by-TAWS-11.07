import type { N8nChatResponse } from '@/types'

const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL as string

const N8N_INVALID_REPLIES = [
  'workflow was started',
  'workflow started',
  'workflow got started',
  'el workflow fue iniciado',
]

function isInvalidN8nReply(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  if (N8N_INVALID_REPLIES.some((p) => normalized === p || normalized.includes(p))) return true
  // Expresión n8n sin evaluar
  if (text.includes('{{') && text.includes('}}')) return true
  return false
}

function isUsableOutput(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.length > 0 && !isInvalidN8nReply(trimmed)
}

function extractMetadata(obj: Record<string, unknown>): Partial<N8nChatResponse> {
  return {
    lead: obj.lead as N8nChatResponse['lead'],
    accion: obj.accion as string | undefined,
    fuente: obj.fuente as string | undefined,
    quiz: obj.quiz as N8nChatResponse['quiz'],
  }
}

/** Formato Agente n8n: output[].content[].text */
function extractTextFromAgentItem(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null
  const obj = item as Record<string, unknown>

  if (Array.isArray(obj.content)) {
    const texts: string[] = []
    for (const block of obj.content) {
      if (block && typeof block === 'object') {
        const b = block as Record<string, unknown>
        if (typeof b.text === 'string' && isUsableOutput(b.text)) {
          texts.push(b.text.trim())
        }
      }
    }
    if (texts.length) return texts.join('\n')
  }

  if (typeof obj.text === 'string' && isUsableOutput(obj.text)) {
    return obj.text.trim()
  }

  return null
}

function extractTextFromAgentOutput(output: unknown): string | null {
  if (typeof output === 'string') {
    return isUsableOutput(output) ? output.trim() : null
  }

  if (Array.isArray(output)) {
    for (const item of output) {
      const found = extractTextFromAgentItem(item)
      if (found) return found
    }
    return null
  }

  return extractTextFromAgentItem(output)
}

/** Busca el texto de salida del agente n8n */
function extractOutput(data: unknown, depth = 0): string | null {
  if (depth > 8 || data == null) return null

  if (typeof data === 'string') {
    return isUsableOutput(data) ? data.trim() : null
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractOutput(item, depth + 1)
      if (found) return found
    }
    return null
  }

  if (typeof data !== 'object') return null

  const obj = data as Record<string, unknown>

  // 1. output como string directo
  if (typeof obj.output === 'string' && isUsableOutput(obj.output)) {
    return obj.output.trim()
  }

  // 2. output como array/objeto del Agente (output[0].content[0].text)
  if (obj.output != null) {
    const fromAgent = extractTextFromAgentOutput(obj.output)
    if (fromAgent) return fromAgent
  }

  // 3. Estructura del agente en la raíz
  const direct = extractTextFromAgentItem(obj)
  if (direct) return direct

  // 4. Buscar en contenedores n8n
  for (const key of ['json', 'data', 'body', 'result']) {
    if (key in obj) {
      const found = extractOutput(obj[key], depth + 1)
      if (found) return found
    }
  }

  return null
}

function parseN8nResponse(data: unknown): N8nChatResponse {
  const output = extractOutput(data)

  if (!output) {
    throw new Error(
      'No se encontró el texto de salida. En Respond to Webhook usa: { "output": "={{ $json.output[0].content[0].text }}" }',
    )
  }

  const root =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {}

  const meta = extractMetadata(root)

  return { reply: output, ...meta }
}

export function isN8nConfigured(): boolean {
  return Boolean(webhookUrl?.trim())
}

export async function sendToN8n(payload: {
  message: string
  conversacionId: string
  userId: string
  historial: { rol: string; contenido: string }[]
}): Promise<N8nChatResponse> {
  if (!isN8nConfigured()) {
    throw new Error('Webhook n8n no configurado en .env.local')
  }

  let res: Response
  try {
    res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('No se pudo conectar con n8n. Verifica CORS y que el workflow esté activo.')
  }

  const raw = await res.text()

  if (!res.ok) {
    throw new Error(`n8n error ${res.status}: ${raw.slice(0, 200)}`)
  }

  if (!raw.trim()) {
    throw new Error('n8n respondió vacío')
  }

  try {
    return parseN8nResponse(JSON.parse(raw))
  } catch (parseError) {
    if (parseError instanceof Error) throw parseError
    throw new Error('n8n respondió en un formato no reconocido')
  }
}
