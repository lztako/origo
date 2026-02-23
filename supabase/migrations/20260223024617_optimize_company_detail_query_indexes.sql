-- Optimize query paths used by company-detail page.
-- Safe guards: create only when target tables/columns exist.

do $$
begin
  -- company_history: used by eq(company_id) + order(date desc)
  if to_regclass('public.company_history') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'company_history'
         and column_name = 'company_id'
     )
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'company_history'
         and column_name = 'date'
     ) then
    execute 'create index if not exists idx_company_history_company_date on public.company_history (company_id, "date" desc)';
  end if;

  -- company_supplychain: used by eq(company_id) + order(total_price_usd desc)
  if to_regclass('public.company_supplychain') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'company_supplychain'
         and column_name = 'company_id'
     )
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'company_supplychain'
         and column_name = 'total_price_usd'
     ) then
    execute 'create index if not exists idx_company_supplychain_company_total_price_desc on public.company_supplychain (company_id, total_price_usd desc)';
  end if;

  -- company_detail landing queries: eq(company_id) on supporting tables
  if to_regclass('public.company_overview') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'company_overview'
         and column_name = 'company_id'
     ) then
    execute 'create index if not exists idx_company_overview_company_id on public.company_overview (company_id)';
  end if;

  if to_regclass('public.company_info') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'company_info'
         and column_name = 'company_id'
     ) then
    execute 'create index if not exists idx_company_info_company_id on public.company_info (company_id)';
  end if;

  if to_regclass('public.company_email') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'company_email'
         and column_name = 'company_id'
     ) then
    execute 'create index if not exists idx_company_email_company_id on public.company_email (company_id)';
  end if;

  if to_regclass('public.company_contract') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'company_contract'
         and column_name = 'company_id'
     ) then
    execute 'create index if not exists idx_company_contract_company_id on public.company_contract (company_id)';
  end if;
end
$$;
