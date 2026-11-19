// Runs the exact code stored in workflow.json against the sample requests.
// Run: node tests/triage.test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = JSON.parse(readFileSync(join(root, 'workflow.json'), 'utf8'));
const code = workflow.nodes.find((node) => node.name === 'Validate and triage').parameters.jsCode;
const run = new Function('$input', code);
const samples = JSON.parse(readFileSync(join(root, 'samples/requests.json'), 'utf8'));

let failed = 0;
for (const sample of samples) {
  const [{ json }] = run({ first: () => ({ json: { body: sample.body } }) });
  try {
    for (const [key, value] of Object.entries(sample.expect)) assert.equal(json[key], value, `${sample.name}: ${key}`);
    if (json.valid) {
      assert.match(json.ticketId, /^T-\d{8}-[0-9A-Z]{1,5}$/);
      assert.ok(json.firstResponse.includes(sample.body.requester));
    } else {
      assert.ok(Array.isArray(json.errors) && json.errors.length === 3);
    }
    console.log(`ok   ${sample.name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${error.message}`);
  }
}

// Connections must point to existing nodes.
const names = new Set(workflow.nodes.map((node) => node.name));
for (const [from, { main }] of Object.entries(workflow.connections)) {
  assert.ok(names.has(from), `unknown source ${from}`);
  for (const branch of main) for (const link of branch) assert.ok(names.has(link.node), `unknown target ${link.node}`);
}
console.log('ok   connections');
process.exit(failed ? 1 : 0);
