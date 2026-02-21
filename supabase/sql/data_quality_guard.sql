-- Data Quality Guard
-- Purpose:
-- - Detect test/seed markers in public data before release.
-- - Raise exception when suspicious rows are found.
--
-- Usage:
-- - Run in Supabase SQL Editor before UAT/deploy.
-- - If no exception is raised, check passed.

create temporary table if not exists _dq_guard_hits (
  table_name text,
  column_name text,
  marker text,
  sample_value text,
  hit_count bigint
);

truncate _dq_guard_hits;

do $$
declare
  r record;
  marker text;
  sql text;
  markers text[] := array[
    '%AUTOMAP_TEST%',
    '%@example.local%',
    '%SEED.%'
  ];
begin
  for r in
    select c.table_name, c.column_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
    where c.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
      and c.data_type in ('text', 'character varying', 'character')
  loop
    foreach marker in array markers
    loop
      sql := format(
        'insert into _dq_guard_hits(table_name, column_name, marker, sample_value, hit_count)
         select %L, %L, %L, min(%I)::text, count(*)::bigint
         from public.%I
         where %I::text ilike %L',
        r.table_name,
        r.column_name,
        marker,
        r.column_name,
        r.table_name,
        r.column_name,
        marker
      );
      execute sql;
    end loop;
  end loop;
end
$$;

do $$
declare
  v_hits bigint;
  v_preview text;
begin
  select coalesce(sum(hit_count), 0) into v_hits
  from _dq_guard_hits
  where hit_count > 0;

  if v_hits > 0 then
    select string_agg(
      format('%s.%s marker=%s count=%s sample=%s',
        table_name,
        column_name,
        marker,
        hit_count,
        coalesce(sample_value, '')
      ),
      E'\n'
      order by table_name, column_name, marker
    )
    into v_preview
    from _dq_guard_hits
    where hit_count > 0;

    raise exception
      using message = format('Data quality guard failed: found %s suspicious rows', v_hits),
            detail = v_preview,
            hint = 'Remove test/seed rows or adjust marker list in supabase/sql/data_quality_guard.sql';
  end if;
end
$$;

-- Optional success output for visibility.
select 'Data quality guard passed (no suspicious test/seed markers found)' as result;
