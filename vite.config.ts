import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const n8nChat = env.VITE_N8N_WEBHOOK_URL || 'https://primary-production-3b7c.up.railway.app/webhook/chat'
  const n8nBase = env.VITE_N8N_BASE_URL || 'https://primary-production-3b7c.up.railway.app'

  let chatTarget = 'https://primary-production-3b7c.up.railway.app'
  let chatPath = '/webhook/chat'
  try {
    const u = new URL(n8nChat)
    chatTarget = u.origin
    chatPath = u.pathname
  } catch {
    /* defaults */
  }

  let followupTarget = n8nBase
  try {
    followupTarget = new URL(n8nBase).origin
  } catch {
    /* defaults */
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
        '/api/n8n-chat': {
          target: chatTarget,
          changeOrigin: true,
          secure: true,
          rewrite: () => chatPath,
        },
        '/api/followup/pending': {
          target: followupTarget,
          changeOrigin: true,
          secure: true,
          rewrite: () => '/webhook/followup/pending',
        },
        '/api/followup/review': {
          target: followupTarget,
          changeOrigin: true,
          secure: true,
          rewrite: () => '/webhook/followup/review',
        },
      },
    },
  }
})
