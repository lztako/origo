-- Batch 3 security cleanup for sandbox catalog surfaces.
-- Goals:
-- 1) Enable RLS on sandbox tables exposed via PostgREST.
-- 2) Remove SECURITY DEFINER behavior from public views.
-- 3) Reduce broad grants (anon/authenticated) to least privilege.
-- 4) Set explicit function search_path for linter warnings.

alter table public.company_product_map_sandbox enable row level security;
alter table public.product_catalog_sandbox enable row level security;
alter table public.product_application_rules_sandbox enable row level security;
alter table public.sugar_products enable row level security;

drop policy if exists company_product_map_sandbox_select_member on public.company_product_map_sandbox;
create policy company_product_map_sandbox_select_member
on public.company_product_map_sandbox
for select
to authenticated
using (private.current_user_entity_id() is not null);

drop policy if exists product_catalog_sandbox_select_member on public.product_catalog_sandbox;
create policy product_catalog_sandbox_select_member
on public.product_catalog_sandbox
for select
to authenticated
using (private.current_user_entity_id() is not null);

drop policy if exists product_application_rules_sandbox_select_member on public.product_application_rules_sandbox;
create policy product_application_rules_sandbox_select_member
on public.product_application_rules_sandbox
for select
to authenticated
using (private.current_user_entity_id() is not null);

drop policy if exists sugar_products_select_member on public.sugar_products;
create policy sugar_products_select_member
on public.sugar_products
for select
to authenticated
using (private.current_user_entity_id() is not null);

alter view public.product_catalog_summary_sandbox set (security_invoker = true);
alter view public.product_catalog_listing_sandbox set (security_invoker = true);

revoke all on public.company_product_map_sandbox from anon, authenticated;
revoke all on public.product_catalog_sandbox from anon, authenticated;
revoke all on public.product_application_rules_sandbox from anon, authenticated;
revoke all on public.sugar_products from anon, authenticated;
revoke all on public.product_catalog_summary_sandbox from anon, authenticated;
revoke all on public.product_catalog_listing_sandbox from anon, authenticated;

grant select on public.company_product_map_sandbox to authenticated;
grant select on public.product_catalog_sandbox to authenticated;
grant select on public.product_application_rules_sandbox to authenticated;
grant select on public.sugar_products to authenticated;
grant select on public.product_catalog_summary_sandbox to authenticated;
grant select on public.product_catalog_listing_sandbox to authenticated;

alter function public.touch_ai_conversation_updated_at() set search_path = public;
alter function public.bump_ai_conversation_last_message_at() set search_path = public;
alter function public.apply_product_application_rules_sandbox() set search_path = public;
alter function public.verify_product_catalog_label_sandbox(uuid, boolean) set search_path = public;
alter function public.set_product_catalog_hero_sandbox(text, uuid, boolean) set search_path = public;
alter function public.upsert_product_catalog_item_sandbox(text, uuid, text, text, text, boolean) set search_path = public;
alter function public.company_supplychain_set_snapshot_id() set search_path = public;
alter function public.ingest_company_supplychain_snapshot(text, jsonb, boolean) set search_path = public;
alter function public.set_updated_at_timestamp() set search_path = public;
alter function public.update_contract_line_status() set search_path = public;
