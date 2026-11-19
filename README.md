# Support request triage (n8n)

An n8n workflow that receives an IT support request over a webhook, validates it, classifies the category, sets a priority and an SLA deadline, and answers with a ticket record and a first-response message. It uses no external services and no credentials, so it can be imported and tested in a few minutes.

> Built with AI assistance. The logic is covered by a small test suite and reviewed by the author.

## What it does

```
Webhook (POST /support-intake)
  -> Validate and triage (Code node)
       -> valid?  yes -> 201 + ticket record
                  no  -> 400 + list of errors
```

| Field | Rule |
|---|---|
| `requester` | required, up to 80 characters |
| `title` | required, up to 120 characters |
| `description` | required, at least 10 characters, up to 2000 |

Category (first rule that matches): `access`, `network`, `email`, `hardware`, `software`, `other`.

| Priority | Triggered by | SLA (first response) |
|---|---|---|
| `critical` | outage words such as "everyone", "down", "parado" | 1 hour |
| `high` | urgency words such as "urgent", "today", "deadline" | 4 hours |
| `normal` | everything else | 24 hours |

Keywords are in English and Portuguese. They are plain lists at the top of `triage.js`, so changing them does not need any other edit.

## Run it

1. In n8n choose **Import from file** and select `workflow.json`.
2. Activate the workflow and call the production URL:

```bash
curl -X POST "$N8N_URL/webhook/support-intake" \
  -H "Content-Type: application/json" \
  -d '{"requester":"Ana","title":"Sem internet","description":"A rede está fora do ar e todos estão parados."}'
```

Example response (`201`):

```json
{
  "valid": true,
  "ticketId": "T-20261118-1AB2C",
  "requester": "Ana",
  "title": "Sem internet",
  "category": "network",
  "priority": "critical",
  "slaHours": 1,
  "firstResponse": "Hi Ana, we received \"Sem internet\" as CRITICAL. Someone will contact you within 1 hour."
}
```

## Test it

```bash
node tests/triage.test.mjs
```

The test loads `workflow.json`, runs the exact code of the Code node against `samples/requests.json` (critical, high, normal, uncategorised and invalid requests) and checks that every connection points to an existing node.

## Files

| File | Purpose |
|---|---|
| `triage.js` | Source of the Code node |
| `scripts/build-workflow.mjs` | Embeds `triage.js` into `workflow.json` |
| `workflow.json` | The importable n8n workflow |
| `samples/requests.json` | Example requests with expected results |
| `tests/triage.test.mjs` | Tests |

## Limits

- Classification is keyword based. It does not understand context and can misclassify unusual wording.
- Tickets are not stored. Add a database, a sheet or a ticketing tool node after "Respond" if you need history.
- No authentication on the webhook. Put it behind your own protection before real use.
- Tested end to end on n8n 2.48.5 (self-hosted, local): import, publish, `POST` with a valid request returned `201` with the ticket, and an invalid one returned `400` with the errors. Other n8n versions were not tested.

## License

MIT
