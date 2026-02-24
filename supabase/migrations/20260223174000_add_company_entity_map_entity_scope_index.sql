-- Performance index for entity-scoped lookups (LINE internal AI mode).

create index if not exists idx_company_entity_map_entity_scope_lookup
  on public.company_entity_map (entity_id, source_domain, source_table, source_key);
