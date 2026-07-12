import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const n8nTarget = env.VITE_N8N_WEBHOOK_URL || 'https://primary-production-3b7c.up.railway.app/webhook/chat'

  let proxyTarget = 'https://primary-production-3b7c.up.railway.app'
  let proxyPath = '/webhook/chat'
  try {
    const u = new URL(n8nTarget)
    proxyTarget = u.origin
    proxyPath = u.pathname
  } catch {
    /* keep defaults */
  }

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        // Evita CORS: la página llama /api/n8n-chat y Vite reenvía al webhook
        '/api/n8n-chat': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
          rewrite: () => proxyPath,
        },
      },
    },
  }
})
