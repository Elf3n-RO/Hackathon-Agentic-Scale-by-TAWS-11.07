import {
  handleOptions,
  n8nBaseUrl,
  proxyToN8n,
  type VercelRequest,
  type VercelResponse,
} from '../_utils'

export const config = {
  maxDuration: 30,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Usa POST' })
  }

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})

  await proxyToN8n(res, `${n8nBaseUrl()}/webhook/followup/review`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body,
  })
}
