-- Performance optimization for AI chat/telemetry:
-- 1) Add missing FK indexes on ai_conversations.
-- 2) Rewrite AI RLS policies to use (select auth.uid()) / (select private.*)
--    to avoid per-row auth function re-evaluation.

create index if not exists idx_ai_conversations_owner_user_id
  on public.ai_conversations (owner_user_id);

create index if not exists idx_ai_conversations_entity_id
  on public.ai_conversations (entity_id);

drop policy if exists ai_conversations_select_owner on public.ai_conversations;
create policy ai_conversations_select_owner
on public.ai_conversations
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  and entity_id is not null
  and private.current_user_is_member(entity_id)
);

drop policy if exists ai_conversations_insert_owner on public.ai_conversations;
create policy ai_conversations_insert_owner
on public.ai_conversations
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and entity_id = (select private.current_user_entity_id())
);

drop policy if exists ai_conversations_update_owner on public.ai_conversations;
create policy ai_conversations_update_owner
on public.ai_conversations
for update
to authenticated
using (
  owner_user_id = (select auth.uid())
  and entity_id is not null
  and private.current_user_is_member(entity_id)
)
with check (
  owner_user_id = (select auth.uid())
  and entity_id = (select private.current_user_entity_id())
);

drop policy if exists ai_conversations_delete_owner on public.ai_conversations;
create policy ai_conversations_delete_owner
on public.ai_conversations
for delete
to authenticated
using (
  owner_user_id = (select auth.uid())
  and entity_id is not null
  and private.current_user_is_member(entity_id)
);

drop policy if exists ai_messages_select_owner_conversation on public.ai_messages;
create policy ai_messages_select_owner_conversation
on public.ai_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.ai_conversations as c
    where
      c.id = ai_messages.conversation_id
      and c.owner_user_id = (select auth.uid())
      and c.entity_id is not null
      and private.current_user_is_member(c.entity_id)
  )
);

drop policy if exists ai_messages_insert_owner_conversation on public.ai_messages;
create policy ai_messages_insert_owner_conversation
on public.ai_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ai_conversations as c
    where
      c.id = ai_messages.conversation_id
      and c.owner_user_id = (select auth.uid())
      and c.entity_id = (select private.current_user_entity_id())
  )
);

drop policy if exists ai_messages_update_owner_conversation on public.ai_messages;
create policy ai_messages_update_owner_conversation
on public.ai_messages
for update
to authenticated
using (
  exists (
    select 1
    from public.ai_conversations as c
    where
      c.id = ai_messages.conversation_id
      and c.owner_user_id = (select auth.uid())
      and c.entity_id is not null
      and private.current_user_is_member(c.entity_id)
  )
)
with check (
  exists (
    select 1
    from public.ai_conversations as c
    where
      c.id = ai_messages.conversation_id
      and c.owner_user_id = (select auth.uid())
      and c.entity_id = (select private.current_user_entity_id())
  )
);

drop policy if exists ai_messages_delete_owner_conversation on public.ai_messages;
create policy ai_messages_delete_owner_conversation
on public.ai_messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.ai_conversations as c
    where
      c.id = ai_messages.conversation_id
      and c.owner_user_id = (select auth.uid())
      and c.entity_id is not null
      and private.current_user_is_member(c.entity_id)
  )
);

drop policy if exists ai_telemetry_events_select_owner on public.ai_telemetry_events;
create policy ai_telemetry_events_select_owner
on public.ai_telemetry_events
for select
to authenticated
using (
  user_id = (select auth.uid())
  and (
    entity_id is null
    or private.current_user_is_member(entity_id)
  )
);

drop policy if exists ai_telemetry_events_insert_owner on public.ai_telemetry_events;
create policy ai_telemetry_events_insert_owner
on public.ai_telemetry_events
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    entity_id is null
    or entity_id = (select private.current_user_entity_id())
  )
);
