<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="landing">
    <header class="landing-header">
      <div class="logo">
        <span>📈</span>
        <strong>SyntaxError Track1</strong>
      </div>
      <div class="header-actions">
        <RouterLink to="/login" class="btn btn-secondary">Iniciar sesión</RouterLink>
        <RouterLink to="/registro" class="btn btn-primary">Crear cuenta</RouterLink>
      </div>
    </header>

    <section class="hero">
      <div class="hero-content">
        <span class="hero-badge">Hackathon Agentes Financieros IA</span>
        <h1>Inteligencia conversacional para ventas y gestión de clientes</h1>
        <p>
          Califica leads B2B/B2C, ofrece educación financiera con Futuro Academy
          y deriva oportunidades comerciales de alto valor — todo desde una sola plataforma.
        </p>
        <div class="hero-actions">
          <RouterLink to="/registro" class="btn btn-primary btn-lg">Comenzar gratis</RouterLink>
          <RouterLink to="/login" class="btn btn-navy btn-lg">Ya tengo cuenta</RouterLink>
        </div>
      </div>

      <div class="hero-cards">
        <div class="feature-card">
          <span class="feature-icon">🤖</span>
          <h3>Asesor Comercial IA</h3>
          <p>Califica prospectos, calcula prioridad y registra todo en el CRM.</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">🎓</span>
          <h3>Tutor Financiero</h3>
          <p>Explicaciones guiadas, quiz diagnóstico y rutas de aprendizaje.</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">📋</span>
          <h3>Panel Ejecutivo</h3>
          <p>Resume leads, propone acciones y permite aprobar antes de contactar.</p>
        </div>
      </div>
    </section>

    <footer class="landing-footer">
      <p>SyntaxError Track1 — Track 1 CRM Conversacional · Julio 2026</p>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  min-height: 100vh;
  background: linear-gradient(160deg, var(--color-navy-dark) 0%, var(--color-navy) 50%, #0e3d5c 100%);
  color: var(--color-white);
}

.landing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.hero {
  max-width: 1100px;
  margin: 0 auto;
  padding: 4rem 2rem;
}

.hero-badge {
  display: inline-block;
  background: rgba(45, 212, 191, 0.15);
  color: var(--color-teal);
  padding: 0.375rem 0.875rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
}

.hero-content h1 {
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.2;
  margin-bottom: 1rem;
  max-width: 700px;
}

.hero-content p {
  font-size: 1.125rem;
  color: rgba(255,255,255,0.75);
  max-width: 600px;
  margin-bottom: 2rem;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-lg {
  padding: 0.875rem 1.75rem;
  font-size: 1rem;
}

.hero-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
  margin-top: 4rem;
}

.feature-card {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius);
  padding: 1.5rem;
  backdrop-filter: blur(8px);
}

.feature-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.75rem;
}

.feature-card h3 {
  font-size: 1.125rem;
  margin-bottom: 0.5rem;
}

.feature-card p {
  color: rgba(255,255,255,0.65);
  font-size: 0.9375rem;
}

.landing-footer {
  text-align: center;
  padding: 2rem;
  color: rgba(255,255,255,0.4);
  font-size: 0.875rem;
  border-top: 1px solid rgba(255,255,255,0.06);
}
</style>
