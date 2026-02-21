-- Add snapshot_id for deterministic supply-chain snapshot selection.
alter table public.company_supplychain
add column if not exists snapshot_id text;

-- Backfill existing rows so frontend can consistently select one snapshot.
update public.company_supplychain
set snapshot_id = concat(
  'legacy_',
  to_char(date_trunc('second', coalesce(created_at, now()) at time zone 'UTC'), 'YYYYMMDDHH24MISS'),
  '_',
  left(md5(company_id::text), 8)
)
where snapshot_id is null or btrim(snapshot_id) = '';

create or replace function public.company_supplychain_set_snapshot_id()
returns trigger
language plpgsql
as $$
begin
  if new.created_at is null then
    new.created_at := now();
  end if;

  if new.snapshot_id is null or btrim(new.snapshot_id) = '' then
    new.snapshot_id := concat(
      'auto_',
      to_char(date_trunc('second', new.created_at at time zone 'UTC'), 'YYYYMMDDHH24MISS'),
      '_',
      left(md5(new.company_id::text), 8)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_company_supplychain_set_snapshot_id on public.company_supplychain;
create trigger trg_company_supplychain_set_snapshot_id
before insert or update of created_at, snapshot_id on public.company_supplychain
for each row
execute function public.company_supplychain_set_snapshot_id();

create index if not exists idx_company_supplychain_company_snapshot
on public.company_supplychain (company_id, snapshot_id);

create index if not exists idx_company_supplychain_company_created_at
on public.company_supplychain (company_id, created_at desc);
