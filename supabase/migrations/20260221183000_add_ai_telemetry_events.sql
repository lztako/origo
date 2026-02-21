-- AI telemetry events for observability and quality monitoring.
-- Stores one row per AI request with mode, intent/domain routing, latency, and provider status.

create table if not exists public.ai_telemetry_events (
  event_id uuid primary key default gen_random_uuid(),
  request_id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_id uuid default private.current_user_entity_id() references public.company_entities(entity_id) on delete set null,
  request_mode text not null default 'default',
  model text,
  strict_server_only boolean not null default true,
  question text,
  domains_requested jsonb not null default '{}'::jsonb,
  intents_requested jsonb not null default '{}'::jsonb,
  row_counts jsonb not null default '{}'::jsonb,
  tool_report jsonb not null default '{}'::jsonb,
  finish_reason text,
  continuation_rounds integer not null default 0,
  provider_error text,
  latency_ms integer,
  created_at timestamptz not null default now(),
  constraint ai_telemetry_events_latency_non_negative
    check (latency_ms is null or latency_ms >= 0)
);

create unique index if not exists uq_ai_telemetry_events_request_id
  on public.ai_telemetry_events (request_id);

create index if not exists idx_ai_telemetry_events_user_created
  on public.ai_telemetry_events (user_id, created_at desc);

create index if not exists idx_ai_telemetry_events_entity_created
  on public.ai_telemetry_events (entity_id, created_at desc);

create index if not exists idx_ai_telemetry_events_mode_created
  on public.ai_telemetry_events (request_mode, created_at desc);

alter table public.ai_telemetry_events enable row level security;

drop policy if exists ai_telemetry_events_select_owner on public.ai_telemetry_events;
create policy ai_telemetry_events_select_owner
on public.ai_telemetry_events
for select
to authenticated
using (
  user_id = auth.uid()
  and (
    entity_id is null
    or private.current_user_is_member(entity_id)
  )
);

drop policy if exists ai_telemetry_events_insert_owner on public.ai_telemetry_events;
create policy ai_telemetry_events_insert_owner
on public.ai_telemetry_events
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    entity_id is null
    or entity_id = private.current_user_entity_id()
  )
);

revoke all on public.ai_telemetry_events from anon, authenticated;
grant select, insert on public.ai_telemetry_events to authenticated;
