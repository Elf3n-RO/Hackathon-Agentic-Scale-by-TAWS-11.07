/** URL canónica de producción (confirmación de email / redirects) */
export const PRODUCTION_APP_URL =
  'https://hackathon-agentic-scale-by-taws-11-07-syntax-error3.vercel.app'

/** Origen actual de la app (localhost en dev, Vercel en prod) */
export function getAppOrigin(): string {
  if (typeof window === 'undefined') return PRODUCTION_APP_URL
  const { origin, hostname } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') return origin
  return origin
}

/** Destino tras confirmar el correo en Supabase */
export function getEmailRedirectTo(): string {
  return `${getAppOrigin()}/auth/callback`
}

/** URLs que deben estar en Supabase → Authentication → Redirect URLs */
export const SUPABASE_REDIRECT_ALLOWLIST = [
  `${PRODUCTION_APP_URL}/**`,
  `${PRODUCTION_APP_URL}/auth/callback`,
  `${PRODUCTION_APP_URL}/login`,
  'https://hackathon-agentic-scale-by-taws-11.vercel.app/**',
  'https://hackathon-agentic-scale-by-taws-11.vercel.app/auth/callback',
  'http://localhost:5173/**',
  'http://localhost:5173/auth/callback',
  'http://localhost:5173/login',
]
