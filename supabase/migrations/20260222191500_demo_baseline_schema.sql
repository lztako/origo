-- Demo baseline schema for a fresh Supabase project.
-- This migration is meant for isolated demo environments where historical
-- production bootstrap migrations are marked as applied.

create extension if not exists pgcrypto;

create table if not exists public.operation_contracts (
  contract_id text primary key,
  customer text,
  contractdate date,
  type text,
  year integer
);

create table if not exists public.operation_lines (
  line_id uuid primary key default gen_random_uuid(),
  contract_id text not null references public.operation_contracts(contract_id) on delete cascade,
  job text,
  product text,
  price numeric,
  ton numeric,
  acc numeric default 0,
  team text,
  date_from date,
  date_to date,
  extra_fields jsonb,
  status text
);

create table if not exists public.operation_deliveries (
  delivery_id uuid primary key default gen_random_uuid(),
  contract_id text not null references public.operation_contracts(contract_id) on delete cascade,
  job text,
  delivery_date date,
  record text,
  quantity numeric,
  remark text
);

create table if not exists public.operation_stock (
  stock_id uuid primary key default gen_random_uuid(),
  factory text,
  qty numeric,
  tag text,
  type text,
  site_type text not null default 'Factory'
    check (site_type in ('Factory', 'Warehouse'))
);

create table if not exists public.finance_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice text,
  tons numeric,
  total_invoice numeric,
  usd numeric,
  contact boolean,
  credit boolean,
  export boolean,
  team text,
  thb numeric,
  booking_no text,
  contract text,
  convert_date date,
  convert_rate numeric,
  customer_name text,
  fac text,
  invoice_date date,
  price numeric,
  status_type text,
  status_detail text
);

create table if not exists public.companies (
  company_id uuid primary key default gen_random_uuid(),
  customer text not null,
  location text,
  trades integer,
  supplier_number integer,
  value_tag text,
  latest_purchase_time date,
  status text default 'yellow',
  created_at timestamptz default now(),
  product_description text
);

create table if not exists public.company_overview (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id) on delete cascade,
  company_introduction text,
  business_overview text,
  employee_size integer,
  procurement_overview text,
  total_purchase_value numeric,
  purchase_value_last_12m numeric,
  purchase_frequency_per_year integer,
  latest_purchase_date date,
  purchase_interval_days integer,
  is_active boolean,
  trade_start_date date,
  trade_end_date date,
  core_products text[],
  core_supplier_countries text[],
  core_suppliers text[],
  recent_trends numeric,
  purchasing_trend numeric,
  purchase_stability text,
  purchase_activity text,
  indicator_review text,
  procurement_structure text,
  updated_at timestamptz default now()
);

create table if not exists public.company_info (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id) on delete cascade,
  name_standard text,
  name_en text,
  location text,
  website text,
  operating_status text,
  address text,
  organization_type text,
  zip_code text,
  founded text,
  employees text,
  duty_paragraph text,
  country_id_no text,
  vat text,
  legal_entity_code text,
  company_profile text,
  created_at timestamptz default now(),
  linkedin text
);

create table if not exists public.company_email (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id) on delete cascade,
  email text,
  created_at timestamptz default now(),
  importance text,
  source_description text,
  source text
);

create table if not exists public.company_contract (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id) on delete cascade,
  tel text,
  fax text,
  whatsapp text,
  linkedin text,
  twitter text,
  instagram text,
  facebook text,
  created_at timestamptz default now(),
  contact_name text,
  position text,
  department text,
  employment_date text,
  business_email text,
  social_media text,
  region text,
  supplement_email_1 text
);

create table if not exists public.company_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id) on delete cascade,
  "date" date,
  importer text,
  exporter text,
  hs_code text,
  product text,
  product_description text,
  origin_country text,
  destination_country text,
  total_price_usd numeric,
  weight_kg numeric,
  quantity numeric,
  unit_price_usd_kg numeric,
  unit_price_usd_qty numeric,
  quantity_unit text,
  created_at timestamptz default now()
);

create table if not exists public.company_supplychain (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(company_id) on delete cascade,
  exporter text,
  trades_sum integer,
  trade_frequency_ratio numeric,
  kg_weight numeric,
  weight_ratio numeric,
  quantity numeric,
  quantity_ratio numeric,
  total_price_usd numeric,
  total_price_ratio numeric,
  created_at timestamptz default now(),
  snapshot_id text not null default 'initial'
);

create table if not exists public.market_status_definitions (
  status_code text primary key,
  label_th text,
  label_en text,
  is_customer boolean not null default false,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sugar_products (
  id integer generated by default as identity primary key,
  ref_no varchar,
  spec_date date,
  brand varchar,
  product_name_en varchar,
  product_name_th varchar,
  appearance varchar,
  method_of_production varchar,
  color_icumsa varchar,
  polarization_z varchar,
  net_wt text,
  country_of_origin varchar
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'New chat',
  universe text not null default 'internal' check (universe in ('market', 'internal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_telemetry_events (
  event_id uuid primary key default gen_random_uuid(),
  request_id uuid not null default gen_random_uuid(),
  user_id uuid,
  entity_id uuid,
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
  created_at timestamptz not null default now()
);

create or replace function public.touch_ai_conversation_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.bump_ai_conversation_last_message_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.ai_conversations
  set
    last_message_at = now(),
    updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_ai_conversations_touch_updated_at on public.ai_conversations;
create trigger trg_ai_conversations_touch_updated_at
before update on public.ai_conversations
for each row
execute function public.touch_ai_conversation_updated_at();

drop trigger if exists trg_ai_messages_bump_conversation on public.ai_messages;
create trigger trg_ai_messages_bump_conversation
after insert on public.ai_messages
for each row
execute function public.bump_ai_conversation_last_message_at();

create index if not exists idx_company_history_company_date
  on public.company_history (company_id, "date" desc);

create index if not exists idx_operation_lines_contract
  on public.operation_lines (contract_id);

create index if not exists idx_operation_deliveries_contract
  on public.operation_deliveries (contract_id);

create index if not exists idx_finance_invoices_invoice_date
  on public.finance_invoices (invoice_date desc);

create index if not exists idx_ai_messages_conversation_created_at
  on public.ai_messages (conversation_id, created_at);

revoke all on public.operation_contracts from anon;
revoke all on public.operation_lines from anon;
revoke all on public.operation_deliveries from anon;
revoke all on public.operation_stock from anon;
revoke all on public.finance_invoices from anon;
revoke all on public.companies from anon;
revoke all on public.company_overview from anon;
revoke all on public.company_info from anon;
revoke all on public.company_email from anon;
revoke all on public.company_contract from anon;
revoke all on public.company_history from anon;
revoke all on public.company_supplychain from anon;
revoke all on public.market_status_definitions from anon;
revoke all on public.sugar_products from anon;
revoke all on public.ai_conversations from anon;
revoke all on public.ai_messages from anon;
revoke all on public.ai_telemetry_events from anon;

grant select on public.operation_contracts to authenticated;
grant select on public.operation_lines to authenticated;
grant select on public.operation_deliveries to authenticated;
grant select on public.operation_stock to authenticated;
grant select on public.finance_invoices to authenticated;
grant select on public.companies to authenticated;
grant select on public.company_overview to authenticated;
grant select on public.company_info to authenticated;
grant select on public.company_email to authenticated;
grant select on public.company_contract to authenticated;
grant select on public.company_history to authenticated;
grant select on public.company_supplychain to authenticated;
grant select on public.market_status_definitions to authenticated;
grant select on public.sugar_products to authenticated;

grant select, insert, update, delete on public.ai_conversations to authenticated;
grant select, insert, update, delete on public.ai_messages to authenticated;
grant insert on public.ai_telemetry_events to authenticated;
