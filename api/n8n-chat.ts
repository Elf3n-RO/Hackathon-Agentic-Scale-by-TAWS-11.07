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

export const config = {
  maxDuration: 60,
}

function n8nWebhookUrl(): string {
  return (
    process.env.N8N_WEBHOOK_URL?.trim() ||
    process.env.VITE_N8N_WEBHOOK_URL?.trim() ||
    'https://primary-production-3b7c.up.railway.app/webhook/chat'
  )
}

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    setCors(res)
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Usa POST' })
  }

  setCors(res)

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})

  try {
    const upstream = await fetch(n8nWebhookUrl(), {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
      },
      body,
    })

    const text = await upstream.text()
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8'
    res.setHeader('Content-Type', contentType)
    return res.status(upstream.status).send(text)
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'error de red'
    return res.status(502).json({ error: `No se pudo contactar n8n (${detail})` })
  }
}
