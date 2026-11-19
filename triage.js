// n8n Code node ("Run Once for All Items"): validates and triages a support request.
// Input: the Webhook node output ({ body: { requester, title, description } }).
// Output: one item with the ticket record. No external services, no credentials.

const input = $input.first().json;
const body = (input && input.body) || {};

const clean = (value, max) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';

const requester = clean(body.requester, 80);
const title = clean(body.title, 120);
const description = clean(body.description, 2000);

const errors = [];
if (!requester) errors.push('requester is required');
if (!title) errors.push('title is required');
if (description.length < 10) errors.push('description must have at least 10 characters');

if (errors.length > 0) {
  return [{ json: { valid: false, errors } }];
}

const text = `${title} ${description}`.toLowerCase();
const has = (words) => words.some((word) => text.includes(word));

// Category: first matching rule wins, order matters.
const rules = [
  { category: 'access', words: ['senha', 'password', 'login', 'acesso', 'access', 'bloquead', 'locked', 'mfa'] },
  { category: 'network', words: ['wi-fi', 'wifi', 'rede', 'network', 'vpn', 'internet', 'lento', 'slow'] },
  { category: 'email', words: ['e-mail', 'email', 'outlook', 'teams', 'calendar', 'agenda'] },
  { category: 'hardware', words: ['impressora', 'printer', 'monitor', 'teclado', 'mouse', 'bateria', 'battery', 'tela quebrada', 'não liga', 'does not turn on'] },
  { category: 'software', words: ['instalar', 'install', 'erro', 'error', 'travando', 'crash', 'atualiza', 'update', 'licença', 'license'] },
];
const matched = rules.find((rule) => has(rule.words));
const category = matched ? matched.category : 'other';

// Priority: impact words raise it. Everything else is normal.
let priority = 'normal';
if (has(['todos', 'everyone', 'toda a equipe', 'whole team', 'fora do ar', 'down', 'parado', 'outage'])) {
  priority = 'critical';
} else if (has(['urgente', 'urgent', 'hoje', 'today', 'reunião', 'meeting', 'prazo', 'deadline', 'não consigo trabalhar', 'cannot work'])) {
  priority = 'high';
}

const slaHours = { critical: 1, high: 4, normal: 24 }[priority];
const received = new Date();
const dueAt = new Date(received.getTime() + slaHours * 3600 * 1000);
const stamp = received.toISOString().slice(0, 10).replace(/-/g, '');
const ticketId = `T-${stamp}-${received.getTime().toString(36).slice(-5).toUpperCase()}`;

const firstResponse =
  priority === 'critical'
    ? `Hi ${requester}, we received "${title}" as CRITICAL. Someone will contact you within ${slaHours} hour.`
    : `Hi ${requester}, we received "${title}" (${category}, ${priority} priority). Expected first response within ${slaHours} hours.`;

return [
  {
    json: {
      valid: true,
      ticketId,
      requester,
      title,
      category,
      priority,
      slaHours,
      receivedAt: received.toISOString(),
      dueAt: dueAt.toISOString(),
      firstResponse,
    },
  },
];
