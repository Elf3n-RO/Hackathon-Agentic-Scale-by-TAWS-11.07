const fs = require('fs')
const src = 'c:/Users/elegs/Downloads/My workflow (6).json'
const wf = JSON.parse(fs.readFileSync(src, 'utf8'))

function node(name) {
  const n = wf.nodes.find((x) => x.name === name)
  if (!n) throw new Error('Missing node: ' + name)
  return n
}

node('Edit Fields').parameters.jsonOutput =
  "={{ JSON.stringify({\n" +
  "  session: {\n" +
  "    id: String($json.body?.session?.id || $json.body?.conversacionId || $execution.id),\n" +
  "    user_id: String($json.body?.session?.user_id || $json.body?.userId || 'anon')\n" +
  "  },\n" +
  "  conversation: $json.body?.conversation || { intent: 'UNKNOWN', state: 'START', goal: '' },\n" +
  "  message: {\n" +
  "    role: 'user',\n" +
  "    content: String(\n" +
  "      (typeof $json.body?.message === 'string' ? $json.body.message : null) ||\n" +
  "      $json.body?.message?.content ||\n" +
  "      $json.body?.content ||\n" +
  "      ''\n" +
  "    )\n" +
  "  },\n" +
  "  history: Array.isArray($json.body?.history) ? $json.body.history : (Array.isArray($json.body?.historial) ? $json.body.historial : []),\n" +
  "  crm: $json.body?.crm || { profile: {}, summary: {}, lead: {} },\n" +
  "  memory: $json.body?.memory || { conversation: {}, flags: {} }\n" +
  "}) }}"

node('Execute a SQL query').parameters.query =
  "INSERT INTO fa_sessions (id, status) VALUES (md5($1)::uuid, 'active') ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;"
node('Execute a SQL query').parameters.options = {
  queryReplacement: '={{ $json.session.id }}',
}
node('Execute a SQL query').onError = 'continueRegularOutput'

node('Execute a SQL query1').parameters.query =
  "INSERT INTO fa_messages (session_id, role, content) VALUES (md5($1)::uuid, 'user', $2);"
node('Execute a SQL query1').parameters.options = {
  queryReplacement: "={{ [$('Edit Fields').item.json.session.id, $('Edit Fields').item.json.message.content] }}",
}
node('Execute a SQL query1').onError = 'continueRegularOutput'

node('Orquestador').parameters.responses.values[1].content =
  "={{ $('Edit Fields').item.json.message.content }}"

node('Edit Fields1').parameters.assignments.assignments[0].value =
  "={{ (() => {\n" +
  "  const raw = $json.output?.[0]?.content?.[0]?.text || '';\n" +
  "  const clean = String(raw).replace(/```json/g, '').replace(/```/g, '').trim();\n" +
  "  try { return JSON.parse(clean); } catch (e) {\n" +
  "    return { intent: 'UNKNOWN', goal: clean.slice(0, 200), agents: ['COMERCIAL'] };\n" +
  "  }\n" +
  "})() }}"
node('Edit Fields1').parameters.assignments.assignments[0].type = 'object'

node('Code in JavaScript').parameters.jsCode = `const getSafe = (name) => {
  try { return $(name).first().json || null; } catch (e) { return null; }
};

const extractText = (nodeJson) => {
  try { return nodeJson?.output?.[0]?.content?.[0]?.text || null; } catch (e) { return null; }
};

const parseMaybeJson = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(String(text).replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim());
  } catch (e) {
    return { raw: text };
  }
};

const edit = getSafe('Edit Fields');
const orqNode = getSafe('Orquestador');
const orqParsed = getSafe('Edit Fields1')?.orquestador || parseMaybeJson(extractText(orqNode)) || {};
const comercialRaw = extractText(getSafe('Agente Comercial'));
const tutorRaw = extractText(getSafe('Agente Tutor'));
const webhook = getSafe('Webhook');

const userMessage =
  edit?.message?.content ||
  webhook?.body?.message?.content ||
  webhook?.body?.message ||
  '';

return {
  json: {
    user_message: userMessage,
    intent: orqParsed.intent || 'UNKNOWN',
    goal: orqParsed.goal || '',
    agents: orqParsed.agents || [],
    commercial: parseMaybeJson(comercialRaw),
    education: parseMaybeJson(tutorRaw),
    commercial_raw: comercialRaw,
    education_raw: tutorRaw,
    session: edit?.session || {}
  }
};`

node('Agente General').parameters.responses.values[1].content =
  '=Mensaje del usuario:\n{{ $json.user_message }}\n\nIntent: {{ $json.intent }}\nGoal: {{ $json.goal }}\n\nInformación comercial:\n{{ JSON.stringify($json.commercial || {}, null, 2) }}\n\nInformación educativa (Tutor):\n{{ JSON.stringify($json.education || {}, null, 2) }}\n'

node('Code in JavaScript1').parameters.jsCode = `let budget = 0;
let risk = 'No definido';
let goal = 'No definido';

try {
  const rawText = $json.output?.[0]?.content?.[0]?.text || '';
  const cleanText = String(rawText).replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
  const data = JSON.parse(cleanText);
  const profile = data.profile || {};
  const investment = profile.investment || data.database_updates || {};
  budget = investment.investment_budget ?? data.database_updates?.investment_budget ?? 0;
  risk = investment.risk_profile ?? data.database_updates?.risk_profile ?? 'No definido';
  goal = investment.financial_goal ?? data.database_updates?.financial_goal ?? 'No definido';
} catch (e) {}

return {
  json: {
    budget,
    risk,
    goal,
    session_id: $('Edit Fields').first().json.session.id
  }
};`
node('Code in JavaScript1').onError = 'continueRegularOutput'

node('Execute a SQL query2').onError = 'continueRegularOutput'
node('Execute a SQL query3').onError = 'continueRegularOutput'
node('Execute a SQL query3').parameters.options.queryReplacement =
  "={{ [$('Edit Fields').first().json.session.id, $('Agente General').item.json.output[0].content[0].text] }}"

node('Respond to Webhook').parameters.responseBody =
  "={{ JSON.stringify({ output: $('Agente General').item.json.output[0].content[0].text }) }}"

wf.name = 'SyntaxError Track1 Chat (fixed)'

const out = 'E:/Uleam/Hackathon Agentic Scale by TAWS 11.07/n8n/workflow-chat-fixed.json'
fs.mkdirSync('E:/Uleam/Hackathon Agentic Scale by TAWS 11.07/n8n', { recursive: true })
fs.writeFileSync(out, JSON.stringify(wf, null, 2))
console.log('Wrote', out)
