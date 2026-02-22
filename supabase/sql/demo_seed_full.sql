-- Full demo seed for Market + Operations + Finance.
-- Run only on an isolated demo Supabase project.
-- Update v_demo_email before execution.

begin;

do $$
declare
  v_non_demo_market bigint;
  v_non_demo_ops bigint;
  v_non_demo_fin bigint;
  v_demo_email text := 'demo@yourcompany.com';
  v_demo_user_id uuid;
begin
  if v_demo_email = '__SET_DEMO_EMAIL__' then
    raise exception 'Please edit v_demo_email in supabase/sql/demo_seed_full.sql first.';
  end if;

  select u.id
  into v_demo_user_id
  from auth.users as u
  where lower(u.email) = lower(v_demo_email)
  order by u.created_at desc
  limit 1;

  if v_demo_user_id is null then
    raise exception 'Demo user % not found in auth.users', v_demo_email;
  end if;

  select count(*) into v_non_demo_market
  from public.companies
  where coalesce(customer, '') !~* '^DEMO ';

  select count(*) into v_non_demo_ops
  from public.operation_contracts
  where coalesce(contract_id, '') !~* '^DEMO-CTR-';

  select count(*) into v_non_demo_fin
  from public.finance_invoices
  where coalesce(invoice, '') !~* '^DEMO-INV-';

  if v_non_demo_market > 0 or v_non_demo_ops > 0 or v_non_demo_fin > 0 then
    raise exception
      using
        message = 'Safety stop: non-DEMO rows detected in business tables.',
        detail = format('companies=%s, operation_contracts=%s, finance_invoices=%s', v_non_demo_market, v_non_demo_ops, v_non_demo_fin),
        hint = 'Use a dedicated demo project.';
  end if;
end
$$;

drop table if exists pg_temp.demo_companies;
create temporary table pg_temp.demo_companies (
  idx integer not null,
  company_id uuid not null,
  company_code text not null,
  customer text not null,
  location text not null,
  status text not null,
  value_tag text not null,
  product_description text not null
) on commit drop;

insert into pg_temp.demo_companies (idx, company_id, company_code, customer, location, status, value_tag, product_description)
values
  (1, '10000000-0000-4000-8000-000000000101', 'AURORA',  'DEMO Aurora Foods PLC',          'Bangkok, Thailand',      'green',  'Tier A', 'Refined cane sugar for beverage and bakery'),
  (2, '10000000-0000-4000-8000-000000000102', 'BANYAN',  'DEMO Banyan Consumer Co.',        'Ho Chi Minh City, VN',   'yellow', 'Tier A', 'Raw sugar and brown sugar for retail packs'),
  (3, '10000000-0000-4000-8000-000000000103', 'CASCADE', 'DEMO Cascade Ingredients Ltd.',   'Manila, Philippines',    'green',  'Tier B', 'Liquid sugar and syrup for food processing'),
  (4, '10000000-0000-4000-8000-000000000104', 'DELTA',   'DEMO Delta Beverage Group',       'Jakarta, Indonesia',     'yellow', 'Tier A', 'High purity refined sugar for beverage bottling'),
  (5, '10000000-0000-4000-8000-000000000105', 'EVER',    'DEMO Evergreen Retail Holdings',  'Kuala Lumpur, Malaysia', 'yellow', 'Tier B', 'Consumer white sugar and brown sugar assortment'),
  (6, '10000000-0000-4000-8000-000000000106', 'FJORD',   'DEMO Fjord Food Systems',         'Singapore',              'green',  'Tier C', 'Specialty sugar for dairy and confectionery'),
  (7, '10000000-0000-4000-8000-000000000107', 'GOLDEN',  'DEMO Golden Grain Industries',    'Phnom Penh, Cambodia',   'yellow', 'Tier B', 'Industrial sugar for starch and snack manufacturing'),
  (8, '10000000-0000-4000-8000-000000000108', 'HORIZON', 'DEMO Horizon Hospitality Supply', 'Chiang Mai, Thailand',   'green',  'Tier C', 'Refined sugar sachets for hospitality');

delete from public.company_email where company_id in (select company_id from pg_temp.demo_companies);
delete from public.company_contract where company_id in (select company_id from pg_temp.demo_companies);
delete from public.company_info where company_id in (select company_id from pg_temp.demo_companies);
delete from public.company_overview where company_id in (select company_id from pg_temp.demo_companies);
delete from public.company_history where company_id in (select company_id from pg_temp.demo_companies);
delete from public.company_supplychain where company_id in (select company_id from pg_temp.demo_companies);
delete from public.companies where company_id in (select company_id from pg_temp.demo_companies);

delete from public.operation_deliveries where contract_id ~ '^DEMO-CTR-';
delete from public.operation_lines where contract_id ~ '^DEMO-CTR-';
delete from public.operation_contracts where contract_id ~ '^DEMO-CTR-';
delete from public.operation_stock where factory ~ '^DEMO ';
delete from public.finance_invoices where coalesce(invoice, '') ~ '^DEMO-INV-';
delete from public.sugar_products where coalesce(ref_no, '') ~ '^DEMO-REF-';
delete from public.market_status_definitions where status_code in ('green', 'yellow');

insert into public.market_status_definitions (status_code, label_th, label_en, is_customer, description, sort_order)
values
  ('green',  'ลูกค้าปัจจุบัน', 'Current customer', true,  'Active customer account in demo', 1),
  ('yellow', 'ลูกค้าเป้าหมาย', 'Prospect',         false, 'Prospect account in demo', 2);

insert into public.companies (
  company_id, customer, location, trades, supplier_number, value_tag, latest_purchase_time, status, product_description
)
select
  company_id,
  customer,
  location,
  0,
  0,
  value_tag,
  current_date - (idx * 3),
  status,
  product_description
from pg_temp.demo_companies;

insert into public.company_overview (
  company_id,
  company_introduction,
  business_overview,
  employee_size,
  procurement_overview,
  total_purchase_value,
  purchase_value_last_12m,
  purchase_frequency_per_year,
  latest_purchase_date,
  purchase_interval_days,
  is_active,
  trade_start_date,
  core_products,
  core_supplier_countries,
  core_suppliers,
  recent_trends,
  purchasing_trend,
  purchase_stability,
  purchase_activity,
  indicator_review,
  procurement_structure
)
select
  c.company_id,
  format('%s is a demo profile for customer showcase.', c.customer),
  'Multi-channel sugar procurement with seasonal demand profile.',
  180 + c.idx * 35,
  'ASEAN + global sourcing with quarterly tenders.',
  0,
  0,
  0,
  current_date - (c.idx * 3),
  30 + c.idx,
  true,
  current_date - 900,
  array[
    case when c.idx % 3 = 0 then 'Sugar Syrup' when c.idx % 2 = 0 then 'Raw Cane Sugar' else 'Refined Sugar' end,
    case when c.idx % 2 = 0 then 'Brown Sugar' else 'Fine White Sugar' end
  ],
  array['Thailand', case when c.idx % 2 = 0 then 'Brazil' else 'India' end],
  array[format('DEMO %s GLOBAL TRADING', c.company_code), format('DEMO %s COMMODITIES', c.company_code)],
  round((7.5 + c.idx * 0.8)::numeric, 2),
  round((4.0 + c.idx * 0.6)::numeric, 2),
  case when c.idx % 2 = 0 then 'Stable with peaks' else 'Moderate volatility' end,
  case when c.idx % 3 = 0 then 'High activity' else 'Steady activity' end,
  'Healthy purchasing pattern with upsell potential.',
  case when c.idx % 2 = 0 then 'Centralized procurement' else 'Hybrid procurement' end
from pg_temp.demo_companies as c;

insert into public.company_info (
  company_id, name_standard, name_en, location, website, operating_status, address, organization_type,
  zip_code, founded, employees, duty_paragraph, country_id_no, vat, legal_entity_code, company_profile, linkedin
)
select
  c.company_id,
  c.customer,
  c.customer,
  c.location,
  format('https://%s.demo.example.com', lower(c.company_code)),
  'Active',
  format('DEMO %s Business Park, %s', c.company_code, c.location),
  case when c.idx % 2 = 0 then 'Private Company' else 'Public Company' end,
  format('10%03s', c.idx),
  (2010 + c.idx)::text,
  (160 + c.idx * 50)::text,
  'Food and beverage ingredient distribution',
  format('DEMO-ID-%s', c.company_code),
  format('DEMO-VAT-%s', c.company_code),
  format('LEI-DEMO-%s', c.company_code),
  format('Demo company profile for %s.', c.customer),
  format('https://linkedin.com/company/demo-%s', lower(c.company_code))
from pg_temp.demo_companies as c;

insert into public.company_email (company_id, email, importance, source, source_description)
select
  c.company_id,
  e.email,
  e.importance,
  'demo-seed',
  'Generated by demo_seed_full.sql'
from pg_temp.demo_companies as c
cross join lateral (
  values
    (format('procurement@%s.demo.example.com', lower(c.company_code)), 'high-high'),
    (format('ops@%s.demo.example.com', lower(c.company_code)), 'medium-high')
) as e(email, importance);

insert into public.company_contract (
  company_id, contact_name, position, department, business_email, tel, whatsapp, social_media, region, supplement_email_1
)
select
  c.company_id,
  x.contact_name,
  x.position,
  x.department,
  x.business_email,
  x.tel,
  x.whatsapp,
  x.social_media,
  'APAC',
  x.supplement_email_1
from pg_temp.demo_companies as c
cross join lateral (
  values
    (
      format('%s Procurement Lead', c.company_code),
      'Procurement Lead',
      'Strategic Sourcing',
      format('lead@%s.demo.example.com', lower(c.company_code)),
      format('+66-2-55%03s-10', c.idx),
      format('+66-81-77%03s', c.idx),
      format('https://linkedin.com/in/demo-%s-lead', lower(c.company_code)),
      format('backup@%s.demo.example.com', lower(c.company_code))
    ),
    (
      format('%s Operations Manager', c.company_code),
      'Operations Manager',
      'Supply Operations',
      format('opsmgr@%s.demo.example.com', lower(c.company_code)),
      format('+66-2-55%03s-20', c.idx),
      format('+66-81-88%03s', c.idx),
      format('https://linkedin.com/in/demo-%s-ops', lower(c.company_code)),
      format('dispatch@%s.demo.example.com', lower(c.company_code))
    )
) as x(contact_name, position, department, business_email, tel, whatsapp, social_media, supplement_email_1);

with months as (
  select
    month_offset,
    (date_trunc('month', current_date)::date - make_interval(months => month_offset))::date as month_start
  from generate_series(0, 17) as month_offset
)
insert into public.company_history (
  company_id, "date", importer, exporter, hs_code, product, product_description, origin_country, destination_country,
  total_price_usd, weight_kg, quantity, unit_price_usd_kg, unit_price_usd_qty, quantity_unit
)
select
  c.company_id,
  (m.month_start + ((v.variant * 6 + c.idx) % 24))::date as trade_date,
  c.customer,
  format('DEMO %s EXPORT HUB %s', c.company_code, v.variant),
  case when c.idx % 3 = 1 then '1701.99' when c.idx % 3 = 2 then '1701.14' else '1702.90' end,
  case when c.idx % 3 = 1 then 'Refined Cane Sugar' when c.idx % 3 = 2 then 'Raw Cane Sugar' else 'Sugar Syrup' end,
  c.product_description,
  case when c.idx % 2 = 0 then 'Brazil' else 'Thailand' end,
  case when c.idx % 3 = 0 then 'Indonesia' when c.idx % 3 = 1 then 'Vietnam' else 'Malaysia' end,
  round((15000 + c.idx * 1300 + (17 - m.month_offset) * 290 + v.variant * 450) * (0.64 + c.idx * 0.02), 2) as total_price_usd,
  round((14500 + c.idx * 1200 + (17 - m.month_offset) * 260 + v.variant * 400)::numeric, 2) as weight_kg,
  round((120 + c.idx * 8 + (17 - m.month_offset) * 1.4 + v.variant * 7)::numeric, 2) as quantity,
  round((0.64 + c.idx * 0.02)::numeric, 4),
  round((58 + c.idx * 1.8 + v.variant * 2.5)::numeric, 4),
  'kg'
from pg_temp.demo_companies as c
cross join months as m
cross join (values (1), (2)) as v(variant);

with agg as (
  select
    company_id,
    count(*)::int as trades,
    count(distinct exporter)::int as supplier_number,
    max("date") as latest_purchase_time,
    sum(total_price_usd) as total_purchase_value,
    sum(total_price_usd) filter (where "date" >= current_date - 365) as purchase_value_last_12m,
    count(*) filter (where "date" >= current_date - 365)::int as purchase_frequency_per_year
  from public.company_history
  where company_id in (select company_id from pg_temp.demo_companies)
  group by company_id
)
update public.companies as c
set
  trades = agg.trades,
  supplier_number = agg.supplier_number,
  latest_purchase_time = agg.latest_purchase_time
from agg
where c.company_id = agg.company_id;

with agg as (
  select
    company_id,
    sum(total_price_usd) as total_purchase_value,
    sum(total_price_usd) filter (where "date" >= current_date - 365) as purchase_value_last_12m,
    count(*) filter (where "date" >= current_date - 365)::int as purchase_frequency_per_year,
    max("date") as latest_purchase_date
  from public.company_history
  where company_id in (select company_id from pg_temp.demo_companies)
  group by company_id
)
update public.company_overview as o
set
  total_purchase_value = agg.total_purchase_value,
  purchase_value_last_12m = agg.purchase_value_last_12m,
  purchase_frequency_per_year = agg.purchase_frequency_per_year,
  latest_purchase_date = agg.latest_purchase_date,
  updated_at = now()
from agg
where o.company_id = agg.company_id;

with recent as (
  select
    company_id,
    exporter,
    count(*)::int as trades_sum,
    sum(weight_kg)::numeric as kg_weight,
    sum(quantity)::numeric as quantity,
    sum(total_price_usd)::numeric as total_price_usd
  from public.company_history
  where company_id in (select company_id from pg_temp.demo_companies)
    and "date" >= current_date - 365
  group by company_id, exporter
),
tot as (
  select
    company_id,
    sum(trades_sum)::numeric as total_trades,
    sum(kg_weight)::numeric as total_weight,
    sum(quantity)::numeric as total_qty,
    sum(total_price_usd)::numeric as total_price
  from recent
  group by company_id
)
insert into public.company_supplychain (
  company_id, exporter, trades_sum, trade_frequency_ratio, kg_weight, weight_ratio,
  quantity, quantity_ratio, total_price_usd, total_price_ratio, snapshot_id
)
select
  r.company_id,
  r.exporter,
  r.trades_sum,
  round(r.trades_sum::numeric / nullif(t.total_trades, 0), 4),
  round(r.kg_weight, 2),
  round(r.kg_weight / nullif(t.total_weight, 0), 4),
  round(r.quantity, 2),
  round(r.quantity / nullif(t.total_qty, 0), 4),
  round(r.total_price_usd, 2),
  round(r.total_price_usd / nullif(t.total_price, 0), 4),
  format('DEMO_SNAP_%s', to_char(current_date, 'YYYYMMDD'))
from recent as r
join tot as t on t.company_id = r.company_id;

drop table if exists pg_temp.demo_contracts;
create temporary table pg_temp.demo_contracts as
select
  ((c.idx - 1) * 2 + s.seq) as contract_no,
  c.idx as company_idx,
  format('DEMO-CTR-%s', lpad(((c.idx - 1) * 2 + s.seq)::text, 4, '0')) as contract_id,
  c.customer,
  (current_date - (c.idx * 26 + s.seq * 7))::date as contractdate,
  case when s.seq % 2 = 0 then 'Export' else 'Domestic' end as type
from pg_temp.demo_companies as c
cross join (values (1), (2)) as s(seq);

insert into public.operation_contracts (contract_id, customer, contractdate, type, year)
select contract_id, customer, contractdate, type, extract(year from contractdate)::int
from pg_temp.demo_contracts;

with lines as (
  select
    c.contract_no,
    c.company_idx,
    c.contract_id,
    case when i.item_no = 1 then 'BLEND-A' else 'BLEND-B' end as job,
    case
      when i.item_no = 1 and c.company_idx % 2 = 0 then 'Raw Cane Sugar'
      when i.item_no = 1 then 'Refined Sugar'
      when c.company_idx % 3 = 0 then 'Sugar Syrup'
      else 'Brown Sugar'
    end as product,
    round((390 + c.company_idx * 4 + c.contract_no * 3 + i.item_no * 6)::numeric, 2) as price,
    round((85 + c.company_idx * 11 + c.contract_no * 2 + i.item_no * 14)::numeric, 2) as ton,
    case when i.item_no = 1 then 'Ops Domestic' else 'Ops Export' end as team,
    (c.contractdate + i.item_no * 5)::date as date_from,
    (c.contractdate + 45 + c.contract_no * 5 + i.item_no * 9)::date as date_to,
    case when c.contract_no % 6 = 0 then 'overdue' when c.contract_no % 4 = 0 then 'completed' else 'pending' end as status
  from pg_temp.demo_contracts as c
  cross join (values (1), (2)) as i(item_no)
)
insert into public.operation_lines (contract_id, job, product, price, ton, acc, team, date_from, date_to, status)
select contract_id, job, product, price, ton, 0, team, date_from, date_to, status
from lines;

with base as (
  select
    c.contract_no,
    c.contract_id,
    case when i.item_no = 1 then 'BLEND-A' else 'BLEND-B' end as job,
    round((85 + c.company_idx * 11 + c.contract_no * 2 + i.item_no * 14)::numeric, 2) as ton,
    (c.contractdate + i.item_no * 5)::date as date_from,
    case when c.contract_no % 6 = 0 then 'overdue' when c.contract_no % 4 = 0 then 'completed' else 'pending' end as status
  from pg_temp.demo_contracts as c
  cross join (values (1), (2)) as i(item_no)
)
insert into public.operation_deliveries (contract_id, job, delivery_date, record, quantity, remark)
select
  b.contract_id,
  b.job,
  (b.date_from + (d.seq * (12 + (b.contract_no % 5))))::date as delivery_date,
  format('DEMO-REC-%s-%s', right(b.contract_id, 4), d.seq),
  round(
    case
      when b.status = 'completed' then b.ton / 3.0
      when b.status = 'overdue' and d.seq = 3 then b.ton / 12.0
      when b.status = 'overdue' then b.ton / 4.8
      when d.seq = 3 then b.ton / 8.0
      else b.ton / 4.6
    end,
    2
  ),
  case
    when b.status = 'overdue' and d.seq = 3 then 'Carrier delay due to port congestion'
    when d.seq = 1 then 'Initial dispatch'
    when d.seq = 2 then 'Mid-cycle dispatch'
    else 'Final dispatch'
  end
from base as b
cross join (values (1), (2), (3)) as d(seq)
where not (b.status = 'pending' and d.seq = 3 and b.contract_no % 2 = 1);

insert into public.operation_stock (factory, qty, tag, type, site_type)
values
  ('DEMO Rayong Factory',      2450, 'Current', 'Raw Sugar',      'Factory'),
  ('DEMO Rayong Factory',      1620, 'Current', 'Refined Sugar',  'Factory'),
  ('DEMO Chonburi Factory',    2130, 'Current', 'Raw Sugar',      'Factory'),
  ('DEMO Chonburi Factory',    1780, 'Current', 'Brown Sugar',    'Factory'),
  ('DEMO Ayutthaya Factory',   1940, 'Current', 'Sugar Syrup',    'Factory'),
  ('DEMO Bangkok Warehouse A', 1280, 'Current', 'Refined Sugar',  'Warehouse'),
  ('DEMO Bangkok Warehouse A',  940, 'Current', 'Brown Sugar',    'Warehouse'),
  ('DEMO Bangkok Warehouse B', 1100, 'Current', 'Raw Sugar',      'Warehouse'),
  ('DEMO Export Hub East',      780, 'Current', 'Refined Sugar',  'Warehouse'),
  ('DEMO Export Hub East',      620, 'Current', 'Raw Sugar',      'Warehouse');

with contracts as (
  select row_number() over(order by contract_no) as rn, *
  from pg_temp.demo_contracts
),
contract_count as (
  select max(rn) as total_contracts
  from contracts
),
months as (
  select month_offset, (date_trunc('month', current_date)::date - make_interval(months => month_offset))::date as month_start
  from generate_series(0, 17) as month_offset
),
invoice_source as (
  select
    m.month_offset,
    m.month_start,
    seq.seq_no,
    c.contract_id,
    c.customer,
    c.type,
    c.company_idx,
    (m.month_start + ((seq.seq_no * 3 + c.company_idx) % 23))::date as invoice_date
  from months as m
  cross join (values (1), (2), (3), (4), (5), (6)) as seq(seq_no)
  cross join contract_count as cc
  join contracts as c on c.rn = ((m.month_offset + seq.seq_no - 1) % cc.total_contracts) + 1
)
insert into public.finance_invoices (
  invoice, tons, total_invoice, usd, contact, credit, export, team, thb, booking_no, contract,
  convert_date, convert_rate, customer_name, fac, invoice_date, price, status_type, status_detail
)
select
  format('DEMO-INV-%s-%s', to_char(i.month_start, 'YYYYMM'), lpad(i.seq_no::text, 3, '0')),
  tons_calc.tons,
  round(tons_calc.usd * tons_calc.convert_rate, 2),
  tons_calc.usd,
  (i.seq_no % 2 = 0),
  (i.type = 'Domestic'),
  (i.type = 'Export'),
  format('Finance Team %s', ((i.company_idx - 1) % 3) + 1),
  round(tons_calc.usd * tons_calc.convert_rate, 2),
  format('DEMO-BKG-%s-%s', to_char(i.invoice_date, 'YYYYMM'), lpad(i.seq_no::text, 3, '0')),
  i.contract_id,
  (i.invoice_date + 2)::date,
  tons_calc.convert_rate,
  i.customer,
  format('DEMO-FAC-%s', ((i.company_idx - 1) % 3) + 1),
  i.invoice_date,
  round(tons_calc.usd / nullif(tons_calc.tons, 0), 2),
  case when i.invoice_date <= current_date - 60 and i.seq_no % 4 = 0 then 'OVERDUE' when i.invoice_date <= current_date - 25 then 'PAID' else 'PENDING' end,
  case when i.invoice_date <= current_date - 60 and i.seq_no % 4 = 0 then 'Past due and awaiting customer settlement' when i.invoice_date <= current_date - 25 then 'Payment confirmed' else 'Awaiting due date / in collection cycle' end
from invoice_source as i
cross join lateral (
  select
    round((20 + ((i.seq_no * 6 + i.month_offset + i.company_idx) % 35))::numeric, 2) as tons,
    round((20 + ((i.seq_no * 6 + i.month_offset + i.company_idx) % 35))::numeric * (430 + ((i.company_idx * 7 + i.seq_no * 9 + i.month_offset) % 70)), 2) as usd,
    round((34.10 + ((i.month_offset + i.seq_no) % 9) * 0.07)::numeric, 4) as convert_rate
) as tons_calc;

insert into public.sugar_products (
  ref_no,
  spec_date,
  brand,
  product_name_en,
  product_name_th,
  appearance,
  method_of_production,
  color_icumsa,
  polarization_z,
  net_wt,
  country_of_origin
)
values
  ('DEMO-REF-001', current_date - 120, 'DEMO SADA', 'Refined Sugar', 'น้ำตาลทรายขาวบริสุทธิ์', 'White crystals', 'Carbonation', '45 ICUMSA', '99.90', '25 kg', 'Thailand'),
  ('DEMO-REF-002', current_date - 100, 'DEMO TRR', 'Raw Sugar', 'น้ำตาลทรายดิบ', 'Brown crystals', 'Defecation / Crystallization', '650 ICUMSA', '98.70', 'Bulk', 'Thailand'),
  ('DEMO-REF-003', current_date - 90,  'DEMO SADA', 'Natural Cane Sugar', 'น้ำตาลอ้อยธรรมชาติ', 'Golden crystals', 'Minimal process', '1100 ICUMSA', '98.30', '25 kg', 'Thailand'),
  ('DEMO-REF-004', current_date - 80,  'DEMO LIN',  'Refined Syrup', 'น้ำเชื่อมบริสุทธิ์', 'Clear liquid', 'Heat reaction', '-', '-', '330 ml', 'Thailand'),
  ('DEMO-REF-005', current_date - 70,  'DEMO TRR',  'Fine White Sugar', 'น้ำตาลทรายขาว', 'Fine white crystals', 'Carbonation', '35 ICUMSA', '99.95', '50 kg', 'Thailand'),
  ('DEMO-REF-006', current_date - 65,  'DEMO SADA', 'Brown Sugar', 'น้ำตาลทรายแดง', 'Brown granules', 'Natural molasses retention', '900 ICUMSA', '98.80', '1 kg', 'Thailand'),
  ('DEMO-REF-007', current_date - 55,  'DEMO LIN',  'Liquid Sugar Syrup', 'น้ำตาลเหลว', 'Clear syrup', 'Dissolution and filtration', '-', '-', '20 kg', 'Thailand'),
  ('DEMO-REF-008', current_date - 45,  'DEMO TRR',  'Industrial Sugar', 'น้ำตาลอุตสาหกรรม', 'Light brown crystals', 'Refining', '550 ICUMSA', '99.10', '1000 kg', 'Thailand'),
  ('DEMO-REF-009', current_date - 40,  'DEMO SADA', 'Caster Sugar', 'น้ำตาลทรายละเอียด', 'Fine crystals', 'Fine grinding', '45 ICUMSA', '99.90', '1 kg', 'Thailand'),
  ('DEMO-REF-010', current_date - 30,  'DEMO LIN',  'Premium Refined Sugar', 'น้ำตาลพรีเมียม', 'Ultra white crystals', 'High-grade refining', '20 ICUMSA', '99.98', '25 kg', 'Thailand');

commit;

select 'companies' as table_name, count(*) as row_count from public.companies where customer ~ '^DEMO '
union all
select 'company_history', count(*) from public.company_history where company_id in (
  '10000000-0000-4000-8000-000000000101'::uuid,
  '10000000-0000-4000-8000-000000000102'::uuid,
  '10000000-0000-4000-8000-000000000103'::uuid,
  '10000000-0000-4000-8000-000000000104'::uuid,
  '10000000-0000-4000-8000-000000000105'::uuid,
  '10000000-0000-4000-8000-000000000106'::uuid,
  '10000000-0000-4000-8000-000000000107'::uuid,
  '10000000-0000-4000-8000-000000000108'::uuid
)
union all
select 'operation_contracts', count(*) from public.operation_contracts where contract_id ~ '^DEMO-CTR-'
union all
select 'operation_lines', count(*) from public.operation_lines where contract_id ~ '^DEMO-CTR-'
union all
select 'operation_deliveries', count(*) from public.operation_deliveries where contract_id ~ '^DEMO-CTR-'
union all
select 'operation_stock', count(*) from public.operation_stock where factory ~ '^DEMO '
union all
select 'finance_invoices', count(*) from public.finance_invoices where coalesce(invoice, '') ~ '^DEMO-INV-'
union all
select 'sugar_products', count(*) from public.sugar_products where coalesce(ref_no, '') ~ '^DEMO-REF-';
