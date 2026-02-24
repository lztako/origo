-- Compatibility bootstrap for demo projects missing identity-layer primitives.

create extension if not exists pgcrypto;
create schema if not exists private;

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.company_entities (
  entity_id uuid primary key default gen_random_uuid(),
  company_name text not null,
  company_code text,
  company_status text not null default 'active'
    check (company_status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_company_entities_company_code
  on public.company_entities (company_code)
  where company_code is not null;

create table if not exists public.company_user_members (
  entity_id uuid not null references public.company_entities(entity_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer'
    check (role in ('owner', 'admin', 'manager', 'analyst', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (entity_id, user_id)
);

create index if not exists idx_company_user_members_user_id
  on public.company_user_members (user_id);

create index if not exists idx_company_user_members_entity_role
  on public.company_user_members (entity_id, role);

create table if not exists public.company_entity_map (
  map_id bigint generated always as identity primary key,
  entity_id uuid not null references public.company_entities(entity_id) on delete cascade,
  source_domain text not null
    check (source_domain in ('market', 'operation', 'finance')),
  source_table text not null
    check (source_table in (
      'companies',
      'operation_contracts',
      'operation_lines',
      'operation_deliveries',
      'operation_stock',
      'finance_invoices'
    )),
  source_key text not null,
  market_company_id uuid references public.companies(company_id) on delete set null,
  confidence numeric(5, 4) not null default 1.0000
    check (confidence >= 0 and confidence <= 1),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'rejected')),
  is_primary boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_domain, source_table, source_key)
);

create index if not exists idx_company_entity_map_entity_id
  on public.company_entity_map (entity_id);

create index if not exists idx_company_entity_map_market_company_id
  on public.company_entity_map (market_company_id);

create unique index if not exists uq_company_entity_map_primary_per_source
  on public.company_entity_map (entity_id, source_domain, source_table)
  where is_primary;

drop trigger if exists trg_company_entities_updated_at on public.company_entities;
create trigger trg_company_entities_updated_at
before update on public.company_entities
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists trg_company_user_members_updated_at on public.company_user_members;
create trigger trg_company_user_members_updated_at
before update on public.company_user_members
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists trg_company_entity_map_updated_at on public.company_entity_map;
create trigger trg_company_entity_map_updated_at
before update on public.company_entity_map
for each row
execute function public.set_updated_at_timestamp();

create or replace function private.current_user_is_member(p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_user_members as m
    where
      m.entity_id = p_entity_id
      and m.user_id = auth.uid()
      and m.is_active
  );
$$;

create or replace function private.current_user_is_entity_admin(p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_user_members as m
    where
      m.entity_id = p_entity_id
      and m.user_id = auth.uid()
      and m.is_active
      and m.role in ('owner', 'admin')
  );
$$;

revoke all on function private.current_user_is_member(uuid) from public;
revoke all on function private.current_user_is_entity_admin(uuid) from public;
grant execute on function private.current_user_is_member(uuid) to authenticated, service_role;
grant execute on function private.current_user_is_entity_admin(uuid) to authenticated, service_role;

alter table public.company_entities enable row level security;
alter table public.company_user_members enable row level security;
alter table public.company_entity_map enable row level security;

drop policy if exists company_entities_select_member on public.company_entities;
create policy company_entities_select_member
on public.company_entities
for select
to authenticated
using (private.current_user_is_member(entity_id));

drop policy if exists company_entities_insert_authenticated on public.company_entities;
create policy company_entities_insert_authenticated
on public.company_entities
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists company_entities_update_admin on public.company_entities;
create policy company_entities_update_admin
on public.company_entities
for update
to authenticated
using (private.current_user_is_entity_admin(entity_id))
with check (private.current_user_is_entity_admin(entity_id));

drop policy if exists company_user_members_select_self_or_admin on public.company_user_members;
create policy company_user_members_select_self_or_admin
on public.company_user_members
for select
to authenticated
using (
  auth.uid() = user_id
  or private.current_user_is_entity_admin(entity_id)
);

drop policy if exists company_user_members_insert_admin on public.company_user_members;
create policy company_user_members_insert_admin
on public.company_user_members
for insert
to authenticated
with check (private.current_user_is_entity_admin(entity_id));

drop policy if exists company_user_members_update_admin on public.company_user_members;
create policy company_user_members_update_admin
on public.company_user_members
for update
to authenticated
using (private.current_user_is_entity_admin(entity_id))
with check (private.current_user_is_entity_admin(entity_id));

drop policy if exists company_user_members_delete_admin on public.company_user_members;
create policy company_user_members_delete_admin
on public.company_user_members
for delete
to authenticated
using (private.current_user_is_entity_admin(entity_id));

drop policy if exists company_entity_map_select_member on public.company_entity_map;
create policy company_entity_map_select_member
on public.company_entity_map
for select
to authenticated
using (private.current_user_is_member(entity_id));

drop policy if exists company_entity_map_insert_admin on public.company_entity_map;
create policy company_entity_map_insert_admin
on public.company_entity_map
for insert
to authenticated
with check (private.current_user_is_entity_admin(entity_id));

drop policy if exists company_entity_map_update_admin on public.company_entity_map;
create policy company_entity_map_update_admin
on public.company_entity_map
for update
to authenticated
using (private.current_user_is_entity_admin(entity_id))
with check (private.current_user_is_entity_admin(entity_id));

drop policy if exists company_entity_map_delete_admin on public.company_entity_map;
create policy company_entity_map_delete_admin
on public.company_entity_map
for delete
to authenticated
using (private.current_user_is_entity_admin(entity_id));

revoke all on public.company_entities from anon;
revoke all on public.company_user_members from anon;
revoke all on public.company_entity_map from anon;

grant select, insert, update on public.company_entities to authenticated;
grant select, insert, update, delete on public.company_user_members to authenticated;
grant select, insert, update, delete on public.company_entity_map to authenticated;
