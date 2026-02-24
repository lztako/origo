# LINE Webhook Edge Function

Function path: `supabase/functions/line-webhook/index.ts`

## Purpose

- Receive LINE OA webhook events.
- Verify `X-Line-Signature` before processing.
- Deduplicate events via `line_event_id`.
- Handle basic commands and account-link prompts.
- Log events/messages to:
  - `public.line_webhook_events`
  - `public.line_message_logs`

## Required secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_AI_INTERNAL_SECRET`
  - Shared secret used to call `ai-agent` in internal LINE scope mode.

## Optional secrets

- `LINE_LINK_BASE_URL`
  - Account-link page URL.
  - Function appends `?token=...` (or `&token=...`) and writes token to `public.line_link_tokens`.
  - Example: `https://your-domain.com/line-link.html`
- `LINE_REPLAY_WINDOW_SECONDS` (default `300`)
- `LINE_RATE_LIMIT_USER_PER_MINUTE` (default `20`)
- `LINE_RATE_LIMIT_ENTITY_PER_MINUTE` (default `120`)

## Supported commands

- `เริ่มใช้งาน` / `link`
- `สถานะ` / `status`
- `ช่วยเหลือ` / `help`
- `logout`
- `ยืนยัน logout`
- `ยกเลิกบริการ`

## Rich Menu v1 (recommended)

Webhook now supports both:
- text message commands
- postback commands (recommended for rich menu)

Recommended postback `data` values:
- `cmd=link`
- `cmd=status`
- `cmd=help`
- `cmd=summary`
- `cmd=detail`
- `cmd=logout`
- `cmd=confirm_logout`
- `cmd=cancel_service`

These values are normalized into existing command flow, so no separate backend route is required.

## Current behavior

- Unlinked users receive link-required response.
- `logout` + `ยืนยัน logout` revokes current active mapping.
- Non-command questions call `ai-agent` with internal scoped payload (`channel=line`, `internal_scope.entity_id`, `internal_scope.user_id`).
- If AI fails, function returns standard fallback response.
- Replay window and rate limit checks are enforced before heavy processing.
- Message/event logs apply basic masking for email/phone and `line_user_id` in raw payload snapshots.
- Link callback page should call RPC `public.consume_line_link_token(p_link_token text)` after user login.

## Deploy

```bash
supabase functions deploy line-webhook --no-verify-jwt
```

`--no-verify-jwt` is required because requests come from LINE servers, not Supabase Auth clients.
