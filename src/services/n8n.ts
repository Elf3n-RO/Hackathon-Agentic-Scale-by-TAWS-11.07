import type { N8nChatResponse } from '@/types'
import { getSessionId } from '@/services/chatSession'

const configuredUrl = (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined)?.trim() || ''
const webhookUrl = import.meta.env.DEV ? '/api/n8n-chat' : configuredUrl

export function toPlainText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  if (Array.isArray(value)) {
    return value
      .map((item) => toPlainText(item))
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of ['text', 'content', 'output', 'reply', 'message', 'value']) {
      if (key in obj) {
        const extracted = toPlainText(obj[key])
        if (extracted) return extracted
      }
    }
    if (Array.isArray(obj.content)) return toPlainText(obj.content)
  }

  return ''
}

function looksLikeHtmlError(text: string): boolean {
  const t = text.trim().toLowerCase()
  if (!t) return false
  if (t.startsWith('<!doctype html') || t.startsWith('<html')) return true
  if (t.includes('<pre>internal server error</pre>')) return true
  if (t.includes('internal server error') && t.includes('<')) return true
  return false
}

function isUsableOutput(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (looksLikeHtmlError(trimmed)) return false
  const lower = trimmed.toLowerCase()
  if (lower === 'undefined' || lower === 'null') return false
  if (lower.includes('workflow was started')) return false
  if (lower.includes('workflow execution failed')) return false
  // Expresión n8n sin evaluar
  if (/^\{\{\s*.+\s*\}\}$/.test(trimmed)) return false
  return true
}

/** Desanida JSON doblemente stringificado: "\"{...}\"" o "{...}" */
function unwrapJson(data: unknown, depth = 0): unknown {
  if (depth > 5 || data == null) return data

  if (typeof data === 'string') {
    const t = data.trim()
    if (!t) return data
    if (
      (t.startsWith('{') && t.endsWith('}')) ||
      (t.startsWith('[') && t.endsWith(']')) ||
      (t.startsWith('"') && t.endsWith('"'))
    ) {
      try {
        return unwrapJson(JSON.parse(t), depth + 1)
      } catch {
        return data
      }
    }
    return data
  }

  return data
}

function getProp(obj: Record<string, unknown>, name: string): unknown {
  if (name in obj) return obj[name]
  const found = Object.keys(obj).find((k) => k.toLowerCase() === name.toLowerCase())
  return found ? obj[found] : undefined
}

function extractAgentText(item: unknown): string | null {
  if (item == null) return null
  if (typeof item === 'string') return isUsableOutput(item) ? item.trim() : null

  if (Array.isArray(item)) {
    for (const el of item) {
      const t = extractAgentText(el)
      if (t) return t
    }
    return null
  }

  if (typeof item !== 'object') return null
  const obj = item as Record<string, unknown>

  // OpenAI / LangChain agent: output[0].content[0].text
  const content = getProp(obj, 'content')
  if (Array.isArray(content)) {
    const parts: string[] = []
    for (const block of content) {
      if (typeof block === 'string' && isUsableOutput(block)) {
        parts.push(block.trim())
        continue
      }
      if (block && typeof block === 'object') {
        const b = block as Record<string, unknown>
        const text = getProp(b, 'text')
        if (typeof text === 'string' && isUsableOutput(text)) parts.push(text.trim())
      }
    }
    if (parts.length) return parts.join('\n')
  }

  if (typeof content === 'string' && isUsableOutput(content)) return content.trim()

  const text = getProp(obj, 'text')
  if (typeof text === 'string' && isUsableOutput(text)) return text.trim()

  return null
}

function extractFromOutput(output: unknown): string | null {
  if (output == null) return null
  if (typeof output === 'string') {
    const unwrapped = unwrapJson(output)
    if (unwrapped !== output && typeof unwrapped === 'object') {
      return extractReply(unwrapped, 0)
    }
    return isUsableOutput(output) ? output.trim() : null
  }
  if (typeof output === 'number' || typeof output === 'boolean') {
    return String(output)
  }
  return extractAgentText(output)
}

/**
 * Prioridad: output → reply → text → response → answer → content → choices
 * Evita usar message.content del request echo salvo como último recurso.
 */
function extractReply(data: unknown, depth = 0): string | null {
  if (depth > 12 || data == null) return null

  data = unwrapJson(data)

  if (typeof data === 'string') {
    return isUsableOutput(data) ? data.trim() : null
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractReply(item, depth + 1)
      if (found) return found
    }
    return null
  }

  if (typeof data !== 'object') return null
  const obj = data as Record<string, unknown>

  // 1) Campo output (contrato principal con n8n)
  if ('output' in obj || Object.keys(obj).some((k) => k.toLowerCase() === 'output')) {
    const fromOutput = extractFromOutput(getProp(obj, 'output'))
    if (fromOutput) return fromOutput
  }

  // 2) Otras claves de respuesta del asistente
  for (const key of ['reply', 'text', 'response', 'answer', 'chatOutput', 'completion', 'generated_text']) {
    const val = getProp(obj, key)
    if (val === undefined) continue
    const found = extractFromOutput(val) || extractReply(val, depth + 1)
    if (found) return found
  }

  // 3) Formato OpenAI chat completions
  const choices = getProp(obj, 'choices')
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const msg = (choices[0] as Record<string, unknown>).message
    if (msg && typeof msg === 'object') {
      const c = (msg as Record<string, unknown>).content
      if (typeof c === 'string' && isUsableOutput(c)) return c.trim()
    }
  }

  // 4) Contenedores anidados
  for (const key of ['data', 'body', 'json', 'result', 'payload']) {
    const val = getProp(obj, key)
    if (val === undefined) continue
    const found = extractReply(val, depth + 1)
    if (found) return found
  }

  // 5) Estructura agente directa
  const agent = extractAgentText(obj)
  if (agent) return agent

  // 6) message solo si parece respuesta (string o content usable), no objetos session
  const message = getProp(obj, 'message')
  if (typeof message === 'string' && isUsableOutput(message)) return message.trim()
  if (message && typeof message === 'object') {
    const content = getProp(message as Record<string, unknown>, 'content')
    if (typeof content === 'string' && isUsableOutput(content)) return content.trim()
  }

  return null
}

function parseN8nResponse(data: unknown, rawFallback: string): N8nChatResponse {
  const output = extractReply(data)
  if (output) {
    const root =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (unwrapJson(data) as Record<string, unknown>)
        : null
    const meta = root
      ? {
          lead: root.lead as N8nChatResponse['lead'],
          accion: root.accion as string | undefined,
          fuente: root.fuente as string | undefined,
          quiz: root.quiz as N8nChatResponse['quiz'],
        }
      : {}
    return { reply: output, ...meta }
  }

  if (isUsableOutput(rawFallback) && !rawFallback.trim().startsWith('{') && !rawFallback.trim().startsWith('[')) {
    return { reply: rawFallback.trim() }
  }

  const preview = rawFallback.replace(/\s+/g, ' ').trim().slice(0, 160)
  throw new Error(
    preview
      ? `No se pudo leer "output" de n8n. Respuesta: ${preview}`
      : 'n8n respondió vacío o sin campo "output".',
  )
}

function httpErrorMessage(status: number, raw: string): string {
  if (status === 500 || looksLikeHtmlError(raw)) {
    return 'El agente n8n falló (Error 500). Revisa Executions en n8n.'
  }
  if (status === 404) {
    return 'Webhook n8n no encontrado (404). Verifica la URL y que el workflow esté activo.'
  }
  if (status === 502 || status === 503 || status === 504) {
    return `n8n no responde (HTTP ${status}). Railway puede estar caído.`
  }
  const snippet = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
  return `Error HTTP ${status} del webhook${snippet ? `: ${snippet}` : ''}`
}

export function isN8nConfigured(): boolean {
  return Boolean(configuredUrl || import.meta.env.DEV)
}

export async function sendToN8n(payload: {
  message: unknown
  sessionId?: string
}): Promise<N8nChatResponse> {
  if (!isN8nConfigured()) {
    throw new Error('Falta VITE_N8N_WEBHOOK_URL en .env.local')
  }

  const plainContent = toPlainText(payload.message)
  if (!plainContent) {
    throw new Error('El mensaje del usuario está vacío o no es texto válido')
  }

  const body = {
    session: { id: payload.sessionId || getSessionId() },
    message: { content: plainContent },
  }

  let res: Response
  try {
    res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'error de red'
    throw new Error(`No se pudo llamar al webhook (${detail}). Puede ser CORS o red.`)
  }

  const raw = await res.text()

  if (!res.ok) {
    throw new Error(httpErrorMessage(res.status, raw))
  }

  if (looksLikeHtmlError(raw)) {
    throw new Error(httpErrorMessage(500, raw))
  }

  if (!raw.trim()) {
    throw new Error(
      'n8n devolvió HTTP 200 vacío. En el Webhook usa "Respond to Webhook" (no Immediately) con body: { "output": "..." }.',
    )
  }

  let parsed: unknown = null
  try {
    parsed = unwrapJson(JSON.parse(raw))
  } catch {
    parsed = null
  }

  return parseN8nResponse(parsed ?? raw, raw)
}
