# Workflow con memoria + opciones financieras

## Problema que corrige
El chat repetía las mismas preguntas porque:
1. El **Agente General** tenía prohibido dar orientación financiera → solo interrogaba.
2. Los INSERT del historial usaban comillas en el SQL → fallaban con `'` o textos raros y **no guardaban memoria**.

## Archivo a importar
`n8n/workflow-chat-memoria.json`

## Pasos en n8n
1. Abre n8n → **Workflows** → menú **…** → **Import from File**
2. Elige `workflow-chat-memoria.json`
3. Verifica credenciales: **OpenAI** y **Postgres**
4. **Activa** el workflow (toggle Active)
5. Si ya tenías otro workflow en `/webhook/chat`, desactívalo para evitar conflicto

## Qué cambia
- Historial y CRM con SQL **parametrizado** (`$1`, `$2`)
- Historial hasta **40** mensajes
- General: **no repite** datos ya respondidos y da **2–3 opciones** cuando hay contexto
- Comercial: `missing_information` vacío si el perfil ya es suficiente
- Mismo body del frontend:
  ```json
  { "session": { "id": "..." }, "message": { "content": "..." } }
  ```

## Regenerar el parche
Si exportas de nuevo tu workflow desde n8n:
```bash
node n8n/patch-workflow-memoria.cjs "ruta/a/tu-export.json"
```
