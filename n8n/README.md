# Workflow n8n corregido

## Problema
El error `n8n error 500: {"message":"Workflow execution failed"}` **no es de la página**.
El workflow se cae internamente antes de responder.

## Causas encontradas en tu workflow (6)

1. **SQL con comillas** en `Execute a SQL query1`  
   El mensaje del usuario se insertaba con `'{{ ... }}'`. Si el texto tenía `'` o caracteres especiales → **SQL error → 500**.

2. **Agente General recibía campos vacíos**  
   El Code enviaba `commercial` / `education`, pero el prompt leía `contexto_comercial` / `contexto_tutor` (no existen).

3. **Orquestador recibía el objeto message**, no el texto `.content`.

4. **Edit Fields1** no parseaba el JSON del orquestador correctamente.

## Qué hacer

### 1. Importar el workflow corregido
Archivo:

`n8n/workflow-chat-fixed.json`

En n8n:
1. Menu → **Import from File**
2. Selecciona `workflow-chat-fixed.json`
3. Revisa credenciales (Postgres + OpenAI)
4. Activa el workflow
5. Confirma que el Webhook sigue en `/chat`

### 2. Reiniciar la web
```powershell
npm run dev
```

### 3. Probar
Escribe libremente en el chat. Debes recibir el `output` del **Agente General**.

## Respuesta esperada del webhook
```json
{
  "output": "Excelente. Entiendo que deseas invertir..."
}
```
