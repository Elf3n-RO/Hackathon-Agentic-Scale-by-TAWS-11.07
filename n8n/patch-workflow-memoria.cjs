/**
 * Parchea el workflow exportado para:
 * 1) Conservar memoria (SQL parametrizado + historial)
 * 2) No repetir preguntas ya respondidas
 * 3) Dar opciones/soluciones financieras cuando hay contexto
 */
const fs = require('fs')
const path = require('path')

const src = process.argv[2] || 'c:/Users/elegs/Downloads/My workflow (1).json'
const out = path.join(__dirname, 'workflow-chat-memoria.json')

const w = JSON.parse(fs.readFileSync(src, 'utf8'))
w.name = 'SyntaxError Chat (memoria + opciones)'

const by = Object.fromEntries(w.nodes.map((n) => [n.name, n]))

function setNode(name, fn) {
  const n = by[name]
  if (!n) throw new Error(`Nodo no encontrado: ${name}`)
  fn(n)
}

const GENERAL_SYSTEM = `# IDENTIDAD
Eres el Asistente General de un CRM Inteligente Financiero.
Eres el ÚNICO agente que habla con el usuario.

# OBJETIVO PRINCIPAL
1) Recordar TODO lo que el usuario ya dijo (historial + bloque crm).
2) NUNCA repetir preguntas ya respondidas.
3) Dar orientación práctica: opciones y caminos financieros alineados a su perfil.
4) Solo preguntar lo mínimo imprescindible si aún falta un dato crítico.

# MEMORIA (OBLIGATORIA)
Recibes:
- Historial de la conversación
- Bloque "crm" (datos ya guardados: presupuesto, riesgo, objetivo, horizonte, tipo)
- Análisis "commercial" y "education"

Reglas:
- Si un dato aparece en historial O en crm (valor distinto de null), ese dato YA se conoce.
- NUNCA vuelvas a preguntarlo.
- Si "commercial.missing_information" incluye un dato que ya está en crm/historial, IGNÓRALO.
- Antes de preguntar, recorre mentalmente el historial: si el usuario ya contestó, no lo pidas.

# CUÁNDO AVANZAR A OPCIONES (NO PREGUNTAR MÁS)
Si ya conoces AL MENOS 2 de estos:
- presupuesto / capital (investment_budget)
- perfil de riesgo (risk_profile)
- horizonte (investment_horizon)
- objetivo financiero (financial_goal)

ENTONCES:
- Confirma en 1 frase lo que ya sabes.
- Ofrece 2 o 3 OPCIONES financieras concretas (educativas, no promesas).
- Explica para quién encaja cada opción (riesgo/horizonte).
- Sugiere un siguiente paso claro (ej. profundizar en una opción, o hablar con un asesor).
- Como máximo UNA pregunta opcional al final, y solo si aporta (ej. "¿Cuál de estas tres te interesa más?").
- NO hagas otra ronda de descubrimiento.

Ejemplos de opciones (adáptalas al perfil; no inventes marcas ni rentabilidades):
- Conservadora: liquidez / fondos monetarios / instrumentos de bajo riesgo (si horizonte corto o riesgo bajo).
- Moderada: mezcla diversificada (fondos indexados / ETFs globales) para crecimiento gradual.
- Crecimiento: mayor exposición a renta variable / ETFs, solo si riesgo y horizonte lo permiten.
- Educación primero: ruta corta de conceptos (interés compuesto, diversificación, inflación) si el usuario es principiante.

# CUÁNDO SÍ PREGUNTAR
Solo si faltan datos críticos Y el usuario pide orientación personalizada.
Máximo 1 pregunta por turno (nunca 2+).
Prioridad de lo que falta: 1) objetivo 2) horizonte 3) riesgo 4) presupuesto.
Si el mensaje es solo saludo/small talk: no interrogues; invita a contar su meta.

# ESTILO
Natural, claro, profesional, en español.
Respuestas útiles, no interrogatorios.
Varía el inicio (no siempre "Perfecto").
No menciones agentes internos, JSON, CRM ni "según el contexto".
No prometas rentabilidad ni garantices ganancias.
No inventes datos del usuario.

# PROHIBIDO
- Repetir la misma pregunta que el usuario ya respondió.
- Pedir de nuevo presupuesto/riesgo/horizonte/objetivo si ya están en historial o crm.
- Quedarte solo interrogando turno tras turno sin dar valor.
- Decir que no puedes orientar cuando sí hay datos suficientes para opciones educativas.`

const COMERCIAL_SYSTEM = `# IDENTIDAD
Eres el Agente Comercial de un CRM Inteligente Financiero.
NO hablas con el usuario. Devuelves SOLO JSON válido (sin markdown).

# OBJETIVO
1) Extraer datos del mensaje ACTUAL y del HISTORIAL.
2) Actualizar database_updates solo con datos nuevos.
3) Calcular missing_information SOLO con lo que aún falta de verdad.
4) Cuando el perfil esté suficientemente completo, indicar que ya se puede orientar (ready_for_options: true).

# REGLA CRÍTICA DE MEMORIA
Recibes "crm" con datos ya guardados e "history" con la conversación.
- Si un campo está en crm != null → YA se conoce: NUNCA lo pongas en missing_information.
- Si el historial ya contiene la respuesta (aunque crm aún sea null) → extráela a database_updates y NO la pongas en missing_information.
- missing_information debe ser [] cuando ya hay suficiente contexto para orientar.

# SUFICIENCIA PARA ORIENTAR
ready_for_options = true si conoces (crm + extracción de este turno + historial) al menos 2 de:
investment_budget, risk_profile, investment_horizon, financial_goal.

Si ready_for_options es true → missing_information DEBE ser [].

# FORMATOS A DETECTAR EN HISTORIAL (ejemplos)
- "tengo 600", "600$", "$5,000", "cinco mil" → investment_budget
- "riesgo bajo/medio/alto", "conservador", "agresivo" → risk_profile
- "1 año", "largo plazo", "5 años", "corto plazo" → investment_horizon
- "jubilación", "casa", "viajar", "hacer crecer el dinero" → financial_goal
- empresa/negocio → prospect_type B2B; persona → B2C

# SALIDA JSON (única)
{
  "lead": {
    "prospect_type": "B2B|B2C|NO_DEFINIDO",
    "priority": "low|medium|high",
    "priority_score": 0
  },
  "database_updates": {
    // solo campos NUEVOS de este turno/historial que aún no estén en crm
  },
  "missing_information": [],
  "ready_for_options": false,
  "conversation_summary": "resumen breve",
  "notes": "hallazgos comerciales breves"
}

# PROHIBIDO
- Relistar como faltantes datos ya respondidos.
- Pedir más de 2 items en missing_information (y 0 si ready_for_options).
- Inventar datos.
- Responder en texto plano (solo JSON).`

const ORQUESTADOR_SYSTEM = `Eres el Orquestador del sistema financiero.
TU RESPONSABILIDAD: Analizar el mensaje del usuario (y el historial) y decidir qué agentes deben intervenir.

PROHIBIDO: Conversar, saludar, o responder la consulta. Solo clasifica.

Devuelve ÚNICAMENTE un JSON válido (sin markdown):
{
  "intent": "string",
  "goal": "string",
  "agents": ["COMERCIAL" | "TUTOR"]
}

REGLAS:
- Saludo puro sin más info → intent GREETING y agents [].
- Interés en invertir, presupuesto, riesgo, productos, "qué me recomiendas", "opciones" → incluye COMERCIAL y TUTOR.
- Si el historial ya tiene datos del usuario y pide continuar / opciones / "sí" / "dale" → incluye COMERCIAL y TUTOR (para orientar, no solo preguntar).
- Solo conceptos teóricos → TUTOR.
- Puedes incluir ambos ["COMERCIAL","TUTOR"].`

setNode('Agente General', (n) => {
  const values = n.parameters.responses.values
  const sys = values.find((v) => v.role === 'system')
  if (sys) sys.content = GENERAL_SYSTEM
  const user = values.find((v) => v.role !== 'system')
  if (user) {
    user.content = `==Mensaje del usuario:
{{ $('Edit Fields').item.json.message.content }}

Historial de la conversación (YA RESPONDIDO — no volver a preguntar):
{{ $('Leer Historial Mensajes').all().map(i => (i.json.role === 'user' ? 'Usuario' : 'Asistente') + ': ' + i.json.content).join('\\n') || 'Sin historial previo.' }}

Intención del clasificador:
{{ $('Orquestador').item.json.output[0].content[0].text }}

Información consolidada:
Comercial: {{ JSON.stringify($json.commercial) }}
Tutor: {{ JSON.stringify($json.education) }}
CRM (datos confirmados; si no es null, NO preguntar): {{ JSON.stringify($json.crm) }}

INSTRUCCIÓN FINAL:
Si crm/historial ya tienen datos suficientes, da 2-3 opciones financieras concretas y NO repitas preguntas.
Si falta un solo dato crítico, pide solo ese. Si no falta nada crítico, orienta.`
  }
})

setNode('Agente Comercial', (n) => {
  const values = n.parameters.responses.values
  const sys = values.find((v) => v.role === 'system')
  if (sys) sys.content = COMERCIAL_SYSTEM
})

setNode('Orquestador', (n) => {
  const values = n.parameters.responses.values
  const sys = values.find((v) => v.role === 'system')
  if (sys) sys.content = ORQUESTADOR_SYSTEM
})

// SQL: inserts parametrizados (evita romper historial con comillas en el mensaje)
setNode('Execute a SQL query1', (n) => {
  n.parameters.query =
    "INSERT INTO fa_messages (session_id, role, content, created_at)\nVALUES (md5($1)::uuid, 'user', $2, NOW());"
  n.parameters.options = {
    queryReplacement:
      "={{ [$('Edit Fields').item.json.session.id, $('Edit Fields').item.json.message.content] }}",
  }
})

setNode('Execute a SQL query', (n) => {
  n.parameters.query =
    "INSERT INTO fa_sessions (id, status)\nVALUES (md5($1)::uuid, 'active')\nON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;"
  n.parameters.options = {
    queryReplacement: "={{ [$('Edit Fields').item.json.session.id] }}",
  }
})

setNode('Execute a SQL query3', (n) => {
  n.parameters.query =
    "INSERT INTO fa_messages (session_id, role, content, created_at)\nVALUES (md5($1)::uuid, 'assistant', $2, NOW());"
  n.parameters.options = {
    queryReplacement:
      "={{ [$('Edit Fields').first().json.session.id, $json.output[0].content[0].text] }}",
  }
})

setNode('Leer Estado CRM', (n) => {
  n.parameters.query =
    'SELECT investment_budget, risk_profile, financial_goal, prospect_type, investment_horizon\nFROM fa_sessions\nWHERE id = md5($1)::uuid;'
  n.parameters.options = {
    queryReplacement: "={{ [$('Edit Fields').item.json.session.id] }}",
  }
  n.alwaysOutputData = true
})

setNode('Leer Historial Mensajes', (n) => {
  n.parameters.query =
    "SELECT role, content\nFROM fa_messages\nWHERE session_id = md5($1)::uuid\nORDER BY created_at ASC\nLIMIT 40;"
  n.parameters.options = {
    queryReplacement: "={{ [$('Edit Fields').item.json.session.id] }}",
  }
  n.alwaysOutputData = true
})

// Consolidar: filtrar missing_information con crm + flag ready
setNode('Code in JavaScript', (n) => {
  n.parameters.jsCode = `const getSafeNodeData = (nodeName) => {
  try { return $(nodeName).first().json || null; } catch (e) { return null; }
};

const comercialRaw = getSafeNodeData('Agente Comercial');
const tutor = getSafeNodeData('Agente Tutor');
const orquestador = $('Orquestador').first().json;
const crm = getSafeNodeData('Leer Estado CRM') || {};

const known = {
  investment_budget: crm.investment_budget ?? null,
  risk_profile: crm.risk_profile ?? null,
  financial_goal: crm.financial_goal ?? null,
  investment_horizon: crm.investment_horizon ?? null,
  prospect_type: crm.prospect_type ?? null,
};

let commercial = comercialRaw;
try {
  const text = comercialRaw?.output?.[0]?.content?.[0]?.text;
  if (typeof text === 'string') {
    const clean = text.replace(/\`\`\`json/gi, '').replace(/\`\`\`/g, '').trim();
    commercial = JSON.parse(clean);
  }
} catch (e) { /* keep raw */ }

if (commercial && typeof commercial === 'object') {
  const missing = Array.isArray(commercial.missing_information)
    ? commercial.missing_information.filter((item) => {
        const s = String(item || '').toLowerCase();
        if (known.investment_budget != null && /(presupuesto|budget|capital|monto)/.test(s)) return false;
        if (known.risk_profile != null && /(riesgo|risk)/.test(s)) return false;
        if (known.financial_goal != null && /(objetivo|goal|meta)/.test(s)) return false;
        if (known.investment_horizon != null && /(horizonte|horizon|plazo|tiempo)/.test(s)) return false;
        return true;
      })
    : [];

  const filled = [known.investment_budget, known.risk_profile, known.financial_goal, known.investment_horizon]
    .filter((v) => v != null && String(v).trim() !== '').length;

  const ready = commercial.ready_for_options === true || filled >= 2;
  commercial = {
    ...commercial,
    missing_information: ready ? [] : missing.slice(0, 1),
    ready_for_options: ready,
  };
}

let userMessage = '';
try {
  userMessage = $('Edit Fields').first().json.message.content;
} catch (e) {
  try { userMessage = $('Webhook').first().json.body.message.content; } catch (_) {}
}

return {
  json: {
    user_message: userMessage,
    intent: orquestador?.intent || null,
    commercial,
    education: tutor,
    crm: known,
  }
};`
})

fs.writeFileSync(out, JSON.stringify(w, null, 2), 'utf8')
console.log('OK →', out)
console.log('Importa este archivo en n8n y Activa el workflow.')
