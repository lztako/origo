-- Explicit ETL ingestion endpoint for one snapshot run across many companies.
create or replace function public.ingest_company_supplychain_snapshot(
  p_snapshot_id text,
  p_rows jsonb,
  p_replace_snapshot boolean default true
)
returns table (
  snapshot_id text,
  rows_inserted integer,
  companies_affected integer
)
language plpgsql
as $$
declare
  v_rows_inserted integer := 0;
  v_companies_affected integer := 0;
begin
  if p_snapshot_id is null or btrim(p_snapshot_id) = '' then
    raise exception 'p_snapshot_id is required';
  end if;

  if p_rows is null then
    p_rows := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  if p_replace_snapshot then
    delete from public.company_supplychain
    where snapshot_id = btrim(p_snapshot_id);
  end if;

  with payload as (
    select
      nullif(btrim(item->>'company_id'), '')::uuid as company_id,
      nullif(btrim(item->>'exporter'), '') as exporter,
      nullif(item->>'trades_sum', '')::integer as trades_sum,
      nullif(item->>'trade_frequency_ratio', '')::numeric as trade_frequency_ratio,
      nullif(item->>'kg_weight', '')::numeric as kg_weight,
      nullif(item->>'weight_ratio', '')::numeric as weight_ratio,
      nullif(item->>'quantity', '')::numeric as quantity,
      nullif(item->>'quantity_ratio', '')::numeric as quantity_ratio,
      nullif(item->>'total_price_usd', '')::numeric as total_price_usd,
      nullif(item->>'total_price_ratio', '')::numeric as total_price_ratio,
      nullif(item->>'created_at', '')::timestamptz as created_at
    from jsonb_array_elements(p_rows) item
  ),
  inserted as (
    insert into public.company_supplychain (
      company_id,
      snapshot_id,
      exporter,
      trades_sum,
      trade_frequency_ratio,
      kg_weight,
      weight_ratio,
      quantity,
      quantity_ratio,
      total_price_usd,
      total_price_ratio,
      created_at
    )
    select
      payload.company_id,
      btrim(p_snapshot_id),
      payload.exporter,
      payload.trades_sum,
      payload.trade_frequency_ratio,
      payload.kg_weight,
      payload.weight_ratio,
      payload.quantity,
      payload.quantity_ratio,
      payload.total_price_usd,
      payload.total_price_ratio,
      coalesce(payload.created_at, now())
    from payload
    where payload.company_id is not null
    returning company_id
  )
  select
    count(*)::integer,
    count(distinct company_id)::integer
  into v_rows_inserted, v_companies_affected
  from inserted;

  return query
  select
    btrim(p_snapshot_id),
    coalesce(v_rows_inserted, 0),
    coalesce(v_companies_affected, 0);
end;
$$;

revoke all on function public.ingest_company_supplychain_snapshot(text, jsonb, boolean) from public;
grant execute on function public.ingest_company_supplychain_snapshot(text, jsonb, boolean) to service_role;
