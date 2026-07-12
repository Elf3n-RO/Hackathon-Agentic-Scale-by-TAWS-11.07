# Workflow execution failed

Ese mensaje **NO lo inventa la página**.
Es la respuesta HTTP 500 del webhook de n8n.

## Prueba hecha desde fuera de la web

```
POST https://primary-production-3b7c.up.railway.app/webhook/chat
→ STATUS 500
→ BODY: Workflow execution failed
```

La página solo muestra ese error.

## Qué hacer en n8n (rápido)

### Opción A — Ver el nodo rojo (recomendado)
1. n8n → **Executions**
2. Abre la ejecución **roja** más reciente
3. Mira qué nodo está en rojo
4. Lee el mensaje de error de ese nodo

Causas típicas en tu workflow grande:
- SQL con comillas en el mensaje del usuario
- Postgres / credenciales
- Merge sin datos de un agente
- Code que lee campos que no existen

### Opción B — Chat mínimo para el hackathon (funciona ya)
Importa:

`n8n/workflow-chat-minimo.json`

Flujo:
`Webhook → Normalize Message → Agente IA → Respond to Webhook`

Pasos:
1. Import from File
2. Conecta tu credencial OpenAI
3. **Desactiva** el workflow viejo `/chat` (para que no choquen)
4. Activa el mínimo
5. Confirma path `chat`
6. Reinicia la web: `npm run dev`
7. Prueba el chat

Respuesta esperada:
```json
{ "output": "texto del asistente..." }
```

## Resumen
| Componente | Estado |
|------------|--------|
| Página web | Lista para mostrar `output` |
| Webhook actual | Devuelve 500 (workflow se cae) |
| Solución | Arreglar nodo rojo o usar workflow mínimo |
