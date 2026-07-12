<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const navItems = computed(() => {
  const items = [
    { to: '/app', label: 'Dashboard', icon: '📊' },
    { to: '/app/chat', label: 'Chat IA', icon: '💬' },
    { to: '/app/perfil', label: 'Perfil', icon: '👤' },
  ]
  if (auth.isEjecutivo || auth.isAdmin) {
    items.push({ to: '/app/ejecutivo', label: 'Panel CRM', icon: '📋' })
  }
  if (auth.isAdmin) {
    items.push({ to: '/app/admin', label: 'Admin', icon: '⚙️' })
  }
  return items
})

async function logout() {
  await auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-icon">📈</span>
        <div>
          <strong>SyntaxError</strong>
          <small>Track1</small>
        </div>
      </div>

      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ active: route.path === item.to || (item.to !== '/app' && route.path.startsWith(item.to)) }"
        >
          <span>{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">{{ auth.userName.charAt(0).toUpperCase() }}</div>
          <div>
            <div class="user-name">{{ auth.userName }}</div>
            <span class="badge badge-teal">{{ auth.profile?.role }}</span>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm w-full mt-1" @click="logout">
          Cerrar sesión
        </button>
      </div>
    </aside>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  background: var(--color-navy);
  color: var(--color-white);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 1.25rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.brand-icon { font-size: 1.75rem; }

.sidebar-brand strong {
  display: block;
  font-size: 1rem;
}

.sidebar-brand small {
  color: var(--color-teal);
  font-size: 0.75rem;
  font-weight: 600;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius-sm);
  color: rgba(255,255,255,0.7);
  font-size: 0.9375rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.nav-link:hover {
  background: rgba(255,255,255,0.08);
  color: var(--color-white);
  text-decoration: none;
}

.nav-link.active {
  background: rgba(45, 212, 191, 0.15);
  color: var(--color-teal);
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid rgba(255,255,255,0.08);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-teal);
  color: var(--color-navy-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.main-content {
  flex: 1;
  overflow: auto;
  background: var(--color-gray-50);
}

@media (max-width: 768px) {
  .sidebar { width: 64px; }
  .sidebar-brand div,
  .nav-link span + *,
  .sidebar-footer .user-info div,
  .sidebar-footer .btn { display: none; }
  .nav-link { justify-content: center; padding: 0.75rem; }
  .nav-link span { font-size: 1.25rem; }
}
</style>
