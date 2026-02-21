-- Security hardening:
-- 1) Lock down AI chat tables with tenant-aware RLS.
-- 2) Reduce broad grants on scoped domain tables.
-- 3) Auto-create mapping rows for newly inserted domain records by authenticated users.

create or replace function private.current_user_entity_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.entity_id
  from public.company_user_members as m
  where
    m.user_id = auth.uid()
    and m.is_active
  limit 1;
$$;

revoke all on function private.current_user_entity_id() from public;
grant execute on function private.current_user_entity_id() to authenticated, service_role;

alter table public.ai_conversations
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists entity_id uuid references public.company_entities(entity_id) on delete set null;

alter table public.ai_conversations
  alter column owner_user_id set default auth.uid(),
  alter column entity_id set default private.current_user_entity_id();

update public.ai_conversations as c
set
  owner_user_id = coalesce(c.owner_user_id, m.user_id),
  entity_id = coalesce(c.entity_id, m.entity_id),
  updated_at = now()
from (
  select user_id, entity_id
  from public.company_user_members
  order by created_at asc
  limit 1
) as m
where c.owner_user_id is null or c.entity_id is null;

update public.ai_conversations as c
set
  entity_id = m.entity_id,
  updated_at = now()
from public.company_user_members as m
where
  c.owner_user_id = m.user_id
  and m.is_active
  and c.entity_id is distinct from m.entity_id;

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

drop policy if exists ai_conversations_select_owner on public.ai_conversations;
create policy ai_conversations_select_owner
on public.ai_conversations
for select
to authenticated
using (
  owner_user_id = auth.uid()
  and entity_id is not null
  and private.current_user_is_member(entity_id)
);

drop policy if exists ai_conversations_insert_owner on public.ai_conversations;
create policy ai_conversations_insert_owner
on public.ai_conversations
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and entity_id = private.current_user_entity_id()
);

drop policy if exists ai_conversations_update_owner on public.ai_conversations;
create policy ai_conversations_update_owner
on public.ai_conversations
for update
to authenticated
using (
  owner_user_id = auth.uid()
  and entity_id is not null
  and private.current_user_is_member(entity_id)
)
with check (
  owner_user_id = auth.uid()
  and entity_id = private.current_user_entity_id()
);

drop policy if exists ai_conversations_delete_owner on public.ai_conversations;
create policy ai_conversations_delete_owner
on public.ai_conversations
for delete
to authenticated
using (
  owner_user_id = auth.uid()
  and entity_id is not null
  and private.current_user_is_member(entity_id)
);

drop policy if exists ai_messages_select_owner_conversation on public.ai_messages;
create policy ai_messages_select_owner_conversation
on public.ai_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.ai_conversations as c
    where
      c.id = ai_messages.conversation_id
      and c.owner_user_id = auth.uid()
      and c.entity_id is not null
      and private.current_user_is_member(c.entity_id)
  )
);

drop policy if exists ai_messages_insert_owner_conversation on public.ai_messages;
create policy ai_messages_insert_owner_conversation
on public.ai_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ai_conversations as c
    where
      c.id = ai_messages.conversation_id
      and c.owner_user_id = auth.uid()
      and c.entity_id = private.current_user_entity_id()
  )
);

drop policy if exists ai_messages_update_owner_conversation on public.ai_messages;
create policy ai_messages_update_owner_conversation
on public.ai_messages
for update
to authenticated
using (
  exists (
    select 1
    from public.ai_conversations as c
    where
      c.id = ai_messages.conversation_id
      and c.owner_user_id = auth.uid()
      and c.entity_id is not null
      and private.current_user_is_member(c.entity_id)
  )
)
with check (
  exists (
    select 1
    from public.ai_conversations as c
    where
      c.id = ai_messages.conversation_id
      and c.owner_user_id = auth.uid()
      and c.entity_id = private.current_user_entity_id()
  )
);

drop policy if exists ai_messages_delete_owner_conversation on public.ai_messages;
create policy ai_messages_delete_owner_conversation
on public.ai_messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.ai_conversations as c
    where
      c.id = ai_messages.conversation_id
      and c.owner_user_id = auth.uid()
      and c.entity_id is not null
      and private.current_user_is_member(c.entity_id)
  )
);

revoke all on public.ai_conversations from anon, authenticated;
revoke all on public.ai_messages from anon, authenticated;
grant select, insert, update, delete on public.ai_conversations to authenticated;
grant select, insert, update, delete on public.ai_messages to authenticated;

create or replace function public.map_source_row_to_current_entity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id uuid;
  v_source_domain text;
  v_source_table text;
  v_source_key_column text;
  v_market_company_id_column text;
  v_source_key text;
  v_market_company_id uuid;
begin
  v_source_domain := tg_argv[0];
  v_source_table := tg_argv[1];
  v_source_key_column := tg_argv[2];
  v_market_company_id_column := coalesce(tg_argv[3], '');

  v_entity_id := private.current_user_entity_id();
  if v_entity_id is null then
    return new;
  end if;

  v_source_key := to_jsonb(new) ->> v_source_key_column;
  if v_source_key is null or btrim(v_source_key) = '' then
    return new;
  end if;

  if v_market_company_id_column <> '' then
    v_market_company_id := nullif(to_jsonb(new) ->> v_market_company_id_column, '')::uuid;
  else
    v_market_company_id := null;
  end if;

  insert into public.company_entity_map (
    entity_id,
    source_domain,
    source_table,
    source_key,
    market_company_id,
    confidence,
    verification_status,
    is_primary,
    created_by,
    note
  )
  values (
    v_entity_id,
    v_source_domain,
    v_source_table,
    v_source_key,
    v_market_company_id,
    1.0000,
    'verified',
    false,
    auth.uid(),
    'Auto mapping from trigger'
  )
  on conflict (entity_id, source_domain, source_table, source_key) do update
  set
    market_company_id = excluded.market_company_id,
    confidence = excluded.confidence,
    verification_status = excluded.verification_status,
    created_by = excluded.created_by,
    note = excluded.note,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_map_new_companies_to_entity on public.companies;
create trigger trg_map_new_companies_to_entity
after insert on public.companies
for each row
execute function public.map_source_row_to_current_entity('market', 'companies', 'company_id', 'company_id');

drop trigger if exists trg_map_new_operation_contracts_to_entity on public.operation_contracts;
create trigger trg_map_new_operation_contracts_to_entity
after insert on public.operation_contracts
for each row
execute function public.map_source_row_to_current_entity('operation', 'operation_contracts', 'contract_id');

drop trigger if exists trg_map_new_operation_lines_to_entity on public.operation_lines;
create trigger trg_map_new_operation_lines_to_entity
after insert on public.operation_lines
for each row
execute function public.map_source_row_to_current_entity('operation', 'operation_lines', 'line_id');

drop trigger if exists trg_map_new_operation_deliveries_to_entity on public.operation_deliveries;
create trigger trg_map_new_operation_deliveries_to_entity
after insert on public.operation_deliveries
for each row
execute function public.map_source_row_to_current_entity('operation', 'operation_deliveries', 'delivery_id');

drop trigger if exists trg_map_new_operation_stock_to_entity on public.operation_stock;
create trigger trg_map_new_operation_stock_to_entity
after insert on public.operation_stock
for each row
execute function public.map_source_row_to_current_entity('operation', 'operation_stock', 'stock_id');

drop trigger if exists trg_map_new_finance_invoices_to_entity on public.finance_invoices;
create trigger trg_map_new_finance_invoices_to_entity
after insert on public.finance_invoices
for each row
execute function public.map_source_row_to_current_entity('finance', 'finance_invoices', 'id');

alter table public.market_status_definitions enable row level security;
drop policy if exists market_status_definitions_select_authenticated on public.market_status_definitions;
create policy market_status_definitions_select_authenticated
on public.market_status_definitions
for select
to authenticated
using (true);

revoke all on public.market_status_definitions from anon, authenticated;
grant select on public.market_status_definitions to authenticated;

revoke all on public.companies from authenticated;
revoke all on public.company_overview from authenticated;
revoke all on public.company_info from authenticated;
revoke all on public.company_email from authenticated;
revoke all on public.company_contract from authenticated;
revoke all on public.company_supplychain from authenticated;
revoke all on public.company_history from authenticated;
revoke all on public.operation_contracts from authenticated;
revoke all on public.operation_lines from authenticated;
revoke all on public.operation_deliveries from authenticated;
revoke all on public.operation_stock from authenticated;
revoke all on public.finance_invoices from authenticated;

grant select on public.companies to authenticated;
grant select on public.company_overview to authenticated;
grant select on public.company_info to authenticated;
grant select on public.company_email to authenticated;
grant select on public.company_contract to authenticated;
grant select on public.company_supplychain to authenticated;
grant select on public.company_history to authenticated;
grant select on public.operation_contracts to authenticated;
grant select on public.operation_lines to authenticated;
grant select on public.operation_deliveries to authenticated;
grant select on public.operation_stock to authenticated;
grant select on public.finance_invoices to authenticated;
