-- UAT Access Checks: 1 user = 1 company
-- Run in Supabase SQL Editor (service role session).
-- Replace all placeholder UUIDs below before running.
--
-- <ENTITY_ID_UUID>      = target company_entities.entity_id
-- <MEMBER_USER_UUID>    = user that is active member of target entity
-- <NON_MEMBER_USER_UUID>= user with no membership in target entity

-- 1) Mapping coverage by entity (sanity check)
with source_counts as (
  select 'market'::text as source_domain, 'companies'::text as source_table, count(*)::bigint as source_rows from public.companies
  union all select 'operation', 'operation_contracts', count(*) from public.operation_contracts
  union all select 'operation', 'operation_lines', count(*) from public.operation_lines
  union all select 'operation', 'operation_deliveries', count(*) from public.operation_deliveries
  union all select 'operation', 'operation_stock', count(*) from public.operation_stock
  union all select 'finance', 'finance_invoices', count(*) from public.finance_invoices
),
mapped_counts as (
  select cem.source_domain, cem.source_table, count(*)::bigint as mapped_rows
  from public.company_entity_map as cem
  where cem.entity_id = '<ENTITY_ID_UUID>'::uuid
  group by cem.source_domain, cem.source_table
)
select
  s.source_domain,
  s.source_table,
  s.source_rows,
  coalesce(m.mapped_rows, 0) as mapped_rows_for_entity,
  (s.source_rows - coalesce(m.mapped_rows, 0)) as gap
from source_counts as s
left join mapped_counts as m
  on m.source_domain = s.source_domain
 and m.source_table = s.source_table
order by s.source_domain, s.source_table;

-- 2) RLS read checks as member user (should return data if entity has data)
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '<MEMBER_USER_UUID>', true);

select 'companies' as table_name, count(*)::bigint as visible_rows from public.companies
union all select 'company_user_members', count(*) from public.company_user_members
union all select 'company_overview', count(*) from public.company_overview
union all select 'company_info', count(*) from public.company_info
union all select 'company_email', count(*) from public.company_email
union all select 'company_contract', count(*) from public.company_contract
union all select 'company_supplychain', count(*) from public.company_supplychain
union all select 'company_history', count(*) from public.company_history
union all select 'operation_contracts', count(*) from public.operation_contracts
union all select 'operation_lines', count(*) from public.operation_lines
union all select 'operation_deliveries', count(*) from public.operation_deliveries
union all select 'operation_stock', count(*) from public.operation_stock
union all select 'finance_invoices', count(*) from public.finance_invoices
union all select 'sugar_products', count(*) from public.sugar_products
union all select 'product_catalog_listing_sandbox', count(*) from public.product_catalog_listing_sandbox
order by table_name;
rollback;

-- 3) RLS read checks as non-member user (expected: entity_id NULL, and 0 rows in scoped tables)
begin;
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '<NON_MEMBER_USER_UUID>', true);

select 'companies' as table_name, count(*)::bigint as visible_rows from public.companies
union all select 'company_user_members', count(*) from public.company_user_members
union all select 'company_overview', count(*) from public.company_overview
union all select 'company_info', count(*) from public.company_info
union all select 'company_email', count(*) from public.company_email
union all select 'company_contract', count(*) from public.company_contract
union all select 'company_supplychain', count(*) from public.company_supplychain
union all select 'company_history', count(*) from public.company_history
union all select 'operation_contracts', count(*) from public.operation_contracts
union all select 'operation_lines', count(*) from public.operation_lines
union all select 'operation_deliveries', count(*) from public.operation_deliveries
union all select 'operation_stock', count(*) from public.operation_stock
union all select 'finance_invoices', count(*) from public.finance_invoices
union all select 'sugar_products', count(*) from public.sugar_products
union all select 'product_catalog_listing_sandbox', count(*) from public.product_catalog_listing_sandbox
order by table_name;
rollback;

-- 4) Optional negative test (run manually, expected: RLS error for non-member)
-- begin;
-- set local role authenticated;
-- select set_config('request.jwt.claim.role', 'authenticated', true);
-- select set_config('request.jwt.claim.sub', '<NON_MEMBER_USER_UUID>', true);
-- insert into public.ai_conversations (title, universe) values ('RLS probe', 'internal');
-- rollback;
