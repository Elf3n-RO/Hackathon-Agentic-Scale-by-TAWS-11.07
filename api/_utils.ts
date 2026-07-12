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

export type { VercelRequest, VercelResponse }

export function n8nWebhookUrl(): string {
  return (
    process.env.N8N_WEBHOOK_URL?.trim() ||
    process.env.VITE_N8N_WEBHOOK_URL?.trim() ||
    'https://primary-production-3b7c.up.railway.app/webhook/chat'
  )
}

export function n8nBaseUrl(): string {
  const raw =
    process.env.N8N_BASE_URL?.trim() ||
    process.env.VITE_N8N_BASE_URL?.trim() ||
    'https://primary-production-3b7c.up.railway.app'
  return raw.replace(/\/$/, '')
}

export function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
}

export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    setCors(res)
    res.status(204).end()
    return true
  }
  return false
}

export async function proxyToN8n(
  res: VercelResponse,
  targetUrl: string,
  init: RequestInit,
): Promise<void> {
  setCors(res)

  try {
    const upstream = await fetch(targetUrl, init)
    const text = await upstream.text()
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8'
    res.setHeader('Content-Type', contentType)
    res.status(upstream.status).send(text)
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'error de red'
    res.status(502).json({ error: `No se pudo contactar n8n (${detail})` })
  }
}
