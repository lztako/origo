-- Allow many-to-many mapping between customer entities and external companies/domain rows.
-- Before:
--   unique (source_domain, source_table, source_key)
-- After:
--   unique (entity_id, source_domain, source_table, source_key)

alter table public.company_entity_map
  drop constraint if exists company_entity_map_source_domain_source_table_source_key_key;

create unique index if not exists uq_company_entity_map_entity_source_key
  on public.company_entity_map (entity_id, source_domain, source_table, source_key);

create index if not exists idx_company_entity_map_source_lookup
  on public.company_entity_map (source_domain, source_table, source_key);
