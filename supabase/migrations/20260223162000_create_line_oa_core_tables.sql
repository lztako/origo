-- LINE OA foundation: link mapping, webhook audit, and message logs.

create extension if not exists pgcrypto;

create table if not exists public.line_user_links (
  link_id uuid primary key default gen_random_uuid(),
  line_user_id text not null,
  user_id uuid not null,
  entity_id uuid not null,
  status text not null default 'pending_link'
    check (status in ('pending_link', 'active', 'suspended', 'revoked', 'terminated')),
  linked_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_line_user_links_member
    foreign key (entity_id, user_id)
    references public.company_user_members (entity_id, user_id)
    on delete cascade
);

create table if not exists public.line_link_tokens (
  token_id uuid primary key default gen_random_uuid(),
  link_token text not null unique,
  line_user_id text not null,
  status text not null default 'issued'
    check (status in ('issued', 'used', 'expired', 'revoked')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  user_id uuid,
  entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_line_link_tokens_member
    foreign key (entity_id, user_id)
    references public.company_user_members (entity_id, user_id)
    on delete set null
);

create table if not exists public.line_webhook_events (
  event_id uuid primary key default gen_random_uuid(),
  line_event_id text not null unique,
  line_user_id text,
  entity_id uuid references public.company_entities (entity_id) on delete set null,
  event_type text,
  raw_payload jsonb not null default '{}'::jsonb,
  signature_valid boolean not null default false,
  processed boolean not null default false,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.line_message_logs (
  message_id uuid primary key default gen_random_uuid(),
  line_user_id text not null,
  entity_id uuid references public.company_entities (entity_id) on delete set null,
  direction text not null check (direction in ('inbound', 'outbound')),
  channel text not null default 'line',
  request_id uuid,
  content_text text,
  status text,
  created_at timestamptz not null default now()
);

create index if not exists idx_line_user_links_line_user_id
  on public.line_user_links (line_user_id);

create index if not exists idx_line_user_links_user_id
  on public.line_user_links (user_id);

create index if not exists idx_line_user_links_entity_status
  on public.line_user_links (entity_id, status);

create index if not exists idx_line_user_links_linked_at
  on public.line_user_links (linked_at desc nulls last);

create unique index if not exists uq_line_user_links_active_line_user
  on public.line_user_links (line_user_id)
  where status = 'active';

create unique index if not exists uq_line_user_links_active_user
  on public.line_user_links (user_id)
  where status = 'active';

create index if not exists idx_line_link_tokens_line_user_created_at
  on public.line_link_tokens (line_user_id, created_at desc);

create index if not exists idx_line_link_tokens_status_expires_at
  on public.line_link_tokens (status, expires_at);

create index if not exists idx_line_webhook_events_line_user_created_at
  on public.line_webhook_events (line_user_id, created_at desc);

create index if not exists idx_line_webhook_events_entity_created_at
  on public.line_webhook_events (entity_id, created_at desc);

create index if not exists idx_line_webhook_events_created_at
  on public.line_webhook_events (created_at desc);

create index if not exists idx_line_message_logs_line_user_created_at
  on public.line_message_logs (line_user_id, created_at desc);

create index if not exists idx_line_message_logs_entity_created_at
  on public.line_message_logs (entity_id, created_at desc);

create index if not exists idx_line_message_logs_request_id
  on public.line_message_logs (request_id);

create or replace function public.enforce_line_user_link_member_active()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'active' and not exists (
    select 1
    from public.company_user_members as m
    where
      m.entity_id = new.entity_id
      and m.user_id = new.user_id
      and m.is_active
  ) then
    raise exception
      using
        message = 'line_user_link_membership_inactive',
        detail = 'Active LINE link requires an active company_user_members row.';
  end if;

  if new.status = 'active' and new.linked_at is null then
    new.linked_at = now();
  end if;

  if new.status in ('revoked', 'terminated') and new.revoked_at is null then
    new.revoked_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_line_user_links_enforce_active_member on public.line_user_links;
create trigger trg_line_user_links_enforce_active_member
before insert or update of status, entity_id, user_id on public.line_user_links
for each row
execute function public.enforce_line_user_link_member_active();

drop trigger if exists trg_line_user_links_updated_at on public.line_user_links;
create trigger trg_line_user_links_updated_at
before update on public.line_user_links
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists trg_line_link_tokens_updated_at on public.line_link_tokens;
create trigger trg_line_link_tokens_updated_at
before update on public.line_link_tokens
for each row
execute function public.set_updated_at_timestamp();

alter table public.line_user_links enable row level security;
alter table public.line_link_tokens enable row level security;
alter table public.line_webhook_events enable row level security;
alter table public.line_message_logs enable row level security;

drop policy if exists line_user_links_select_self_or_entity_admin on public.line_user_links;
create policy line_user_links_select_self_or_entity_admin
on public.line_user_links
for select
to authenticated
using (
  auth.uid() = user_id
  or private.current_user_is_entity_admin(entity_id)
);

drop policy if exists line_user_links_insert_self_member on public.line_user_links;
create policy line_user_links_insert_self_member
on public.line_user_links
for insert
to authenticated
with check (
  auth.uid() = user_id
  and private.current_user_is_member(entity_id)
);

drop policy if exists line_user_links_update_self_or_entity_admin on public.line_user_links;
create policy line_user_links_update_self_or_entity_admin
on public.line_user_links
for update
to authenticated
using (
  auth.uid() = user_id
  or private.current_user_is_entity_admin(entity_id)
)
with check (
  (
    auth.uid() = user_id
    and private.current_user_is_member(entity_id)
  )
  or private.current_user_is_entity_admin(entity_id)
);

drop policy if exists line_user_links_delete_entity_admin on public.line_user_links;
create policy line_user_links_delete_entity_admin
on public.line_user_links
for delete
to authenticated
using (private.current_user_is_entity_admin(entity_id));

drop policy if exists line_webhook_events_select_member on public.line_webhook_events;
create policy line_webhook_events_select_member
on public.line_webhook_events
for select
to authenticated
using (
  entity_id is not null
  and private.current_user_is_member(entity_id)
);

drop policy if exists line_message_logs_select_member on public.line_message_logs;
create policy line_message_logs_select_member
on public.line_message_logs
for select
to authenticated
using (
  entity_id is not null
  and private.current_user_is_member(entity_id)
);

revoke all on public.line_user_links from anon;
revoke all on public.line_link_tokens from anon;
revoke all on public.line_webhook_events from anon;
revoke all on public.line_message_logs from anon;

revoke all on public.line_link_tokens from authenticated;
revoke all on public.line_webhook_events from authenticated;
revoke all on public.line_message_logs from authenticated;

grant select, insert, update, delete on public.line_user_links to authenticated;
grant select on public.line_webhook_events to authenticated;
grant select on public.line_message_logs to authenticated;
