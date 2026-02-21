# AI Agent Edge Function

Function path: `supabase/functions/ai-agent/index.ts`

## Required secrets

- `ANTHROPIC_API_KEY`
- `CLAUDE_MODEL` (optional, default: `claude-sonnet-4-20250514`)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

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

## Notes

- Reads data directly from allowlisted Supabase tables and builds `server_context.analytics`.
- Supports `mode: "company_detail"` for company-specific answers.
- `strict_server_only: true` enforces server-side context as source of truth.
- If user asks for JSON, function now preserves valid JSON output and avoids comma-formatting that breaks numeric JSON fields.
- Adds deterministic rule-based answers for key prompts (for example finance summary JSON and company purchase-value mapping) before using model generation.
- Writes one telemetry row per request to `public.ai_telemetry_events` (latency, mode, intents/domains, finish_reason, provider_error).
- Function performs in-function JWT validation (`auth.getUser()`).

## Deploy

```bash
supabase functions deploy ai-agent --no-verify-jwt
```

`--no-verify-jwt` is used here because auth is validated inside the function body.
