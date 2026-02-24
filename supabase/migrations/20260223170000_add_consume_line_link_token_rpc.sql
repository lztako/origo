-- Secure account-link callback RPC for LINE OA.

create or replace function public.consume_line_link_token(p_link_token text)
returns table (
  link_id uuid,
  line_user_id text,
  user_id uuid,
  entity_id uuid,
  status text,
  linked_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_entity_id uuid;
  v_token_id uuid;
  v_line_user_id text;
  v_token_status text;
  v_expires_at timestamptz;
  v_new_link public.line_user_links%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      using
        message = 'line_link_user_not_authenticated';
  end if;

  select m.entity_id
  into v_entity_id
  from public.company_user_members as m
  where
    m.user_id = v_user_id
    and m.is_active
  order by m.updated_at desc nulls last, m.created_at desc nulls last
  limit 1;

  if v_entity_id is null then
    raise exception
      using
        message = 'line_link_membership_not_found',
        detail = 'User must have an active company_user_members row.';
  end if;

  select
    t.token_id,
    t.line_user_id,
    t.status,
    t.expires_at
  into
    v_token_id,
    v_line_user_id,
    v_token_status,
    v_expires_at
  from public.line_link_tokens as t
  where t.link_token = trim(coalesce(p_link_token, ''))
  limit 1;

  if v_token_id is null then
    raise exception
      using
        message = 'line_link_token_not_found';
  end if;

  if v_token_status <> 'issued' then
    raise exception
      using
        message = 'line_link_token_not_issued',
        detail = format('Token status is %s', coalesce(v_token_status, 'unknown'));
  end if;

  if v_expires_at <= now() then
    update public.line_link_tokens as t
    set
      status = 'expired',
      updated_at = now()
    where
      t.token_id = v_token_id
      and t.status = 'issued';

    raise exception
      using
        message = 'line_link_token_expired';
  end if;

  update public.line_link_tokens as t
  set
    status = 'used',
    consumed_at = now(),
    user_id = v_user_id,
    entity_id = v_entity_id,
    updated_at = now()
  where
    t.token_id = v_token_id
    and t.status = 'issued';

  if not found then
    raise exception
      using
        message = 'line_link_token_already_used';
  end if;

  update public.line_user_links as l
  set
    status = 'revoked',
    revoked_at = coalesce(l.revoked_at, now()),
    revoke_reason = case
      when l.user_id = v_user_id then 'relinked_same_user'
      else 'relinked_line_user_transfer'
    end,
    updated_at = now()
  where
    l.status = 'active'
    and (
      l.user_id = v_user_id
      or l.line_user_id = v_line_user_id
    );

  insert into public.line_user_links (
    line_user_id,
    user_id,
    entity_id,
    status,
    linked_at,
    created_at,
    updated_at
  )
  values (
    v_line_user_id,
    v_user_id,
    v_entity_id,
    'active',
    now(),
    now(),
    now()
  )
  returning *
  into v_new_link;

  return query
  select
    v_new_link.link_id,
    v_new_link.line_user_id,
    v_new_link.user_id,
    v_new_link.entity_id,
    v_new_link.status,
    v_new_link.linked_at;
end;
$$;

revoke all on function public.consume_line_link_token(text) from public;
grant execute on function public.consume_line_link_token(text) to authenticated, service_role;
