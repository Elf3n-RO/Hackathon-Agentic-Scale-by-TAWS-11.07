import type { N8nChatResponse } from '@/types'

const configuredUrl = (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined)?.trim() || ''
// En desarrollo usamos proxy local para evitar CORS del navegador
const webhookUrl = import.meta.env.DEV ? '/api/n8n-chat' : configuredUrl

/**
 * Extrae texto plano de cualquier forma de mensaje.
 * Nunca devuelve objeto ni array.
 */
export function toPlainText(value: unknown): string {
  if (value == null) return ''

  if (typeof value === 'string') return value.trim()

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => toPlainText(item))
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>

    // Casos comunes: { content: "..." }, { text: "..." }, { message: "..." }
    for (const key of ['content', 'text', 'message', 'output', 'reply', 'value']) {
      if (key in obj) {
        const extracted = toPlainText(obj[key])
        if (extracted) return extracted
      }
    }

    // Formato tipo: [{ type: "text", text: "..." }]
    if (Array.isArray(obj.content)) {
      return toPlainText(obj.content)
    }
  }

  return ''
}

function isUsableOutput(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  const lower = trimmed.toLowerCase()
  if (lower === 'undefined' || lower === 'null') return false
  if (lower.includes('workflow was started')) return false
  if (/^\{\{\s*.+\s*\}\}$/.test(trimmed)) return false
  return true
}

function extractTextFromAgentItem(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null
  const obj = item as Record<string, unknown>

  if (Array.isArray(obj.content)) {
    const texts: string[] = []
    for (const block of obj.content) {
      if (block && typeof block === 'object') {
        const b = block as Record<string, unknown>
        if (typeof b.text === 'string' && isUsableOutput(b.text)) texts.push(b.text.trim())
      }
    }
    if (texts.length) return texts.join('\n')
  }

  if (typeof obj.text === 'string' && isUsableOutput(obj.text)) return obj.text.trim()
  return null
}

function extractFromOutputField(output: unknown): string | null {
  if (typeof output === 'string') return isUsableOutput(output) ? output.trim() : null
  if (Array.isArray(output)) {
    for (const item of output) {
      const found = extractTextFromAgentItem(item) || extractOutput(item, 1)
      if (found) return found
    }
  }
  return extractTextFromAgentItem(output)
}

function extractOutput(data: unknown, depth = 0): string | null {
  if (depth > 10 || data == null) return null
  if (typeof data === 'string') return isUsableOutput(data) ? data.trim() : null

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractOutput(item, depth + 1)
      if (found) return found
    }
    return null
  }

  if (typeof data !== 'object') return null
  const obj = data as Record<string, unknown>

  if ('output' in obj) {
    const fromOutput = extractFromOutputField(obj.output)
    if (fromOutput) return fromOutput
  }

  const direct = extractTextFromAgentItem(obj)
  if (direct) return direct

  for (const key of ['reply', 'text', 'message', 'response', 'answer', 'content', 'result', 'data', 'body', 'json']) {
    if (key in obj) {
      const found = extractOutput(obj[key], depth + 1)
      if (found) return found
    }
  }

  return null
}

function parseN8nResponse(data: unknown, rawFallback: string): N8nChatResponse {
  const output = extractOutput(data)
  if (output) {
    const meta =
      data && typeof data === 'object' && !Array.isArray(data)
        ? {
            lead: (data as Record<string, unknown>).lead as N8nChatResponse['lead'],
            accion: (data as Record<string, unknown>).accion as string | undefined,
            fuente: (data as Record<string, unknown>).fuente as string | undefined,
            quiz: (data as Record<string, unknown>).quiz as N8nChatResponse['quiz'],
          }
        : {}
    return { reply: output, ...meta }
  }

  if (isUsableOutput(rawFallback)) {
    return { reply: rawFallback.trim() }
  }

  throw new Error('No se pudo leer la respuesta de n8n. Revisa la pestaña Network → webhook/chat → Response.')
}

export function isN8nConfigured(): boolean {
  return Boolean(configuredUrl || import.meta.env.DEV)
}

export async function sendToN8n(payload: {
  message: unknown
  conversacionId?: string
  userId?: string
  historial?: { rol?: string; role?: string; contenido?: unknown; content?: unknown }[]
}): Promise<N8nChatResponse> {
  if (!isN8nConfigured()) {
    throw new Error('Falta VITE_N8N_WEBHOOK_URL en .env.local')
  }

  const plainContent = toPlainText(payload.message)
  if (!plainContent) {
    throw new Error('El mensaje del usuario está vacío o no es texto válido')
  }

  // message.content siempre string plano
  const message = {
    content: plainContent,
  }

  let res: Response
  try {
    res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'error de red'
    throw new Error(`No se pudo llamar al webhook (${detail}). Puede ser CORS o red.`)
  }

  const raw = await res.text()
  let parsed: unknown = null
  if (raw.trim()) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = null
    }
  }

  try {
    if (parsed != null || raw.trim()) {
      return parseN8nResponse(parsed ?? raw, raw)
    }
  } catch {
    /* seguir con error HTTP */
  }

  if (!res.ok) {
    const snippet = raw.slice(0, 180) || res.statusText
    throw new Error(`Error HTTP ${res.status} del webhook: ${snippet}`)
  }

  throw new Error('El webhook respondió vacío')
}
