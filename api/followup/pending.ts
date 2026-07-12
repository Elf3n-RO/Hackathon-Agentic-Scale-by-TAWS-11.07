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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Usa GET' })
  }

  await proxyToN8n(res, `${n8nBaseUrl()}/webhook/followup/pending`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
}
