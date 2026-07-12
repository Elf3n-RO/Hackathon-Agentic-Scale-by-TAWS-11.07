<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChatStore } from '@/stores/chat'

const props = defineProps<{
  fuente: string | null
  quiz: { pregunta: string; opciones: string[] }[] | null
}>()

const chat = useChatStore()
const respuestas = ref<number[]>([])
const quizCompletado = ref(false)
const puntaje = ref(0)

const preguntasConRespuesta = [
  { pregunta: '¿Qué es diversificar una cartera?', opciones: ['Comprar un solo activo', 'Distribuir inversiones en distintos activos', 'Guardar solo en efectivo'], correcta: 1 },
  { pregunta: '¿Qué mide el rendimiento histórico?', opciones: ['Garantía futura', 'Desempeño pasado del activo', 'Comisión bancaria'], correcta: 1 },
  { pregunta: '¿Cuál es un objetivo de ahorro?', opciones: ['Apostar en corto plazo', 'Construir patrimonio a mediano/largo plazo', 'Evitar todo riesgo sin excepción'], correcta: 1 },
]

const preguntasActivas = computed(() => {
  if (props.quiz?.length) {
    return props.quiz.map((q, i) => ({ ...q, correcta: preguntasConRespuesta[i]?.correcta ?? 1 }))
  }
  return preguntasConRespuesta
})

function seleccionarRespuesta(preguntaIdx: number, opcionIdx: number) {
  respuestas.value[preguntaIdx] = opcionIdx
}

async function enviarQuiz() {
  let score = 0
  preguntasActivas.value.forEach((p, i) => {
    if (respuestas.value[i] === p.correcta) score++
  })
  puntaje.value = score
  quizCompletado.value = true

  await chat.enviarMensaje(
    `Completé el quiz con ${score}/${preguntasActivas.value.length} correctas. Consentimiento: registro mi interés en aprendizaje financiero.`,
  )
}

const emit = defineEmits<{ 'iniciar-quiz': [] }>()

async function iniciarQuiz() {
  emit('iniciar-quiz')
  await chat.enviarMensaje('Quiero iniciar el quiz de evaluación diagnóstica.')
}
</script>

<template>
  <div class="quiz-panel">
    <div class="panel-header">
      <h3>🎓 Futuro Academy</h3>
    </div>

    <div class="panel-body">
      <div v-if="fuente" class="fuente-box">
        <span class="text-sm">📚 Fuente actual:</span>
        <p>{{ fuente }}</p>
      </div>

      <div class="ruta-box">
        <h4>Ruta de aprendizaje</h4>
        <ol>
          <li>Introducción a inversiones</li>
          <li>Tipos de instrumentos financieros</li>
          <li>Gestión de riesgo y diversificación</li>
        </ol>
      </div>

      <div v-if="!quiz && !quizCompletado" class="quiz-start">
        <p class="text-sm text-muted">Realiza un quiz de 3 preguntas para evaluar tu conocimiento.</p>
        <button class="btn btn-primary btn-sm w-full mt-1" @click="iniciarQuiz">
          Iniciar quiz
        </button>
      </div>

      <div v-if="(quiz || quizCompletado) && !quizCompletado" class="quiz-questions">
        <h4>Quiz diagnóstico</h4>
        <div v-for="(p, pi) in preguntasActivas" :key="pi" class="question">
          <p class="question-text">{{ pi + 1 }}. {{ p.pregunta }}</p>
          <div class="options">
            <button
              v-for="(opt, oi) in p.opciones"
              :key="oi"
              class="option-btn"
              :class="{ selected: respuestas[pi] === oi }"
              @click="seleccionarRespuesta(pi, oi)"
            >
              {{ opt }}
            </button>
          </div>
        </div>
        <button
          class="btn btn-primary btn-sm w-full mt-1"
          :disabled="respuestas.length < preguntasActivas.length"
          @click="enviarQuiz"
        >
          Enviar respuestas
        </button>
      </div>

      <div v-if="quizCompletado" class="quiz-result">
        <span class="result-icon">✅</span>
        <h4>Resultado: {{ puntaje }}/{{ preguntasActivas.length }}</h4>
        <p class="text-sm text-muted">
          Tu interés ha sido registrado en el CRM con consentimiento.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-panel { height: 100%; }

.panel-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-gray-200);
}

.panel-header h3 {
  font-size: 0.9375rem;
  color: var(--color-navy);
}

.panel-body { padding: 1.25rem; }

.fuente-box {
  background: rgba(56, 189, 248, 0.1);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.fuente-box p {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-navy);
  margin-top: 0.25rem;
}

.ruta-box {
  margin-bottom: 1.25rem;
}

.ruta-box h4, .quiz-questions h4 {
  font-size: 0.875rem;
  color: var(--color-navy);
  margin-bottom: 0.5rem;
}

.ruta-box ol {
  padding-left: 1.25rem;
  font-size: 0.875rem;
  color: var(--color-gray-700);
}

.ruta-box li { margin-bottom: 0.25rem; }

.question { margin-bottom: 1rem; }

.question-text {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.option-btn {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  background: var(--color-white);
  font-size: 0.8125rem;
  transition: all 0.15s;
}

.option-btn:hover { border-color: var(--color-teal); }
.option-btn.selected {
  border-color: var(--color-teal);
  background: rgba(45, 212, 191, 0.1);
  font-weight: 600;
}

.quiz-result {
  text-align: center;
  padding: 1rem;
  background: rgba(34, 197, 94, 0.08);
  border-radius: var(--radius-sm);
}

.result-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
</style>
