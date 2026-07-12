# Corrección del workflow n8n (My workflow)

El workflow **sí se ejecuta bien**, pero la página falla porque el nodo **Respond to Webhook** no envía el texto del Agente General.

## Error 1 — Respond to Webhook (principal)

Ahora tienes:

```json
{
  "output": "{{ $json.text }}"
}
```

Eso está mal porque:
1. Después de `Execute a SQL query3`, `$json` es el resultado de Postgres, **no** el del Agente General.
2. El texto real está en: `output[0].content[0].text`
3. Falta el `=` al inicio de la expresión.

### Cámbialo a:

```json
{
  "output": "={{ $('Agente General').item.json.output[0].content[0].text }}"
}
```

---

## Error 2 — Edit Fields (mensaje fijo)

Ahora el nodo **Edit Fields** tiene el mensaje **hardcodeado**:

```json
"message": { "content": "quiero invertir $5000" }
```

Eso ignora lo que escribe el usuario en la web.

### Cámbialo a modo expresión / JSON dinámico:

```json
{
  "session": {
    "id": "={{ $json.body.session.id || $json.body.conversacionId }}",
    "user_id": "={{ $json.body.session.user_id || $json.body.userId }}"
  },
  "conversation": {
    "intent": "UNKNOWN",
    "state": "START",
    "goal": ""
  },
  "message": {
    "role": "user",
    "content": "={{ $json.body.message.content || $json.body.message }}"
  },
  "history": "={{ $json.body.history || $json.body.historial || [] }}",
  "crm": {
    "profile": {},
    "summary": {},
    "lead": {}
  },
  "memory": {
    "conversation": {},
    "flags": {}
  }
}
```

---

## Error 3 — Code in JavaScript (user_message)

Si falla ese nodo, usa:

```js
user_message: $('Webhook').first().json.body?.message?.content
  || $('Webhook').first().json.body?.message
  || $('Edit Fields').first().json.message?.content
```

---

## Checklist

1. Corregir **Respond to Webhook** con la expresión del Agente General
2. Corregir **Edit Fields** para leer el mensaje del webhook
3. Guardar y **activar** el workflow
4. Reiniciar la página (`npm run dev`)
5. Probar el chat

Cuando Respond to Webhook envíe `{ "output": "Excelente. Entiendo que..." }`, la página lo mostrará.
