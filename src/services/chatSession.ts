const SESSION_KEY = 'chat_session_id'

/** Id de sesión n8n: se crea una vez y se reutiliza mientras dure la conversación. */
export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

/** Fija el id (p. ej. al abrir un chat del historial). */
export function setSessionId(id: string) {
  sessionStorage.setItem(SESSION_KEY, id)
}

/** Nueva conversación: borra el id para que getSessionId() genere uno nuevo. */
export function clearSessionId() {
  sessionStorage.removeItem(SESSION_KEY)
}
