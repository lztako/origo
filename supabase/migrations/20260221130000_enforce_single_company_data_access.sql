-- Scope data access to mapped company entity membership.
-- This migration assumes the current dataset belongs to one company entity.

create or replace function private.current_user_has_mapped_source(
  p_source_domain text,
  p_source_table text,
  p_source_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_entity_map as cem
    join public.company_user_members as m
      on m.entity_id = cem.entity_id
    where
      cem.source_domain = p_source_domain
      and cem.source_table = p_source_table
      and cem.source_key = p_source_key
      and m.user_id = auth.uid()
      and m.is_active
  );
$$;

revoke all on function private.current_user_has_mapped_source(text, text, text) from public;
grant execute on function private.current_user_has_mapped_source(text, text, text) to authenticated, service_role;

do $$
declare
  v_entity_id uuid;
  v_owner_user_id uuid;
begin
  select e.entity_id
  into v_entity_id
  from public.company_entities as e
  order by e.created_at asc, e.entity_id asc
  limit 1;

  if v_entity_id is null then
    raise exception
      using
        message = 'No company_entities row found for backfill mapping',
        hint = 'Create at least one company_entities record before running this migration.';
  end if;

  select m.user_id
  into v_owner_user_id
  from public.company_user_members as m
  where m.entity_id = v_entity_id
  order by
    case m.role when 'owner' then 0 when 'admin' then 1 else 2 end,
    m.created_at asc
  limit 1;

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
  select
    v_entity_id,
    'market',
    'companies',
    c.company_id::text,
    c.company_id,
    1.0000,
    'verified',
    false,
    v_owner_user_id,
    'Auto backfill for single-company access model'
  from public.companies as c
  on conflict (source_domain, source_table, source_key) do update
  set
    entity_id = excluded.entity_id,
    market_company_id = excluded.market_company_id,
    confidence = excluded.confidence,
    verification_status = excluded.verification_status,
    created_by = excluded.created_by,
    note = excluded.note,
    updated_at = now();

  insert into public.company_entity_map (
    entity_id,
    source_domain,
    source_table,
    source_key,
    confidence,
    verification_status,
    is_primary,
    created_by,
    note
  )
  select
    v_entity_id,
    'operation',
    'operation_contracts',
    oc.contract_id,
    1.0000,
    'verified',
    false,
    v_owner_user_id,
    'Auto backfill for single-company access model'
  from public.operation_contracts as oc
  on conflict (source_domain, source_table, source_key) do update
  set
    entity_id = excluded.entity_id,
    confidence = excluded.confidence,
    verification_status = excluded.verification_status,
    created_by = excluded.created_by,
    note = excluded.note,
    updated_at = now();

  insert into public.company_entity_map (
    entity_id,
    source_domain,
    source_table,
    source_key,
    confidence,
    verification_status,
    is_primary,
    created_by,
    note
  )
  select
    v_entity_id,
    'operation',
    'operation_lines',
    ol.line_id::text,
    1.0000,
    'verified',
    false,
    v_owner_user_id,
    'Auto backfill for single-company access model'
  from public.operation_lines as ol
  on conflict (source_domain, source_table, source_key) do update
  set
    entity_id = excluded.entity_id,
    confidence = excluded.confidence,
    verification_status = excluded.verification_status,
    created_by = excluded.created_by,
    note = excluded.note,
    updated_at = now();

  insert into public.company_entity_map (
    entity_id,
    source_domain,
    source_table,
    source_key,
    confidence,
    verification_status,
    is_primary,
    created_by,
    note
  )
  select
    v_entity_id,
    'operation',
    'operation_deliveries',
    od.delivery_id::text,
    1.0000,
    'verified',
    false,
    v_owner_user_id,
    'Auto backfill for single-company access model'
  from public.operation_deliveries as od
  on conflict (source_domain, source_table, source_key) do update
  set
    entity_id = excluded.entity_id,
    confidence = excluded.confidence,
    verification_status = excluded.verification_status,
    created_by = excluded.created_by,
    note = excluded.note,
    updated_at = now();

  insert into public.company_entity_map (
    entity_id,
    source_domain,
    source_table,
    source_key,
    confidence,
    verification_status,
    is_primary,
    created_by,
    note
  )
  select
    v_entity_id,
    'operation',
    'operation_stock',
    os.stock_id::text,
    1.0000,
    'verified',
    false,
    v_owner_user_id,
    'Auto backfill for single-company access model'
  from public.operation_stock as os
  on conflict (source_domain, source_table, source_key) do update
  set
    entity_id = excluded.entity_id,
    confidence = excluded.confidence,
    verification_status = excluded.verification_status,
    created_by = excluded.created_by,
    note = excluded.note,
    updated_at = now();

  insert into public.company_entity_map (
    entity_id,
    source_domain,
    source_table,
    source_key,
    confidence,
    verification_status,
    is_primary,
    created_by,
    note
  )
  select
    v_entity_id,
    'finance',
    'finance_invoices',
    fi.id::text,
    1.0000,
    'verified',
    false,
    v_owner_user_id,
    'Auto backfill for single-company access model'
  from public.finance_invoices as fi
  on conflict (source_domain, source_table, source_key) do update
  set
    entity_id = excluded.entity_id,
    confidence = excluded.confidence,
    verification_status = excluded.verification_status,
    created_by = excluded.created_by,
    note = excluded.note,
    updated_at = now();
end
$$;

alter table public.companies enable row level security;
alter table public.company_overview enable row level security;
alter table public.company_info enable row level security;
alter table public.company_email enable row level security;
alter table public.company_contract enable row level security;
alter table public.company_supplychain enable row level security;
alter table public.company_history enable row level security;
alter table public.operation_contracts enable row level security;
alter table public.operation_lines enable row level security;
alter table public.operation_deliveries enable row level security;
alter table public.operation_stock enable row level security;
alter table public.finance_invoices enable row level security;

drop policy if exists companies_select_member_scoped on public.companies;
create policy companies_select_member_scoped
on public.companies
for select
to authenticated
using (private.current_user_has_mapped_source('market', 'companies', company_id::text));

drop policy if exists company_overview_select_member_scoped on public.company_overview;
create policy company_overview_select_member_scoped
on public.company_overview
for select
to authenticated
using (private.current_user_has_mapped_source('market', 'companies', company_id::text));

drop policy if exists company_info_select_member_scoped on public.company_info;
create policy company_info_select_member_scoped
on public.company_info
for select
to authenticated
using (private.current_user_has_mapped_source('market', 'companies', company_id::text));

drop policy if exists company_email_select_member_scoped on public.company_email;
create policy company_email_select_member_scoped
on public.company_email
for select
to authenticated
using (private.current_user_has_mapped_source('market', 'companies', company_id::text));

drop policy if exists company_contract_select_member_scoped on public.company_contract;
create policy company_contract_select_member_scoped
on public.company_contract
for select
to authenticated
using (private.current_user_has_mapped_source('market', 'companies', company_id::text));

drop policy if exists company_supplychain_select_member_scoped on public.company_supplychain;
create policy company_supplychain_select_member_scoped
on public.company_supplychain
for select
to authenticated
using (private.current_user_has_mapped_source('market', 'companies', company_id::text));

drop policy if exists company_history_select_member_scoped on public.company_history;
create policy company_history_select_member_scoped
on public.company_history
for select
to authenticated
using (private.current_user_has_mapped_source('market', 'companies', company_id::text));

drop policy if exists operation_contracts_select_member_scoped on public.operation_contracts;
create policy operation_contracts_select_member_scoped
on public.operation_contracts
for select
to authenticated
using (private.current_user_has_mapped_source('operation', 'operation_contracts', contract_id));

drop policy if exists operation_lines_select_member_scoped on public.operation_lines;
create policy operation_lines_select_member_scoped
on public.operation_lines
for select
to authenticated
using (private.current_user_has_mapped_source('operation', 'operation_lines', line_id::text));

drop policy if exists operation_deliveries_select_member_scoped on public.operation_deliveries;
create policy operation_deliveries_select_member_scoped
on public.operation_deliveries
for select
to authenticated
using (private.current_user_has_mapped_source('operation', 'operation_deliveries', delivery_id::text));

drop policy if exists operation_stock_select_member_scoped on public.operation_stock;
create policy operation_stock_select_member_scoped
on public.operation_stock
for select
to authenticated
using (private.current_user_has_mapped_source('operation', 'operation_stock', stock_id::text));

drop policy if exists finance_invoices_select_member_scoped on public.finance_invoices;
create policy finance_invoices_select_member_scoped
on public.finance_invoices
for select
to authenticated
using (private.current_user_has_mapped_source('finance', 'finance_invoices', id::text));

revoke all on public.companies from anon;
revoke all on public.company_overview from anon;
revoke all on public.company_info from anon;
revoke all on public.company_email from anon;
revoke all on public.company_contract from anon;
revoke all on public.company_supplychain from anon;
revoke all on public.company_history from anon;
revoke all on public.operation_contracts from anon;
revoke all on public.operation_lines from anon;
revoke all on public.operation_deliveries from anon;
revoke all on public.operation_stock from anon;
revoke all on public.finance_invoices from anon;

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
