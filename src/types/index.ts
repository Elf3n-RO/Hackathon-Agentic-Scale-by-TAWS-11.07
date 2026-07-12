export type UserRole = 'cliente' | 'ejecutivo' | 'admin'
export type ChatTipo = 'comercial' | 'tutor'
export type MensajeRol = 'usuario' | 'asistente'
export type LeadTipo = 'B2B' | 'B2C'
export type AccionEstado = 'pendiente' | 'aprobada' | 'editada' | 'rechazada'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Conversacion {
  id: string
  user_id: string
  titulo: string
  tipo: ChatTipo
  estado: string
  created_at: string
  updated_at: string
}

export interface Mensaje {
  id: string
  conversacion_id: string
  rol: MensajeRol
  contenido: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface LeadCRM {
  id: string
  user_id: string
  conversacion_id: string | null
  tipo: LeadTipo | null
  interes: string
  presupuesto: string
  urgencia: string
  prioridad: number
  resumen: string
  objeciones: string
  etapa: string
  siguiente_accion: string
  consentimiento: boolean
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface EvaluacionQuiz {
  id: string
  user_id: string
  conversacion_id: string | null
  tema: string
  respuestas: unknown[]
  resultado: string
  puntaje: number
  created_at: string
}

export interface AccionComercial {
  id: string
  lead_id: string
  propuesta: string
  estado: AccionEstado
  ejecutivo_id: string | null
  notas: string
  created_at: string
  updated_at: string
  leads_crm?: LeadCRM
}

export interface N8nChatResponse {
  reply: string
  agente?: 'comercial' | 'tutor'
  lead?: Partial<LeadCRM>
  accion?: string
  fuente?: string
  quiz?: { pregunta: string; opciones: string[] }[]
}

export interface QuizQuestion {
  id: number
  pregunta: string
  opciones: string[]
  respuestaCorrecta: number
}
