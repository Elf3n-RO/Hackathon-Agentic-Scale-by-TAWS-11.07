# Desplegar en Vercel

## 1. Sube el repo a GitHub
Asegúrate de que el código esté en un repositorio Git.

## 2. Importa en Vercel
1. Entra a [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Importa el repo
3. Framework: **Vite** (auto)
4. Build Command: `npm run build`
5. Output Directory: `dist`

## 3. Variables de entorno (Settings → Environment Variables)

| Variable | Valor | Entorno |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | `https://gcorxawzjhmxtmadnhbh.supabase.co` | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | tu anon key | Production, Preview |
| `VITE_USE_MOCK` | `false` | Production, Preview |
| `N8N_WEBHOOK_URL` | `https://primary-production-3b7c.up.railway.app/webhook/chat` | Production, Preview |
| `N8N_BASE_URL` | `https://primary-production-3b7c.up.railway.app` | Production, Preview |

Opcional (fallback): `VITE_N8N_WEBHOOK_URL` y `VITE_N8N_BASE_URL` con los mismos valores.

## 4. Supabase Auth — URLs permitidas
En Supabase → **Authentication** → **URL Configuration**:

- **Site URL**: `https://TU-PROYECTO.vercel.app`
- **Redirect URLs**: agrega
  - `https://TU-PROYECTO.vercel.app/**`
  - `http://localhost:5173/**` (dev)

## 5. Deploy
Pulsa **Deploy**. La app quedará en `https://TU-PROYECTO.vercel.app`.

## Cómo funciona n8n en Vercel
El navegador llama a `/api/n8n-chat` y `/api/followup/*` en el mismo dominio.
Esas funciones serverless reenvían a Railway (sin CORS).

## CLI (opcional)
```bash
npx vercel
npx vercel --prod
```
