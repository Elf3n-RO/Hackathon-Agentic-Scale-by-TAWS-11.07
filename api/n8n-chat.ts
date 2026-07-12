import {
  handleOptions,
  n8nWebhookUrl,
  proxyToN8n,
  type VercelRequest,
  type VercelResponse,
} from './_utils'

export const config = {
  maxDuration: 60,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Usa POST' })
  }

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})

  await proxyToN8n(res, n8nWebhookUrl(), {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
    },
    body,
  })
}
