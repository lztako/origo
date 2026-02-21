-- Enforce identity cardinality: one user belongs to exactly one company entity.

do $$
declare
  v_conflict_count integer;
begin
  select count(*)
  into v_conflict_count
  from (
    select m.user_id
    from public.company_user_members as m
    group by m.user_id
    having count(*) > 1
  ) as conflicts;

  if v_conflict_count > 0 then
    raise exception
      using
        message = format(
          'Cannot enforce one-user-one-company: %s user(s) already have multiple membership rows',
          v_conflict_count
        ),
        hint = 'Resolve duplicate rows in public.company_user_members first.';
  end if;
end
$$;

create unique index if not exists uq_company_user_members_one_user_one_company
  on public.company_user_members (user_id);

create or replace function public.assign_entity_owner_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is not null then
    if exists (
      select 1
      from public.company_user_members as m
      where
        m.user_id = v_user_id
        and m.entity_id <> new.entity_id
    ) then
      raise exception
        using
          message = 'one_user_one_company_violation',
          detail = 'The current user is already assigned to another company entity.';
    end if;

    insert into public.company_user_members (entity_id, user_id, role, is_active)
    values (new.entity_id, v_user_id, 'owner', true)
    on conflict (entity_id, user_id) do update
    set
      role = excluded.role,
      is_active = true,
      updated_at = now();

    update public.user_profiles as p
    set
      default_entity_id = new.entity_id,
      updated_at = now()
    where
      p.user_id = v_user_id
      and p.default_entity_id is distinct from new.entity_id;
  end if;

  return new;
end;
$$;

create or replace function public.sync_profile_default_entity_from_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.user_profiles as p
    set
      default_entity_id = null,
      updated_at = now()
    where
      p.user_id = old.user_id
      and p.default_entity_id is not null;

    return old;
  end if;

  update public.user_profiles as p
  set
    default_entity_id = case when new.is_active then new.entity_id else null end,
    updated_at = now()
  where
    p.user_id = new.user_id
    and p.default_entity_id is distinct from case when new.is_active then new.entity_id else null end;

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_default_entity_from_membership on public.company_user_members;
create trigger trg_sync_profile_default_entity_from_membership
after insert or update of entity_id, user_id, is_active or delete
on public.company_user_members
for each row
execute function public.sync_profile_default_entity_from_membership();

update public.user_profiles as p
set
  default_entity_id = case when m.is_active then m.entity_id else null end,
  updated_at = now()
from public.company_user_members as m
where
  m.user_id = p.user_id
  and p.default_entity_id is distinct from case when m.is_active then m.entity_id else null end;

update public.user_profiles as p
set
  default_entity_id = null,
  updated_at = now()
where
  p.default_entity_id is not null
  and not exists (
    select 1
    from public.company_user_members as m
    where m.user_id = p.user_id
  );
