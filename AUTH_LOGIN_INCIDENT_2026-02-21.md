# Auth Login Incident Note (2026-02-21)

## Symptom
- User login failed with:
- `Invalid login credentials`
- then `Database error querying schema`

## Root Cause
- `auth.users` had nullable token fields with `NULL` values (notably `confirmation_token`).
- GoTrue auth service attempted to scan `confirmation_token` into non-null string and failed:
- `sql: Scan error on column index 3, name "confirmation_token": converting NULL to string is unsupported`

## Fix Applied
1. Backfill and normalize auth identity rows:
- Create missing `auth.identities` entries for email users.
- Set `provider='email'`, `provider_id=lower(email)`, and consistent `identity_data`.
2. Reset password for login account:
- `login@trrgroup.com` -> password `trrgroup`.
3. Normalize auth.users null-sensitive fields:
- Set empty string for token/text fields used by auth flow:
  - `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`,
  - `phone_change`, `phone_change_token`, `email_change_token_current`, `reauthentication_token`
- Set null JSON to `{}`:
  - `raw_app_meta_data`, `raw_user_meta_data`
4. Ensure instance linkage:
- Set `auth.users.instance_id` to default instance UUID where null.

## Verification
- Auth logs show successful password login:
- `2026-02-21T09:46:24Z` `POST /token` status `200`
- `actor_username`: `login@trrgroup.com`, provider `email`

## Prevention
- Avoid direct/manual writes to `auth.users` unless full auth shape is preserved.
- Prefer creating users through Supabase Auth API/Admin flow to keep `auth.users` and `auth.identities` consistent.
