// Builds workflow.json by embedding triage.js into the n8n Code node.
// Run: node scripts/build-workflow.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const jsCode = readFileSync(join(root, 'triage.js'), 'utf8');

const respond = (name, id, position, code) => ({
  id,
  name,
  type: 'n8n-nodes-base.respondToWebhook',
  typeVersion: 1.1,
  position,
  parameters: {
    respondWith: 'json',
    responseBody: '={{ JSON.stringify($json) }}',
    options: { responseCode: code },
  },
});

const workflow = {
  name: 'Support request triage',
  nodes: [
    {
      id: 'a1b2c3d4-0001-4000-8000-000000000001',
      name: 'Support intake (Webhook)',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [0, 0],
      webhookId: 'support-intake',
      parameters: { httpMethod: 'POST', path: 'support-intake', responseMode: 'responseNode', options: {} },
    },
    {
      id: 'a1b2c3d4-0002-4000-8000-000000000002',
      name: 'Validate and triage',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [260, 0],
      parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode },
    },
    {
      id: 'a1b2c3d4-0003-4000-8000-000000000003',
      name: 'Is valid?',
      type: 'n8n-nodes-base.if',
      typeVersion: 1,
      position: [520, 0],
      parameters: { conditions: { boolean: [{ value1: '={{ $json.valid }}', value2: true }] } },
    },
    respond('Respond 201 (ticket)', 'a1b2c3d4-0004-4000-8000-000000000004', [780, -100], 201),
    respond('Respond 400 (errors)', 'a1b2c3d4-0005-4000-8000-000000000005', [780, 120], 400),
  ],
  connections: {
    'Support intake (Webhook)': { main: [[{ node: 'Validate and triage', type: 'main', index: 0 }]] },
    'Validate and triage': { main: [[{ node: 'Is valid?', type: 'main', index: 0 }]] },
    'Is valid?': {
      main: [
        [{ node: 'Respond 201 (ticket)', type: 'main', index: 0 }],
        [{ node: 'Respond 400 (errors)', type: 'main', index: 0 }],
      ],
    },
  },
  settings: { executionOrder: 'v1' },
};

writeFileSync(join(root, 'workflow.json'), JSON.stringify(workflow, null, 2) + '\n');
console.log('workflow.json written');
