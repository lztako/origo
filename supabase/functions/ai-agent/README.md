# AI Agent Edge Function

Function path: `supabase/functions/ai-agent/index.ts`

## Required secrets

- `ANTHROPIC_API_KEY`
- `CLAUDE_MODEL` (optional, default: `claude-sonnet-4-20250514`)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required for internal LINE scope mode)
- `LINE_AI_INTERNAL_SECRET` (required for internal LINE scope mode)

## Request shape

```json
{
  "model": "claude-sonnet-4-20250514",
  "mode": "default",
  "strict_server_only": true,
  "messages": [
    {
      "role": "user",
      "content": "Summarize trade performance"
    }
  ],
  "context": {},
  "requested_at": "2026-02-21T00:00:00.000Z"
}
```

Internal LINE scope request (server-to-server):

```json
{
  "mode": "default",
  "strict_server_only": true,
  "channel": "line",
  "internal_scope": {
    "entity_id": "00000000-0000-0000-0000-000000000000",
    "user_id": "00000000-0000-0000-0000-000000000000"
  },
  "messages": [
    {
      "role": "user",
      "content": "สรุป overdue ล่าสุด"
    }
  ]
}
```

Required header for internal LINE scope:

```text
x-line-internal-secret: <LINE_AI_INTERNAL_SECRET>
```

## Notes

- Reads data directly from allowlisted Supabase tables and builds `server_context.analytics`.
- Supports `mode: "company_detail"` for company-specific answers.
- `strict_server_only: true` enforces server-side context as source of truth.
- Supports internal LINE scope mode via header `x-line-internal-secret` + payload:
  - `channel: "line"`
  - `internal_scope.entity_id`
  - `internal_scope.user_id`
- Internal LINE scope mode loads only `operation` and `finance` rows mapped to the target `entity_id` via `company_entity_map`.
- If user asks for JSON, function now preserves valid JSON output and avoids comma-formatting that breaks numeric JSON fields.
- Adds deterministic rule-based answers for key prompts (for example finance summary JSON and company purchase-value mapping) before using model generation.
- Writes one telemetry row per request to `public.ai_telemetry_events` (latency, mode, intents/domains, finish_reason, provider_error).
- Function performs in-function auth validation:
  - user JWT mode: validates bearer token via `auth.getUser()`
  - LINE internal mode: validates `x-line-internal-secret` + `internal_scope` mapping

## Deploy

```bash
supabase functions deploy ai-agent --no-verify-jwt
```

`--no-verify-jwt` is used here because auth is validated inside the function body.
