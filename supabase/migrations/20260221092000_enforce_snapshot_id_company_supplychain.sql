-- Enforce non-empty snapshot_id for reliable latest-snapshot reads.
alter table public.company_supplychain
alter column snapshot_id set not null;

alter table public.company_supplychain
drop constraint if exists company_supplychain_snapshot_id_not_blank;

alter table public.company_supplychain
add constraint company_supplychain_snapshot_id_not_blank
check (length(btrim(snapshot_id)) > 0);
