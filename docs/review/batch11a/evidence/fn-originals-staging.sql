-- Batch 11A — ORIGINAL definitions before 0066 (evidence copy; the rollback restores them from ks_fn_backup_0066)
-- generated 2026-10-19T11:15:48.490Z from the live STAGING catalog by scripts/gen-require-actor-migration.mjs

-- guard: accept_listing_consents(uuid,jsonb)
CREATE OR REPLACE FUNCTION public.accept_listing_consents(p_actor_id uuid, p_items jsonb)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_profile public.profiles%rowtype;
  v_items jsonb := coalesce(p_items, '{}'::jsonb);
begin
  if coalesce((v_items->>'connect_only')::boolean, false) is not true
     or coalesce((v_items->>'no_verification')::boolean, false) is not true
     or coalesce((v_items->>'no_payments')::boolean, false) is not true
     or coalesce((v_items->>'posting_rules')::boolean, false) is not true then
    raise exception 'consents_not_accepted';
  end if;

  update public.profiles
  set consents = jsonb_build_object(
        'version', '2026-10',
        'accepted_at', now()::text,
        'items', jsonb_build_object(
          'connect_only', true,
          'no_verification', true,
          'no_payments', true,
          'posting_rules', true
        )
      ) || case when consents ? 'details_visibility'
                then jsonb_build_object('details_visibility', consents -> 'details_visibility')
                else '{}'::jsonb end,
      disclaimer_accepted_at = coalesce(disclaimer_accepted_at, now())
  where id = p_actor_id
  returning * into v_profile;
  if not found then raise exception 'not_authorized'; end if;
  return v_profile;
end;
$function$
;

-- guard: admin_answer_sawaal(uuid,uuid,text,text,text,boolean,text,text,text,text,jsonb,jsonb)
CREATE OR REPLACE FUNCTION public.admin_answer_sawaal(p_actor_id uuid, p_id uuid, p_answer_hi text DEFAULT NULL::text, p_answer_en text DEFAULT NULL::text, p_answered_by text DEFAULT NULL::text, p_published boolean DEFAULT NULL::boolean, p_slug text DEFAULT NULL::text, p_crop text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_season text DEFAULT NULL::text, p_answer_blocks jsonb DEFAULT NULL::jsonb, p_sources jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.is_admin(p_actor_id) then raise exception 'not authorized'; end if;
  update public.kisan_sawaal set
    answer_hi     = coalesce(p_answer_hi, answer_hi),
    answer_en     = coalesce(p_answer_en, answer_en),
    answered_by   = coalesce(p_answered_by, answered_by),
    is_published  = coalesce(p_published, is_published),
    slug          = coalesce(p_slug, slug),
    crop          = coalesce(p_crop, crop),
    category      = coalesce(p_category, category),
    season        = coalesce(p_season, season),
    answer_blocks = coalesce(p_answer_blocks, answer_blocks),
    sources       = coalesce(p_sources, sources),
    answered_at   = coalesce(answered_at, now()),
    published_at  = case when coalesce(p_published, is_published) and published_at is null then now() else published_at end,
    updated_at    = now()
  where id = p_id;
end;
$function$
;

-- guard: admin_delete_article(uuid,uuid)
CREATE OR REPLACE FUNCTION public.admin_delete_article(p_actor_id uuid, p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  delete from public.articles where id = p_id;
  return true;
end;
$function$
;

-- guard: admin_delete_event(uuid,uuid)
CREATE OR REPLACE FUNCTION public.admin_delete_event(p_actor_id uuid, p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin perform public.require_admin(p_actor_id); delete from public.farm_events where id=p_id; end $function$
;

-- guard: admin_delete_listing(uuid,uuid,text)
CREATE OR REPLACE FUNCTION public.admin_delete_listing(p_actor_id uuid, p_listing_id uuid, p_reason text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.listings%rowtype; v_paths text[]; v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  perform public.require_admin(p_actor_id);
  if v_reason is null then raise exception 'reason_required'; end if;
  if char_length(v_reason) > 300 then raise exception 'reason_too_long'; end if;
  select * into v from public.listings where id = p_listing_id for update;
  if not found then raise exception 'not_found'; end if;
  v_paths := public.listing_photo_paths(v.details);
  insert into public.listing_admin_actions (admin_id, listing_id, action, category, reason)
  values (p_actor_id, p_listing_id, 'delete', v.category, v_reason);
  update public.listing_reports
     set status = 'removed', resolution_note = v_reason, resolved_at = now(), resolved_by = p_actor_id
   where listing_id = p_listing_id and status = 'open';
  delete from public.listings where id = p_listing_id;
  perform public.queue_listing_photo_deletions(p_actor_id, v_paths);
  return v_paths;
end;
$function$
;

-- guard: admin_delete_mela(uuid,uuid)
CREATE OR REPLACE FUNCTION public.admin_delete_mela(p_actor_id uuid, p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  delete from public.kisan_mela where id = p_id;
  return true;
end;
$function$
;

-- guard: admin_delete_page_faq(uuid,uuid)
CREATE OR REPLACE FUNCTION public.admin_delete_page_faq(p_actor_id uuid, p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin perform public.require_admin(p_actor_id); delete from public.page_faqs where id=p_id; end $function$
;

-- guard: admin_delete_procurement(uuid,uuid)
CREATE OR REPLACE FUNCTION public.admin_delete_procurement(p_actor_id uuid, p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin perform public.require_admin(p_actor_id); delete from public.procurement_centres where id=p_id; end $function$
;

-- guard: admin_delete_safalta(uuid,uuid)
CREATE OR REPLACE FUNCTION public.admin_delete_safalta(p_actor_id uuid, p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  delete from public.kisan_safalta where id = p_id;
  return true;
end;
$function$
;

-- guard: admin_delete_sawaal(uuid,uuid)
CREATE OR REPLACE FUNCTION public.admin_delete_sawaal(p_actor_id uuid, p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  delete from public.kisan_sawaal where id = p_id;
  return true;
end;
$function$
;

-- guard: admin_delete_video(uuid,uuid)
CREATE OR REPLACE FUNCTION public.admin_delete_video(p_actor_id uuid, p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin perform public.require_admin(p_actor_id); delete from public.videos where id=p_id; end $function$
;

-- guard: admin_list_experts(uuid)
CREATE OR REPLACE FUNCTION public.admin_list_experts(p_actor_id uuid)
 RETURNS SETOF experts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.experts order by created_at desc;
end;
$function$
;

-- guard: admin_publish_candidate(uuid,uuid)
CREATE OR REPLACE FUNCTION public.admin_publish_candidate(p_actor_id uuid, p_id uuid)
 RETURNS kisan_mela
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  c public.kisan_mela_candidates%rowtype;
  v public.kisan_mela%rowtype;
begin
  perform public.require_admin(p_actor_id);
  select * into c from public.kisan_mela_candidates where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if c.promoted_to_kisan_mela and c.kisan_mela_id is not null then
    select * into v from public.kisan_mela where id = c.kisan_mela_id;
    if found then return v; end if;
  end if;
  insert into public.kisan_mela (
    name_hi, name_en, organizer_name, venue, address, state, district,
    is_date_confirmed, expected_period, category_tags, highlights_hi,
    source_url, source_urls, last_checked_date, submitted_by_user, moderation_status, is_active
  ) values (
    coalesce(nullif(trim(c.raw_name), ''), 'Kisan Mela'), null, null,
    coalesce(nullif(trim(c.raw_venue), ''), coalesce(c.raw_state, 'India')), null,
    coalesce(nullif(trim(c.raw_state), ''), 'India'), nullif(trim(c.raw_district), ''),
    false, nullif(trim(c.raw_date_text), ''), '{}', nullif(trim(c.raw_highlights), ''),
    coalesce(c.verified_primary_source_url, c.source_url),
    array(select distinct u from unnest(array[c.verified_primary_source_url, c.source_url]) u where u is not null and u <> ''),
    current_date, false, 'approved', true
  ) returning * into v;
  update public.kisan_mela_candidates
    set promoted_to_kisan_mela = true, kisan_mela_id = v.id,
        verification_status = 'verified',
        verification_reason = coalesce(verification_reason, '') || ' [admin override: published manually]'
    where id = p_id;
  return v;
end;
$function$
;

-- guard: admin_set_expert_active(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.admin_set_expert_active(p_actor_id uuid, p_expert_id uuid, p_active boolean)
 RETURNS experts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.experts%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.experts set is_active = p_active where id = p_expert_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$function$
;

-- guard: admin_set_input_price_active(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.admin_set_input_price_active(p_actor_id uuid, p_id uuid, p_active boolean)
 RETURNS input_prices
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.input_prices%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.input_prices set is_active = p_active where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$function$
;

-- guard: admin_set_listing_disabled(uuid,uuid,boolean,text)
CREATE OR REPLACE FUNCTION public.admin_set_listing_disabled(p_actor_id uuid, p_listing_id uuid, p_disabled boolean, p_reason text)
 RETURNS listings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.listings%rowtype; v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  perform public.require_admin(p_actor_id);
  select * into v from public.listings where id = p_listing_id for update;
  if not found then raise exception 'not_found'; end if;

  if coalesce(p_disabled, false) then
    if v_reason is null then raise exception 'reason_required'; end if;
    if char_length(v_reason) > 300 then raise exception 'reason_too_long'; end if;
    if v.status not in ('active', 'disabled') then raise exception 'invalid_state'; end if;
    update public.listings
       set status = 'disabled', admin_disabled_at = now(), admin_disabled_reason = v_reason
     where id = p_listing_id returning * into v;
    insert into public.listing_admin_actions (admin_id, listing_id, action, category, reason)
    values (p_actor_id, p_listing_id, 'disable', v.category, v_reason);
  else
    if v_reason is not null and char_length(v_reason) > 300 then raise exception 'reason_too_long'; end if;
    if v.status <> 'disabled' then raise exception 'invalid_state'; end if;
    update public.listings
       set status = 'active', admin_disabled_at = null, admin_disabled_reason = null
     where id = p_listing_id returning * into v;
    insert into public.listing_admin_actions (admin_id, listing_id, action, category, reason)
    values (p_actor_id, p_listing_id, 'enable', v.category, v_reason);
  end if;
  return v;
end;
$function$
;

-- guard: admin_set_listing_sponsored(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.admin_set_listing_sponsored(p_actor_id uuid, p_listing_id uuid, p_sponsored boolean)
 RETURNS listings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.listings%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.listings set is_sponsored = coalesce(p_sponsored, false) where id = p_listing_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$function$
;

-- guard: admin_set_mela_active(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.admin_set_mela_active(p_actor_id uuid, p_id uuid, p_active boolean)
 RETURNS kisan_mela
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.kisan_mela%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.kisan_mela set is_active = p_active where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$function$
;

-- guard: admin_set_mela_status(uuid,uuid,text)
CREATE OR REPLACE FUNCTION public.admin_set_mela_status(p_actor_id uuid, p_id uuid, p_status text)
 RETURNS kisan_mela
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.kisan_mela%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if p_status not in ('pending', 'approved', 'rejected') then raise exception 'invalid_status'; end if;
  update public.kisan_mela set moderation_status = p_status where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$function$
;

-- guard: admin_set_msp_active(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.admin_set_msp_active(p_actor_id uuid, p_id uuid, p_active boolean)
 RETURNS msp_prices
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.msp_prices%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.msp_prices set is_active = p_active, updated_at = now() where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$function$
;

-- guard: admin_set_resource_active(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.admin_set_resource_active(p_actor_id uuid, p_id uuid, p_active boolean)
 RETURNS resources
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.resources%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.resources set is_active = p_active where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$function$
;

-- guard: admin_set_safalta_featured(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.admin_set_safalta_featured(p_actor_id uuid, p_id uuid, p_featured boolean)
 RETURNS kisan_safalta
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.kisan_safalta%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.kisan_safalta set is_featured = p_featured where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$function$
;

-- guard: admin_set_safalta_published(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.admin_set_safalta_published(p_actor_id uuid, p_id uuid, p_published boolean)
 RETURNS kisan_safalta
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.kisan_safalta%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.kisan_safalta set is_published = p_published,
    published_at = case when p_published and published_at is null then now() when not p_published then null else published_at end
  where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$function$
;

-- guard: admin_set_sawaal_featured(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.admin_set_sawaal_featured(p_actor_id uuid, p_id uuid, p_featured boolean)
 RETURNS kisan_sawaal
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.kisan_sawaal%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.kisan_sawaal set is_featured = p_featured where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$function$
;

-- guard: admin_set_sawaal_published(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.admin_set_sawaal_published(p_actor_id uuid, p_id uuid, p_published boolean)
 RETURNS kisan_sawaal
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.kisan_sawaal%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.kisan_sawaal set is_published = p_published where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$function$
;

-- guard: admin_set_site_setting(uuid,text,jsonb)
CREATE OR REPLACE FUNCTION public.admin_set_site_setting(p_actor_id uuid, p_key text, p_value jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin perform public.require_admin(p_actor_id);
  insert into public.site_settings (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now(); end $function$
;

-- guard: admin_set_subscription_active(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.admin_set_subscription_active(p_actor_id uuid, p_id uuid, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin perform public.require_admin(p_actor_id);
  update public.alert_subscriptions set is_active = p_active where id = p_id; end $function$
;

-- guard: admin_set_video_active(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.admin_set_video_active(p_actor_id uuid, p_id uuid, p_active boolean)
 RETURNS videos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.videos%rowtype;
begin perform public.require_admin(p_actor_id);
  update public.videos set is_active=p_active where id=p_id returning * into v; return v; end $function$
;

-- guard: admin_set_yojana_active(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.admin_set_yojana_active(p_actor_id uuid, p_id uuid, p_active boolean)
 RETURNS sarkari_yojana
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.sarkari_yojana%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.sarkari_yojana set is_active = p_active where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$function$
;

-- guard: admin_set_yojana_featured(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.admin_set_yojana_featured(p_actor_id uuid, p_id uuid, p_featured boolean)
 RETURNS sarkari_yojana
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.sarkari_yojana%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.sarkari_yojana set is_featured = p_featured where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$function$
;

-- guard: admin_split_mela(uuid,uuid)
CREATE OR REPLACE FUNCTION public.admin_split_mela(p_actor_id uuid, p_id uuid)
 RETURNS kisan_mela
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare m public.kisan_mela%rowtype; surv uuid; v public.kisan_mela%rowtype;
begin
  perform public.require_admin(p_actor_id);
  select * into m from public.kisan_mela where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if m.merged_into is null then return m; end if; -- not merged; nothing to do
  surv := m.merged_into;
  -- Move interest marks that originally belonged to p_id back to it, skipping any that would collide.
  update public.kisan_mela_interest ki set mela_id = p_id, original_mela_id = null
    where ki.mela_id = surv and ki.original_mela_id = p_id
      and not exists (select 1 from public.kisan_mela_interest x where x.mela_id = p_id and x.user_id = ki.user_id);
  update public.kisan_mela set is_active = true, merged_into = null, merge_reason = null, merged_at = null where id = p_id
    returning * into v;
  insert into public.mela_merge_exclusions (pair_key, id_a, id_b)
    values ((select string_agg(x, '::' order by x) from unnest(array[p_id::text, surv::text]) x), p_id, surv)
    on conflict (pair_key) do nothing;
  return v;
end; $function$
;

-- guard: admin_update_cs_directory(uuid,bigint,jsonb)
CREATE OR REPLACE FUNCTION public.admin_update_cs_directory(p_actor_id uuid, p_id bigint, p_patch jsonb)
 RETURNS cold_storage_directory
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare r public.cold_storage_directory%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.cold_storage_directory set
    name            = coalesce(p_patch->>'name', name),
    city            = coalesce(p_patch->>'city', city),
    district        = coalesce(p_patch->>'district', district),
    address         = coalesce(p_patch->>'address', address),
    phone           = coalesce(p_patch->>'phone', phone),
    products        = coalesce(p_patch->>'products', products),
    capacity        = coalesce(p_patch->>'capacity', capacity),
    type            = coalesce(p_patch->>'type', type),
    space_available = coalesce(p_patch->>'space_available', space_available),
    space_updated   = coalesce((p_patch->>'space_updated')::date, space_updated),
    status          = coalesce(p_patch->>'status', status),
    updated_at      = now()
  where id = p_id returning * into r;
  if not found then raise exception 'not_found'; end if;
  return r;
end;
$function$
;

-- guard: admin_upsert_article(uuid,uuid,text,text,text,text,text,text,text,text,text,boolean)
CREATE OR REPLACE FUNCTION public.admin_upsert_article(p_actor_id uuid, p_id uuid, p_slug text, p_title_hi text, p_title_en text, p_summary_hi text, p_summary_en text, p_content_hi text, p_content_en text, p_author_name text, p_cover_image_url text, p_is_published boolean)
 RETURNS articles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.articles%rowtype; v_pub boolean := coalesce(p_is_published, false);
begin
  perform public.require_admin(p_actor_id);
  if coalesce(trim(p_slug),'')='' or coalesce(trim(p_title_hi),'')='' or coalesce(trim(p_title_en),'')=''
     or coalesce(trim(p_content_hi),'')='' or coalesce(trim(p_content_en),'')='' then
    raise exception 'article_fields_required';
  end if;
  if p_id is null then
    insert into public.articles (slug, title_hi, title_en, summary_hi, summary_en, content_hi, content_en, author_name, cover_image_url, is_published, published_at)
    values (trim(p_slug), p_title_hi, p_title_en, p_summary_hi, p_summary_en, p_content_hi, p_content_en,
            coalesce(nullif(trim(p_author_name),''), 'Team Kissan Sahyog'), p_cover_image_url, v_pub,
            case when v_pub then now() else null end)
    returning * into v;
  else
    update public.articles set
      slug = trim(p_slug), title_hi = p_title_hi, title_en = p_title_en,
      summary_hi = p_summary_hi, summary_en = p_summary_en, content_hi = p_content_hi, content_en = p_content_en,
      author_name = coalesce(nullif(trim(p_author_name),''), 'Team Kissan Sahyog'), cover_image_url = p_cover_image_url,
      is_published = v_pub,
      published_at = case when v_pub and published_at is null then now()
                         when not v_pub then null else published_at end
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$function$
;

-- guard: admin_upsert_event(uuid,uuid,text,text,text,text,date,text,text,boolean)
CREATE OR REPLACE FUNCTION public.admin_upsert_event(p_actor_id uuid, p_id uuid, p_title_hi text, p_title_en text, p_description_hi text, p_location text, p_event_date date, p_organizer text, p_contact text, p_is_active boolean)
 RETURNS farm_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.farm_events%rowtype;
begin perform public.require_admin(p_actor_id);
  if p_id is null then
    insert into public.farm_events (title_hi,title_en,description_hi,location,event_date,organizer,contact,is_active)
    values (p_title_hi,p_title_en,p_description_hi,p_location,p_event_date,p_organizer,p_contact,coalesce(p_is_active,true))
    returning * into v;
  else
    update public.farm_events set title_hi=p_title_hi,title_en=p_title_en,description_hi=p_description_hi,location=p_location,
      event_date=p_event_date,organizer=p_organizer,contact=p_contact,is_active=coalesce(p_is_active,true) where id=p_id returning * into v;
  end if;
  return v; end $function$
;

-- guard: admin_upsert_expert(uuid,uuid,text,text,text,text,text,text,text,text,boolean)
CREATE OR REPLACE FUNCTION public.admin_upsert_expert(p_actor_id uuid, p_id uuid, p_name text, p_name_hi text, p_specialisation_en text, p_specialisation_hi text, p_bio_en text, p_bio_hi text, p_phone text, p_organisation text, p_is_active boolean)
 RETURNS experts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.experts%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'name_required';
  end if;
  if p_id is null then
    insert into public.experts (name, name_hi, specialisation_en, specialisation_hi, bio_en, bio_hi, phone, organisation, is_active)
    values (trim(p_name), p_name_hi, p_specialisation_en, p_specialisation_hi, p_bio_en, p_bio_hi, trim(p_phone), p_organisation, coalesce(p_is_active, true))
    returning * into v;
  else
    update public.experts set
      name = trim(p_name), name_hi = p_name_hi, specialisation_en = p_specialisation_en,
      specialisation_hi = p_specialisation_hi, bio_en = p_bio_en, bio_hi = p_bio_hi,
      phone = trim(p_phone), organisation = p_organisation, is_active = coalesce(p_is_active, true)
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$function$
;

-- guard: admin_upsert_input_price(uuid,uuid,text,text,text,text,numeric,text,date,boolean)
CREATE OR REPLACE FUNCTION public.admin_upsert_input_price(p_actor_id uuid, p_id uuid, p_item_hi text, p_item_en text, p_shop_name text, p_location text, p_price numeric, p_unit text, p_updated_date date, p_is_active boolean)
 RETURNS input_prices
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.input_prices%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if coalesce(trim(p_item_hi), '') = '' then raise exception 'name_required'; end if;
  if coalesce(trim(p_shop_name), '') = '' then raise exception 'shop_required'; end if;
  if p_price is null or p_price <= 0 then raise exception 'invalid_price'; end if;
  if p_id is null then
    insert into public.input_prices (item_hi, item_en, shop_name, location, price, unit, updated_date, is_active)
    values (trim(p_item_hi), nullif(trim(coalesce(p_item_en, '')), ''), trim(p_shop_name),
            nullif(trim(coalesce(p_location, '')), ''), p_price, coalesce(nullif(trim(p_unit), ''), 'बोरी'),
            coalesce(p_updated_date, current_date), coalesce(p_is_active, true))
    returning * into v;
  else
    update public.input_prices set
      item_hi = trim(p_item_hi), item_en = nullif(trim(coalesce(p_item_en, '')), ''),
      shop_name = trim(p_shop_name), location = nullif(trim(coalesce(p_location, '')), ''),
      price = p_price, unit = coalesce(nullif(trim(p_unit), ''), 'बोरी'),
      updated_date = coalesce(p_updated_date, current_date), is_active = coalesce(p_is_active, true)
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$function$
;

-- guard: admin_upsert_mela(uuid,uuid,text,text,text,text,text,text,text,numeric,numeric,date,date,boolean,text,text[],text,text,text,text,text,text,boolean)
CREATE OR REPLACE FUNCTION public.admin_upsert_mela(p_actor_id uuid, p_id uuid, p_name_hi text, p_name_en text, p_organizer_name text, p_venue text, p_address text, p_state text, p_district text, p_latitude numeric, p_longitude numeric, p_event_date_start date, p_event_date_end date, p_is_date_confirmed boolean, p_expected_period text, p_category_tags text[], p_highlights_hi text, p_highlights_en text, p_contact_name text, p_contact_number text, p_source_url text, p_moderation_status text, p_is_active boolean)
 RETURNS kisan_mela
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.kisan_mela%rowtype;
  v_status text := coalesce(nullif(trim(p_moderation_status), ''), 'approved');
begin
  perform public.require_admin(p_actor_id);
  if v_status not in ('pending', 'approved', 'rejected') then raise exception 'invalid_status'; end if;
  if p_id is null then
    insert into public.kisan_mela (
      name_hi, name_en, organizer_name, venue, address, state, district, latitude, longitude,
      event_date_start, event_date_end, is_date_confirmed, expected_period, category_tags,
      highlights_hi, highlights_en, contact_name, contact_number, source_url,
      last_checked_date, submitted_by_user, moderation_status, is_active
    ) values (
      p_name_hi, p_name_en, p_organizer_name, p_venue, p_address, p_state, p_district, p_latitude, p_longitude,
      p_event_date_start, p_event_date_end, coalesce(p_is_date_confirmed, false), p_expected_period, coalesce(p_category_tags, '{}'),
      p_highlights_hi, p_highlights_en, p_contact_name, p_contact_number, p_source_url,
      current_date, false, v_status, coalesce(p_is_active, true)
    ) returning * into v;
  else
    update public.kisan_mela set
      name_hi = p_name_hi, name_en = p_name_en, organizer_name = p_organizer_name,
      venue = p_venue, address = p_address, state = p_state, district = p_district,
      latitude = p_latitude, longitude = p_longitude,
      event_date_start = p_event_date_start, event_date_end = p_event_date_end,
      is_date_confirmed = coalesce(p_is_date_confirmed, false), expected_period = p_expected_period,
      category_tags = coalesce(p_category_tags, '{}'),
      highlights_hi = p_highlights_hi, highlights_en = p_highlights_en,
      contact_name = p_contact_name, contact_number = p_contact_number, source_url = p_source_url,
      last_checked_date = current_date, moderation_status = v_status, is_active = coalesce(p_is_active, true)
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$function$
;

-- guard: admin_upsert_msp(uuid,uuid,text,text,text,text,text,numeric,numeric,boolean)
CREATE OR REPLACE FUNCTION public.admin_upsert_msp(p_actor_id uuid, p_id uuid, p_crop_en text, p_crop_hi text, p_variety text, p_season text, p_marketing_year text, p_msp_per_quintal numeric, p_increase_from_previous numeric, p_is_active boolean)
 RETURNS msp_prices
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.msp_prices%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if p_season not in ('kharif', 'rabi', 'commercial') then raise exception 'invalid_season'; end if;
  if coalesce(trim(p_crop_en), '') = '' or coalesce(trim(p_crop_hi), '') = '' then raise exception 'name_required'; end if;
  if p_id is null then
    insert into public.msp_prices (crop_en, crop_hi, variety, season, marketing_year, msp_per_quintal, increase_from_previous, is_active)
    values (trim(p_crop_en), trim(p_crop_hi), nullif(trim(coalesce(p_variety, '')), ''), p_season, p_marketing_year, p_msp_per_quintal, p_increase_from_previous, coalesce(p_is_active, true))
    returning * into v;
  else
    update public.msp_prices set
      crop_en = trim(p_crop_en), crop_hi = trim(p_crop_hi), variety = nullif(trim(coalesce(p_variety, '')), ''),
      season = p_season, marketing_year = p_marketing_year, msp_per_quintal = p_msp_per_quintal,
      increase_from_previous = p_increase_from_previous, is_active = coalesce(p_is_active, true), updated_at = now()
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$function$
;

-- guard: admin_upsert_page_faq(uuid,uuid,text,text,text,text,text,integer)
CREATE OR REPLACE FUNCTION public.admin_upsert_page_faq(p_actor_id uuid, p_id uuid, p_page_key text, p_q_hi text, p_q_en text, p_a_hi text, p_a_en text, p_sort_order integer)
 RETURNS page_faqs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.page_faqs%rowtype;
begin perform public.require_admin(p_actor_id);
  if p_id is null then
    insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values (p_page_key,p_q_hi,p_q_en,p_a_hi,p_a_en,coalesce(p_sort_order,0)) returning * into v;
  else
    update public.page_faqs set page_key=p_page_key,q_hi=p_q_hi,q_en=p_q_en,a_hi=p_a_hi,a_en=p_a_en,sort_order=coalesce(p_sort_order,0) where id=p_id returning * into v;
  end if;
  return v; end $function$
;

-- guard: admin_upsert_procurement(uuid,uuid,text,text,text,text[],text,date,date,date,date,text,text,boolean)
CREATE OR REPLACE FUNCTION public.admin_upsert_procurement(p_actor_id uuid, p_id uuid, p_name_hi text, p_location text, p_district text, p_crops text[], p_season text, p_registration_open date, p_registration_close date, p_procurement_from date, p_procurement_to date, p_portal_url text, p_notes_hi text, p_is_active boolean)
 RETURNS procurement_centres
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.procurement_centres%rowtype;
begin perform public.require_admin(p_actor_id);
  if p_id is null then
    insert into public.procurement_centres (name_hi,location,district,crops,season,registration_open,registration_close,procurement_from,procurement_to,portal_url,notes_hi,is_active,updated_at)
    values (p_name_hi,p_location,coalesce(p_district,'Sagar'),coalesce(p_crops,'{}'),p_season,p_registration_open,p_registration_close,p_procurement_from,p_procurement_to,p_portal_url,p_notes_hi,coalesce(p_is_active,true),now())
    returning * into v;
  else
    update public.procurement_centres set name_hi=p_name_hi,location=p_location,district=coalesce(p_district,'Sagar'),crops=coalesce(p_crops,'{}'),
      season=p_season,registration_open=p_registration_open,registration_close=p_registration_close,procurement_from=p_procurement_from,
      procurement_to=p_procurement_to,portal_url=p_portal_url,notes_hi=p_notes_hi,is_active=coalesce(p_is_active,true),updated_at=now()
    where id=p_id returning * into v;
  end if;
  return v; end $function$
;

-- guard: admin_upsert_resource(uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,integer)
CREATE OR REPLACE FUNCTION public.admin_upsert_resource(p_actor_id uuid, p_id uuid, p_resource_type text, p_name_hi text, p_name_en text, p_description_hi text, p_description_en text, p_address_hi text, p_address_en text, p_district text, p_area text, p_phone_primary text, p_phone_secondary text, p_phone_tollfree text, p_email text, p_website text, p_timings_hi text, p_timings_en text, p_is_active boolean, p_sort_order integer)
 RETURNS resources
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.resources%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if p_resource_type not in ('soil_lab', 'veterinary', 'govt_office') then raise exception 'invalid_resource_type'; end if;
  if coalesce(trim(p_name_hi), '') = '' or coalesce(trim(p_name_en), '') = '' then raise exception 'name_required'; end if;
  if p_id is null then
    insert into public.resources (resource_type, name_hi, name_en, description_hi, description_en, address_hi, address_en,
      district, area, phone_primary, phone_secondary, phone_tollfree, email, website, timings_hi, timings_en, is_active, sort_order)
    values (p_resource_type, p_name_hi, p_name_en, p_description_hi, p_description_en, p_address_hi, p_address_en,
      coalesce(nullif(trim(p_district),''),'Sagar'), p_area, p_phone_primary, p_phone_secondary, p_phone_tollfree, p_email, p_website,
      p_timings_hi, p_timings_en, coalesce(p_is_active, true), coalesce(p_sort_order, 0))
    returning * into v;
  else
    update public.resources set
      resource_type = p_resource_type, name_hi = p_name_hi, name_en = p_name_en,
      description_hi = p_description_hi, description_en = p_description_en, address_hi = p_address_hi, address_en = p_address_en,
      district = coalesce(nullif(trim(p_district),''),'Sagar'), area = p_area,
      phone_primary = p_phone_primary, phone_secondary = p_phone_secondary, phone_tollfree = p_phone_tollfree,
      email = p_email, website = p_website, timings_hi = p_timings_hi, timings_en = p_timings_en,
      is_active = coalesce(p_is_active, true), sort_order = coalesce(p_sort_order, 0)
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$function$
;

-- guard: admin_upsert_safalta(uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean)
CREATE OR REPLACE FUNCTION public.admin_upsert_safalta(p_actor_id uuid, p_id uuid, p_farmer_name text, p_village text, p_district text, p_crop_or_activity text, p_story_hi text, p_story_en text, p_income_before text, p_income_after text, p_how_helped_hi text, p_how_helped_en text, p_photo_url text, p_is_published boolean, p_is_featured boolean)
 RETURNS kisan_safalta
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.kisan_safalta%rowtype; v_pub boolean := coalesce(p_is_published, false);
begin
  perform public.require_admin(p_actor_id);
  if coalesce(trim(p_farmer_name), '') = '' or coalesce(trim(p_story_hi), '') = ''
     or coalesce(trim(p_how_helped_hi), '') = '' then
    raise exception 'story_fields_required';
  end if;
  if p_id is null then
    insert into public.kisan_safalta (farmer_name, village, district, crop_or_activity, story_hi, story_en,
      income_before, income_after, how_helped_hi, how_helped_en, photo_url, is_published, is_featured, published_at)
    values (p_farmer_name, p_village, coalesce(nullif(trim(p_district), ''), 'Sagar'), p_crop_or_activity,
      p_story_hi, p_story_en, p_income_before, p_income_after, p_how_helped_hi, p_how_helped_en, p_photo_url,
      v_pub, coalesce(p_is_featured, false), case when v_pub then now() else null end)
    returning * into v;
  else
    update public.kisan_safalta set
      farmer_name = p_farmer_name, village = p_village, district = coalesce(nullif(trim(p_district), ''), 'Sagar'),
      crop_or_activity = p_crop_or_activity, story_hi = p_story_hi, story_en = p_story_en,
      income_before = p_income_before, income_after = p_income_after,
      how_helped_hi = p_how_helped_hi, how_helped_en = p_how_helped_en, photo_url = p_photo_url,
      is_published = v_pub, is_featured = coalesce(p_is_featured, false),
      published_at = case when v_pub and published_at is null then now() when not v_pub then null else published_at end
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$function$
;

-- guard: admin_upsert_video(uuid,uuid,text,text,text,text,text,text,text,boolean,boolean,integer)
CREATE OR REPLACE FUNCTION public.admin_upsert_video(p_actor_id uuid, p_id uuid, p_youtube_id text, p_title_hi text, p_title_en text, p_channel_name text, p_duration text, p_category text, p_thumbnail_url text, p_is_featured boolean, p_is_active boolean, p_sort_order integer)
 RETURNS videos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.videos%rowtype;
begin perform public.require_admin(p_actor_id);
  if p_id is null then
    insert into public.videos (youtube_id,title_hi,title_en,channel_name,duration,category,thumbnail_url,is_featured,is_active,sort_order)
    values (p_youtube_id,p_title_hi,p_title_en,p_channel_name,p_duration,p_category,p_thumbnail_url,coalesce(p_is_featured,false),coalesce(p_is_active,true),coalesce(p_sort_order,0))
    returning * into v;
  else
    update public.videos set youtube_id=p_youtube_id,title_hi=p_title_hi,title_en=p_title_en,channel_name=p_channel_name,
      duration=p_duration,category=p_category,thumbnail_url=p_thumbnail_url,is_featured=coalesce(p_is_featured,false),
      is_active=coalesce(p_is_active,true),sort_order=coalesce(p_sort_order,0) where id=p_id returning * into v;
  end if;
  return v; end $function$
;

-- guard: admin_upsert_yojana(uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,integer,text,text,jsonb,text,text,text,date)
CREATE OR REPLACE FUNCTION public.admin_upsert_yojana(p_actor_id uuid, p_id uuid, p_scheme_name_hi text, p_scheme_name_en text, p_ministry_hi text, p_ministry_en text, p_category text, p_description_hi text, p_description_en text, p_benefit_hi text, p_benefit_en text, p_eligibility_hi text, p_eligibility_en text, p_how_to_apply_hi text, p_how_to_apply_en text, p_official_website text, p_helpline text, p_deadline_note_hi text, p_deadline_note_en text, p_is_active boolean, p_is_featured boolean, p_sort_order integer, p_slug text, p_government_level text, p_faqs jsonb, p_documents_required_hi text, p_documents_required_en text, p_source_url text, p_last_verified_date date)
 RETURNS sarkari_yojana
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.sarkari_yojana%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if p_slug in ('central','mp') then raise exception 'slug_reserved'; end if;
  if p_id is null then
    insert into public.sarkari_yojana (
      scheme_name_hi, scheme_name_en, ministry_hi, ministry_en, category,
      description_hi, description_en, benefit_hi, benefit_en, eligibility_hi, eligibility_en,
      how_to_apply_hi, how_to_apply_en, official_website, helpline, deadline_note_hi, deadline_note_en,
      is_active, is_featured, sort_order, slug, government_level, faqs,
      documents_required_hi, documents_required_en, source_url, last_verified_date
    ) values (
      p_scheme_name_hi, p_scheme_name_en, p_ministry_hi, p_ministry_en, p_category,
      p_description_hi, p_description_en, p_benefit_hi, p_benefit_en, p_eligibility_hi, p_eligibility_en,
      p_how_to_apply_hi, p_how_to_apply_en, p_official_website, p_helpline, p_deadline_note_hi, p_deadline_note_en,
      coalesce(p_is_active,true), coalesce(p_is_featured,false), coalesce(p_sort_order,0),
      p_slug, coalesce(p_government_level,'central'), coalesce(p_faqs,'[]'::jsonb),
      p_documents_required_hi, p_documents_required_en, p_source_url, p_last_verified_date
    ) returning * into v;
  else
    update public.sarkari_yojana set
      scheme_name_hi=p_scheme_name_hi, scheme_name_en=p_scheme_name_en, ministry_hi=p_ministry_hi, ministry_en=p_ministry_en,
      category=p_category, description_hi=p_description_hi, description_en=p_description_en,
      benefit_hi=p_benefit_hi, benefit_en=p_benefit_en, eligibility_hi=p_eligibility_hi, eligibility_en=p_eligibility_en,
      how_to_apply_hi=p_how_to_apply_hi, how_to_apply_en=p_how_to_apply_en, official_website=p_official_website,
      helpline=p_helpline, deadline_note_hi=p_deadline_note_hi, deadline_note_en=p_deadline_note_en,
      is_active=coalesce(p_is_active,true), is_featured=coalesce(p_is_featured,false), sort_order=coalesce(p_sort_order,0),
      slug=p_slug, government_level=coalesce(p_government_level,'central'), faqs=coalesce(p_faqs,'[]'::jsonb),
      documents_required_hi=p_documents_required_hi, documents_required_en=p_documents_required_en,
      source_url=p_source_url, last_verified_date=p_last_verified_date
    where id=p_id returning * into v;
  end if;
  return v;
end $function$
;

-- gate: app_login(text)
CREATE OR REPLACE FUNCTION public.app_login(p_phone text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_phone   text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_profile public.profiles%rowtype;
begin
  if v_phone !~ '^[0-9]{10}$' then
    raise exception 'invalid_phone';
  end if;

  if public.login_is_locked(v_phone) then
    raise exception 'too_many_attempts';
  end if;

  select * into v_profile from public.profiles where phone = v_phone;

  if not found or v_profile.is_admin is true then
    perform public.login_record_attempt(v_phone, false);
    return null;
  end if;

  perform public.login_record_attempt(v_phone, true);
  return v_profile;
end;
$function$
;

-- gate: app_register_phone(text,text,text,numeric,numeric,text,boolean,boolean)
CREATE OR REPLACE FUNCTION public.app_register_phone(p_full_name text, p_phone text, p_village_town text, p_latitude numeric, p_longitude numeric, p_language text, p_disclaimer_accepted boolean, p_show_details boolean)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_phone      text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_lang       text := case when p_language in ('hi', 'en') then p_language else 'hi' end;
  v_lat        numeric := p_latitude;
  v_lng        numeric := p_longitude;
  v_profile    public.profiles%rowtype;
begin
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'name_required';
  end if;
  if v_phone !~ '^[0-9]{10}$' then
    raise exception 'invalid_phone';
  end if;
  if p_disclaimer_accepted is not true then
    raise exception 'disclaimer_not_accepted';
  end if;
  if v_lat is null or v_lng is null or abs(v_lat) > 90 or abs(v_lng) > 180 then
    v_lat := null;
    v_lng := null;
  end if;

  if exists (select 1 from public.profiles where phone = v_phone) then
    raise exception 'phone_exists';
  end if;

  begin
    insert into public.profiles (
      full_name, phone, email, auth_uid, auth_provider,
      village_town, pincode, latitude, longitude, preferred_language,
      disclaimer_accepted_at, consents
    ) values (
      trim(p_full_name), v_phone, null, null, 'phone',
      nullif(trim(coalesce(p_village_town, '')), ''), null, v_lat, v_lng, v_lang,
      now(),
      jsonb_build_object('details_visibility', jsonb_build_object(
        'choice', case when p_show_details is false then 'hidden' else 'show' end,
        'chosen_at', now()::text,
        'version', '2026-10'
      ))
    )
    returning * into v_profile;
  exception when unique_violation then
    raise exception 'phone_exists';
  end;

  return v_profile;
end;
$function$
;

-- gate: app_signup(text,text,text,text,text,boolean)
CREATE OR REPLACE FUNCTION public.app_signup(p_full_name text, p_phone text, p_village_town text, p_pincode text, p_language text, p_disclaimer_accepted boolean)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_phone   text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_lang    text := case when p_language in ('hi', 'en') then p_language else 'hi' end;
  v_pin     public.pincodes%rowtype;
  v_profile public.profiles%rowtype;
begin
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'name_required';
  end if;
  if v_phone !~ '^[0-9]{10}$' then
    raise exception 'invalid_phone';
  end if;
  if p_disclaimer_accepted is not true then
    raise exception 'disclaimer_not_accepted';
  end if;

  select * into v_pin from public.pincodes where pincode = p_pincode;
  if not found then
    raise exception 'pincode_not_found';
  end if;

  begin
    insert into public.profiles (
      full_name, phone, village_town, pincode,
      latitude, longitude, preferred_language, disclaimer_accepted_at
    ) values (
      trim(p_full_name), v_phone, nullif(trim(coalesce(p_village_town, '')), ''), p_pincode,
      v_pin.latitude, v_pin.longitude, v_lang, now()
    )
    returning * into v_profile;
  exception when unique_violation then
    raise exception 'phone_exists';
  end;

  return v_profile;
end;
$function$
;

-- guard: close_listing(uuid,uuid)
CREATE OR REPLACE FUNCTION public.close_listing(p_actor_id uuid, p_listing_id uuid)
 RETURNS listings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_listing public.listings%rowtype;
begin
  select * into v_listing from public.listings where id = p_listing_id;
  if not found then
    raise exception 'not_found';
  end if;
  if v_listing.user_id <> p_actor_id then
    raise exception 'not_owner';
  end if;

  update public.listings set status = 'closed'
  where id = p_listing_id
  returning * into v_listing;

  return v_listing;
end;
$function$
;

-- guard: create_listing_with_location(uuid,text,text,jsonb,numeric,numeric,text,boolean,text,boolean,text,boolean,uuid,boolean)
CREATE OR REPLACE FUNCTION public.create_listing_with_location(p_actor_id uuid, p_listing_type text, p_category text, p_details jsonb, p_latitude numeric, p_longitude numeric, p_pincode text, p_self_declared boolean, p_listing_source text DEFAULT 'farmer'::text, p_wide_visibility boolean DEFAULT false, p_village_name text DEFAULT NULL::text, p_rules_agreed boolean DEFAULT false, p_client_request_id uuid DEFAULT NULL::uuid, p_contact_consent boolean DEFAULT false)
 RETURNS listings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_listing public.listings%rowtype;
  v_consent boolean := coalesce(p_contact_consent, false)
    and (p_listing_source = 'vendor' or (p_listing_type = 'offer' and p_category in ('equipment', 'warehouse', 'greenhouse', 'jugaad')));
  v_hidden  boolean;
  v_phone   text;
  v_details jsonb := p_details;
  -- Batch 9C: mandatory spec fields per equipment type (generated from catalog.js equipmentServerRules()).
  v_rules   constant jsonb := '{"Tractor":{"brand":"brand","model":"text","year":"year","power_hp":"gt:0:500"},"Pit Digging Tractor":{"brand":"brand","model":"text","year":"year","power_hp":"gt:0:500","spec_auger_size":"text"},"Crane Tractor":{"brand":"brand","model":"text","year":"year","power_hp":"gt:0:500","spec_lifting_capacity":"text"},"Thresher":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500","spec_crop":"text"},"Harvester":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500","spec_cutting_width":"text","spec_crop":"text"},"Rotavator":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500","spec_working_width":"text"},"Seed Drill":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500","spec_rows":"int:1:100"},"Reaper":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500","spec_working_width":"text"},"Paddy Planting Machine":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500","spec_rows":"int:1:100"},"Blower":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500"},"LCB (Straw Machine)":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500"},"JCB / Excavator":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500","spec_bucket_size":"text"},"Drone":{"brand":"text","model":"text","year":"year","spec_tank_litres":"gt:0:1000","spec_flight_minutes":"gt:0:600"},"Other":{"brand":"text","model":"text","year":"year","power_hp":"ge:0:500","spec_machine_name":"text"}}'::jsonb;
  v_type    text;
  v_rule    jsonb;
  v_key     text;
  v_kind    text;
  v_val     text;
  v_bad     boolean;
begin
  -- A retry of a Post that already went through: hand back the same listing, create nothing.
  if p_client_request_id is not null then
    select * into v_listing from public.listings
      where user_id = p_actor_id and client_request_id = p_client_request_id;
    if found then return v_listing; end if;
  end if;

  -- Batch 9C: an equipment OFFER from the new form must carry its type's specs.
  if p_category = 'equipment' and p_listing_type = 'offer' and coalesce(p_details->>'spec_version', '') = '1' then
    if coalesce(p_details->>'equipment_type_id', '') ~ '^[0-9]{1,9}$' then
      select et.name_en into v_type from public.equipment_types et
        where et.id = (p_details->>'equipment_type_id')::int;
    end if;
    v_rule := case when v_type is null then null else v_rules -> v_type end;
    if v_rule is not null then
      for v_key, v_kind in select r.key, r.value #>> '{}' from jsonb_each(v_rule) r loop
        v_val := trim(coalesce(p_details->>v_key, ''));
        if v_val = '' then raise exception 'equipment_spec_invalid:%:required', v_key; end if;
        v_bad := false;
        if v_kind = 'brand' then
          if v_val = 'other' and trim(coalesce(p_details->>'brand_other', '')) = '' then
            raise exception 'equipment_spec_invalid:brand_other:required';
          end if;
        elsif v_kind = 'year' then
          if v_val !~ '^[0-9]{4}$' then
            v_bad := true;
          elsif v_val::int < 1990 or v_val::int > extract(year from (now() at time zone 'Asia/Kolkata'))::int + 1 then
            v_bad := true;
          end if;
        elsif v_kind like 'int:%' then
          if v_val !~ '^[0-9]{1,9}$' then
            v_bad := true;
          elsif v_val::numeric < split_part(v_kind, ':', 2)::numeric or v_val::numeric > split_part(v_kind, ':', 3)::numeric then
            v_bad := true;
          end if;
        elsif v_kind like 'gt:%' or v_kind like 'ge:%' then
          if v_val !~ '^[0-9]{1,12}(\.[0-9]{1,12})?$' then
            v_bad := true;
          elsif v_val::numeric > split_part(v_kind, ':', 3)::numeric then
            v_bad := true;
          elsif v_kind like 'gt:%' and v_val::numeric <= split_part(v_kind, ':', 2)::numeric then
            v_bad := true;
          elsif v_kind like 'ge:%' and v_val::numeric < split_part(v_kind, ':', 2)::numeric then
            v_bad := true;
          end if;
        end if;
        if v_bad then raise exception 'equipment_spec_invalid:%:range', v_key; end if;
      end loop;
    end if;
  end if;

  if p_category = 'transport' then
    if nullif(trim(coalesce(p_details->>'from_location', '')), '') is null then raise exception 'transport_from_required'; end if;
    if nullif(trim(coalesce(p_details->>'to_location', '')), '') is null then raise exception 'transport_to_required'; end if;
  end if;

  -- F1: keep a hidden owner's shop number out of the public listing data unless they agreed.
  if p_category = 'agri_inputs' and not v_consent then
    select coalesce(p.consents #>> '{details_visibility,choice}', '') = 'hidden' into v_hidden
      from public.profiles p where p.id = p_actor_id;
    v_phone := nullif(trim(coalesce(p_details->>'contact_phone', '')), '');
    if coalesce(v_hidden, false) and v_phone is not null then
      v_details := jsonb_set(p_details, '{contact_phone}', '""'::jsonb, true);
    else
      v_phone := null;
    end if;
  end if;

  begin
    select * into v_listing from public.create_listing(
      p_actor_id, p_listing_type, p_category, v_details, p_latitude, p_longitude,
      p_pincode, p_self_declared, p_listing_source, p_wide_visibility,
      p_village_name, p_rules_agreed
    );

    if v_phone is not null then
      insert into public.listing_private_contact (listing_id, contact_phone)
        values (v_listing.id, v_phone)
        on conflict (listing_id) do update set contact_phone = excluded.contact_phone;
    end if;

    if (p_latitude is not null and p_longitude is not null) or p_client_request_id is not null or v_consent then
      update public.listings
      set latitude = case when p_latitude is not null and p_longitude is not null then p_latitude else latitude end,
          longitude = case when p_latitude is not null and p_longitude is not null then p_longitude else longitude end,
          geocoding_status = case when p_latitude is not null and p_longitude is not null then 'resolved' else geocoding_status end,
          client_request_id = coalesce(p_client_request_id, client_request_id),
          contact_consent_at = case when v_consent then now() else contact_consent_at end
      where id = v_listing.id and user_id = p_actor_id
      returning * into v_listing;
    end if;
  exception when unique_violation then
    -- Two submits with the same id raced; the other one won. Everything this call created in the
    -- block above (listing + private contact row) is rolled back; return the winner as success.
    if p_client_request_id is null then raise; end if;
    select * into v_listing from public.listings
      where user_id = p_actor_id and client_request_id = p_client_request_id;
    if not found then raise; end if;
  end;
  return v_listing;
end;
$function$
;

-- guard: create_listing(uuid,text,text,jsonb,numeric,numeric,text,boolean,text,boolean,text,boolean)
CREATE OR REPLACE FUNCTION public.create_listing(p_actor_id uuid, p_listing_type text, p_category text, p_details jsonb, p_latitude numeric, p_longitude numeric, p_pincode text, p_self_declared boolean, p_listing_source text DEFAULT 'farmer'::text, p_wide_visibility boolean DEFAULT false, p_village_name text DEFAULT NULL::text, p_rules_agreed boolean DEFAULT false)
 RETURNS listings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_actor    public.profiles%rowtype;
  v_listing  public.listings%rowtype;
  v_lat      numeric;
  v_long     numeric;
  v_pin      text;
  v_pinrow   public.pincodes%rowtype;
  v_subtype  text;
  v_inputs   int;
  v_services int;
  v_is_tanker boolean := false;
  v_source   text := case when p_listing_source in ('farmer', 'vendor') then p_listing_source else 'farmer' end;
  v_wide     boolean := coalesce(p_wide_visibility, false);
  v_village  text := nullif(trim(coalesce(p_village_name, '')), '');
  v_district text := 'Sagar';
  v_geo      text := 'resolved';
  v_contact  text := case when p_category = 'land' then nullif(trim(coalesce(p_details->>'contact_phone', '')), '') else null end;
  v_details  jsonb := case when p_category = 'land' then coalesce(p_details, '{}'::jsonb) - 'contact_phone' else coalesce(p_details, '{}'::jsonb) end;
begin
  if p_rules_agreed is not true then raise exception 'rules_not_agreed'; end if;

  select * into v_actor from public.profiles where id = p_actor_id;
  if not found then raise exception 'not_authorized'; end if;
  if v_actor.disclaimer_accepted_at is null then raise exception 'disclaimer_not_accepted'; end if;
  if p_listing_type not in ('offer', 'requirement') then raise exception 'invalid_listing_type'; end if;
  if p_category not in ('land', 'equipment', 'labor', 'drone_didi', 'bhusa', 'agri_inputs', 'warehouse', 'transport', 'greenhouse', 'jugaad', 'building_materials') then
    raise exception 'invalid_category';
  end if;
  if v_wide and p_category not in ('bhusa', 'agri_inputs', 'building_materials', 'warehouse', 'greenhouse') then
    raise exception 'wide_visibility_not_allowed';
  end if;

  if p_listing_type = 'offer' and p_category in ('equipment', 'warehouse', 'greenhouse', 'jugaad')
     and (p_details ? 'provider_declared')
     and coalesce(p_details->>'provider_declared', '') <> 'true' then
    raise exception 'provider_declaration_required';
  end if;

  v_pin := nullif(trim(coalesce(p_pincode, '')), '');
  if v_village is not null then
    select latitude, longitude into v_lat, v_long from public.village_coordinates
      where lower(village_name) = lower(v_village) and lower(district) = lower(v_district) and status = 'resolved'
      limit 1;
    if v_lat is not null then
      v_geo := 'resolved';
    else
      insert into public.village_coordinates (village_name, district, status)
        values (v_village, v_district, 'pending')
        on conflict (lower(village_name), lower(district)) do nothing;
      v_lat := null; v_long := null; v_geo := 'pending';
    end if;
  elsif v_pin is not null then
    select * into v_pinrow from public.pincodes where pincode = v_pin;
    if not found then raise exception 'pincode_not_found'; end if;
    v_lat := v_pinrow.latitude; v_long := v_pinrow.longitude;
    v_village := v_pinrow.village_town; v_geo := 'resolved';
  else
    v_lat := coalesce(p_latitude, v_actor.latitude);
    v_long := coalesce(p_longitude, v_actor.longitude);
    v_pin := v_actor.pincode; v_geo := 'resolved';
  end if;

  if p_category = 'land' and p_listing_type = 'offer' and p_self_declared is not true then
    raise exception 'self_declaration_required';
  end if;
  if p_category = 'equipment' then
    if coalesce(p_details->>'equipment_type_id', '') = '' then raise exception 'equipment_type_required'; end if;
    select exists (
      select 1 from public.equipment_types et
      where et.id = nullif(p_details->>'equipment_type_id', '')::int and et.name_en = 'Water tanker'
    ) into v_is_tanker;
    if v_is_tanker and coalesce((p_details->>'capacity_litres')::numeric, 0) <= 0 then raise exception 'tanker_capacity_required'; end if;
  end if;
  if p_category = 'greenhouse' then
    if p_listing_type = 'offer' then
      if coalesce(trim(p_details->>'vendor_subtype'), '') = '' then raise exception 'vendor_subtype_required'; end if;
    else
      if coalesce(trim(p_details->>'structure_type'), '') = '' then raise exception 'gh_structure_required'; end if;
      if coalesce(trim(p_details->>'area_sqm'), '') = '' then raise exception 'gh_area_required'; end if;
    end if;
  end if;
  if p_category = 'jugaad' and p_listing_type = 'offer' then
    if coalesce(trim(p_details->>'offer_type'), '') = '' then raise exception 'jugaad_offer_type_required'; end if;
    if coalesce(trim(p_details->>'innovation_name'), '') = '' then raise exception 'jugaad_name_required'; end if;
    if coalesce(p_details->>'not_road_vehicle', '') <> 'true' then raise exception 'road_vehicle_not_allowed'; end if;
  end if;
  if p_category = 'labor' then
    if coalesce((p_details->>'worker_count')::int, 0) <= 0 then raise exception 'invalid_worker_count'; end if;
    if (p_details->>'available_from') is not null and (p_details->>'available_to') is not null
       and (p_details->>'available_from')::date > (p_details->>'available_to')::date then raise exception 'invalid_date_range'; end if;
  end if;
  if p_category = 'drone_didi' then
    if p_listing_type = 'offer' then
      if coalesce(trim(p_details->>'operator_name'), '') = '' then raise exception 'operator_name_required'; end if;
      if coalesce(trim(p_details->>'drone_type'), '') = '' then raise exception 'drone_type_required'; end if;
      if jsonb_typeof(p_details->'service_type') = 'array' then v_services := jsonb_array_length(p_details->'service_type'); else v_services := 0; end if;
      if v_services < 1 then raise exception 'service_type_required'; end if;
      if coalesce(trim(p_details->>'rate_per_acre'), '') = '' then raise exception 'rate_per_acre_required'; end if;
      if coalesce(trim(p_details->>'asset_village'), '') = '' then raise exception 'asset_village_required'; end if;
    else
      if coalesce(trim(p_details->>'crop_type'), '') = '' then raise exception 'crop_type_required'; end if;
      if coalesce(trim(p_details->>'acreage'), '') = '' then raise exception 'acreage_required'; end if;
      if coalesce(trim(p_details->>'service_needed'), '') = '' then raise exception 'service_needed_required'; end if;
      if coalesce(trim(p_details->>'asset_village'), '') = '' then raise exception 'asset_village_required'; end if;
    end if;
  end if;
  if p_category = 'bhusa' then
    if coalesce(p_details->>'residue_type', '') = '' then raise exception 'residue_type_required'; end if;
    if coalesce(trim(p_details->>'quantity'), '') = '' then raise exception 'quantity_required'; end if;
    if coalesce(p_details->>'pickup_arrangement', '') = '' then raise exception 'pickup_required'; end if;
    if coalesce(p_details->>'buyer_type_preference', '') = '' then raise exception 'buyer_type_required'; end if;
    if coalesce(trim(p_details->>'asking_price'), '') = '' then raise exception 'asking_price_required'; end if;
  end if;
  if p_category = 'agri_inputs' then
    v_subtype := coalesce(p_details->>'subtype', '');
    if v_subtype not in ('farmer_surplus', 'vendor') then raise exception 'subtype_required'; end if;
    if v_subtype = 'vendor' then
      if coalesce(trim(p_details->>'business_name'), '') = '' then raise exception 'business_name_required'; end if;
      if jsonb_typeof(p_details->'input_types') = 'array' then v_inputs := jsonb_array_length(p_details->'input_types'); else v_inputs := 0; end if;
      if v_inputs < 1 then raise exception 'input_types_required'; end if;
      if coalesce(trim(p_details->>'items_description'), '') = '' then raise exception 'items_description_required'; end if;
      if coalesce(trim(p_details->>'shop_address'), '') = '' then raise exception 'shop_address_required'; end if;
    else
      if coalesce(p_details->>'input_type', '') = '' then raise exception 'input_type_required'; end if;
      if coalesce(trim(p_details->>'item_name'), '') = '' then raise exception 'item_name_required'; end if;
      if coalesce(trim(p_details->>'quantity'), '') = '' then raise exception 'quantity_required'; end if;
      if coalesce(trim(p_details->>'asking_price'), '') = '' then raise exception 'asking_price_required'; end if;
      if coalesce(trim(p_details->>'material_address'), '') = '' then raise exception 'material_address_required'; end if;
    end if;
  end if;
  if p_category = 'warehouse' then
    if p_listing_type = 'offer' then
      if coalesce(trim(p_details->>'warehouse_type'), '') = '' then raise exception 'warehouse_type_required'; end if;
      if coalesce((p_details->>'capacity_quintals')::numeric, 0) <= 0 then raise exception 'capacity_required'; end if;
      if coalesce(trim(p_details->>'rate'), '') = '' then raise exception 'warehouse_rate_required'; end if;
      if coalesce(trim(p_details->>'address'), '') = '' then raise exception 'warehouse_address_required'; end if;
    else
      if coalesce(trim(p_details->>'crop_type'), '') = '' then raise exception 'crop_type_required'; end if;
      if coalesce((p_details->>'quantity_quintals')::numeric, 0) <= 0 then raise exception 'quantity_quintals_required'; end if;
      if coalesce(trim(p_details->>'duration'), '') = '' then raise exception 'duration_required'; end if;
    end if;
  end if;
  if p_category = 'transport' then
    if coalesce(trim(p_details->>'vehicle_type'), '') = '' then raise exception 'vehicle_type_required'; end if;
    if coalesce(trim(p_details->>'rate_basis'), '') = '' then raise exception 'transport_rate_basis_required'; end if;
  end if;
  if p_category = 'building_materials' then
    if coalesce(p_details->>'material_type', '') not in ('cement', 'sand', 'iron_rod', 'bricks', 'gravel', 'other') then raise exception 'building_material_type_required'; end if;
    if coalesce(trim(p_details->>'quantity'), '') = '' then raise exception 'building_quantity_required'; end if;
    if coalesce(p_details->>'unit', '') not in ('bag', 'ton', 'trolley', 'piece', 'kg') then raise exception 'building_unit_required'; end if;
    if p_listing_type = 'offer' and coalesce(trim(p_details->>'rate_amount'), '') = '' then raise exception 'building_rate_required'; end if;
    if coalesce(p_details->>'delivery_available', '') not in ('yes', 'no') then raise exception 'building_delivery_required'; end if;
    if coalesce(trim(p_details->>'pickup_location'), '') = '' then raise exception 'building_pickup_required'; end if;
  end if;

  insert into public.listings (
    user_id, listing_type, category, latitude, longitude, pincode, village_name, geocoding_status,
    details, self_declared, listing_source, wide_visibility
  ) values (
    p_actor_id, p_listing_type, p_category, v_lat, v_long, v_pin, v_village, v_geo,
    v_details,
    (p_category = 'land' and p_listing_type = 'offer' and p_self_declared is true),
    v_source, v_wide
  ) returning * into v_listing;

  if v_contact is not null then
    insert into public.listing_private_contact (listing_id, contact_phone)
      values (v_listing.id, v_contact)
      on conflict (listing_id) do update set contact_phone = excluded.contact_phone;
  end if;
  return v_listing;
end;
$function$
;

-- guard: delete_account(uuid)
CREATE OR REPLACE FUNCTION public.delete_account(p_actor_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_exists boolean;
begin
  select true into v_exists from public.profiles where id = p_actor_id;
  if not found then
    raise exception 'not_authorized';
  end if;
  delete from public.profiles where id = p_actor_id; -- cascades listings
  return true;
end;
$function$
;

-- guard: delete_my_listing(uuid,uuid)
CREATE OR REPLACE FUNCTION public.delete_my_listing(p_actor_id uuid, p_listing_id uuid)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.listings%rowtype; v_paths text[];
begin
  select * into v from public.listings where id = p_listing_id for update;
  if not found then raise exception 'not_found'; end if;
  if v.user_id is distinct from p_actor_id then raise exception 'not_owner'; end if;
  v_paths := public.listing_photo_paths(v.details);
  delete from public.listings where id = p_listing_id;
  perform public.queue_listing_photo_deletions(p_actor_id, v_paths);
  return v_paths;
end;
$function$
;

-- guard: get_admin_articles(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_articles(p_actor_id uuid)
 RETURNS SETOF articles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.articles order by created_at desc;
end;
$function$
;

-- guard: get_admin_availability_listings(uuid,text)
CREATE OR REPLACE FUNCTION public.get_admin_availability_listings(p_actor_id uuid, p_category text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, category text, listing_type text, is_available boolean, contact_click_count integer, village_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query
  select l.id, l.category, l.listing_type, l.is_available, l.contact_click_count, l.village_name, l.created_at
  from public.listings l
  where l.status = 'active'
    and (p_category is null or l.category = p_category)
  order by l.is_available asc, l.contact_click_count desc, l.created_at desc
  limit 300;
end;
$function$
;

-- guard: get_admin_availability(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_availability(p_actor_id uuid)
 RETURNS TABLE(category text, total bigint, available bigint, unavailable bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query
  select l.category,
         count(*) as total,
         count(*) filter (where l.is_available) as available,
         count(*) filter (where not l.is_available) as unavailable
  from public.listings l
  where l.status = 'active'
  group by l.category
  order by l.category;
end;
$function$
;

-- guard: get_admin_data_health(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_data_health(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare result jsonb;
begin perform public.require_admin(p_actor_id);
  select jsonb_build_object(
    'mandi', (select jsonb_agg(x) from (select commodity_en, max(price_date) as last_date, count(*) as rows from public.mandi_prices group by commodity_en order by commodity_en) x),
    'weather', (select jsonb_agg(x) from (select grid_key, fetched_at from public.weather_cache_v2 order by grid_key) x)
  ) into result;
  return result; end $function$
;

-- guard: get_admin_events(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_events(p_actor_id uuid)
 RETURNS SETOF farm_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin perform public.require_admin(p_actor_id);
  return query select * from public.farm_events order by event_date; end $function$
;

-- guard: get_admin_farmer_profiles(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_farmer_profiles(p_actor_id uuid)
 RETURNS TABLE(id uuid, full_name text, village_town text, pincode text, land_acres numeric, main_crops text, interest_lease boolean, interest_equipment boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query
  select p.id, p.full_name, p.village_town, p.pincode,
         p.land_acres, p.main_crops, p.interest_lease, p.interest_equipment, p.created_at
  from public.profiles p
  order by p.created_at desc;
end;
$function$
;

-- guard: get_admin_input_prices(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_input_prices(p_actor_id uuid)
 RETURNS SETOF input_prices
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.input_prices order by item_hi, shop_name;
end;
$function$
;

-- guard: get_admin_listings(uuid,integer,integer)
CREATE OR REPLACE FUNCTION public.get_admin_listings(p_actor_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, category text, listing_type text, status text, pincode text, village_town text, poster_phone text, poster_email text, created_at timestamp with time zone, admin_disabled_at timestamp with time zone, admin_disabled_reason text, photo_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query
  select l.id, l.category, l.listing_type, l.status,
         l.pincode, pc.village_town, p.phone, p.email, l.created_at,
         l.admin_disabled_at, l.admin_disabled_reason,
         coalesce(cardinality(public.listing_photo_paths(l.details)), 0)::integer
  from public.listings l
  join public.profiles p on p.id = l.user_id
  left join public.pincodes pc on pc.pincode = l.pincode
  order by l.created_at desc
  limit greatest(1, p_limit) offset greatest(0, p_offset);
end;
$function$
;

-- guard: get_admin_mela_candidates(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_mela_candidates(p_actor_id uuid)
 RETURNS SETOF kisan_mela_candidates
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.kisan_mela_candidates
    order by (verification_status = 'pending') desc,
             (verification_status in ('rejected', 'unverifiable')) desc,
             scraped_at desc;
end;
$function$
;

-- guard: get_admin_melas(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_melas(p_actor_id uuid)
 RETURNS SETOF kisan_mela
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.kisan_mela order by (moderation_status = 'pending') desc, created_at desc;
end;
$function$
;

-- guard: get_admin_msp(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_msp(p_actor_id uuid)
 RETURNS SETOF msp_prices
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.msp_prices order by season, crop_en, variety;
end;
$function$
;

-- guard: get_admin_page_faqs(uuid,text)
CREATE OR REPLACE FUNCTION public.get_admin_page_faqs(p_actor_id uuid, p_page text)
 RETURNS SETOF page_faqs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin perform public.require_admin(p_actor_id);
  return query select * from public.page_faqs where p_page is null or page_key = p_page order by page_key, sort_order; end $function$
;

-- guard: get_admin_procurement(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_procurement(p_actor_id uuid)
 RETURNS SETOF procurement_centres
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin perform public.require_admin(p_actor_id);
  return query select * from public.procurement_centres order by updated_at desc; end $function$
;

-- guard: get_admin_resources(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_resources(p_actor_id uuid)
 RETURNS SETOF resources
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.resources order by resource_type, sort_order, name_en;
end;
$function$
;

-- guard: get_admin_safalta(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_safalta(p_actor_id uuid)
 RETURNS SETOF kisan_safalta
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.kisan_safalta order by created_at desc;
end;
$function$
;

-- guard: get_admin_sawaal(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_sawaal(p_actor_id uuid)
 RETURNS SETOF kisan_sawaal
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.kisan_sawaal order by created_at desc;
end;
$function$
;

-- guard: get_admin_source_stats(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_source_stats(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v jsonb;
begin
  perform public.require_admin(p_actor_id);
  select jsonb_build_object(
    'farmer_total', (select count(*) from public.listings where listing_source = 'farmer' and status <> 'removed'),
    'vendor_total', (select count(*) from public.listings where listing_source = 'vendor' and status <> 'removed'),
    'vendor_by_category', coalesce((select jsonb_object_agg(category, c) from
      (select category, count(*) c from public.listings where listing_source = 'vendor' and status <> 'removed' group by category) s), '{}'::jsonb),
    'farmer_by_category', coalesce((select jsonb_object_agg(category, c) from
      (select category, count(*) c from public.listings where listing_source = 'farmer' and status <> 'removed' group by category) s), '{}'::jsonb)
  ) into v;
  return v;
end;
$function$
;

-- guard: get_admin_stats(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_stats(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v jsonb;
begin
  perform public.require_admin(p_actor_id);
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'active_total', (select count(*) from public.listings where status = 'active'),
    'active_by_category', coalesce((select jsonb_object_agg(category, c)
        from (select category, count(*) c from public.listings where status = 'active' group by category) s), '{}'::jsonb),
    'closed', (select count(*) from public.listings where status = 'closed'),
    'removed', (select count(*) from public.listings where status = 'removed'),
    'experts', (select count(*) from public.experts),
    'articles_published', (select count(*) from public.articles where is_published = true)
  ) into v;
  return v;
end;
$function$
;

-- guard: get_admin_subscriptions(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_subscriptions(p_actor_id uuid)
 RETURNS SETOF alert_subscriptions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin perform public.require_admin(p_actor_id);
  return query select * from public.alert_subscriptions order by consented_at desc; end $function$
;

-- guard: get_admin_unresolved_villages(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_unresolved_villages(p_actor_id uuid)
 RETURNS SETOF village_coordinates
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.village_coordinates where status in ('failed','pending','processing') order by created_at desc;
end; $function$
;

-- guard: get_admin_users(uuid,integer,integer,text)
CREATE OR REPLACE FUNCTION public.get_admin_users(p_actor_id uuid, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, full_name text, phone text, email text, village_town text, pincode text, created_at timestamp with time zone, listing_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare q text := '%' || coalesce(trim(p_search), '') || '%';
begin
  perform public.require_admin(p_actor_id);
  return query
  select p.id, p.full_name, p.phone, p.email, p.village_town, p.pincode, p.created_at,
         (select count(*) from public.listings l where l.user_id = p.id) as listing_count
  from public.profiles p
  where (coalesce(trim(p_search), '') = ''
         or p.full_name ilike q or coalesce(p.phone,'') ilike q or coalesce(p.email,'') ilike q)
  order by p.created_at desc
  limit greatest(1, p_limit) offset greatest(0, p_offset);
end;
$function$
;

-- guard: get_admin_vendor_listings(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_vendor_listings(p_actor_id uuid)
 RETURNS TABLE(id uuid, category text, listing_type text, status text, pincode text, village_town text, poster_name text, poster_phone text, poster_email text, details jsonb, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query
  select l.id, l.category, l.listing_type, l.status, l.pincode, pc.village_town,
         p.full_name, p.phone, p.email, l.details, l.created_at
  from public.listings l
  join public.profiles p on p.id = l.user_id
  left join public.pincodes pc on pc.pincode = l.pincode
  where l.listing_source = 'vendor'
  order by l.created_at desc;
end;
$function$
;

-- guard: get_admin_videos(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_videos(p_actor_id uuid)
 RETURNS SETOF videos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin perform public.require_admin(p_actor_id);
  return query select * from public.videos order by sort_order, created_at desc; end $function$
;

-- guard: get_admin_yojana(uuid)
CREATE OR REPLACE FUNCTION public.get_admin_yojana(p_actor_id uuid)
 RETURNS SETOF sarkari_yojana
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.sarkari_yojana order by sort_order, scheme_name_en;
end;
$function$
;

-- guard: get_availability_nudges(uuid)
CREATE OR REPLACE FUNCTION public.get_availability_nudges(p_actor_id uuid)
 RETURNS TABLE(id uuid, category text, listing_type text, contact_click_count integer, last_contact_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select l.id, l.category, l.listing_type, l.contact_click_count, l.last_contact_at
  from public.listings l
  where l.user_id = p_actor_id
    and l.status = 'active'
    and l.is_available = true
    and l.contact_click_count >= 3
    and l.last_contact_at is not null
    and l.last_contact_at >= now() - interval '5 days'
  order by l.contact_click_count desc;
$function$
;

-- guard: get_carbon_suggestions_admin(uuid,text)
CREATE OR REPLACE FUNCTION public.get_carbon_suggestions_admin(p_actor_id uuid, p_status text DEFAULT 'pending'::text)
 RETURNS SETOF carbon_suggestions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.carbon_suggestions where (p_status is null or status = p_status) order by created_at desc;
end;
$function$
;

-- guard: get_cs_claims(uuid,text)
CREATE OR REPLACE FUNCTION public.get_cs_claims(p_actor_id uuid, p_status text DEFAULT 'pending'::text)
 RETURNS TABLE(id bigint, dir_id bigint, dir_name text, name text, phone text, proof_note text, status text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query select c.id, c.dir_id, d.name, c.name, c.phone, c.proof_note, c.status, c.created_at
    from public.cold_storage_claims c join public.cold_storage_directory d on d.id = c.dir_id
    where (p_status is null or c.status = p_status) order by c.created_at desc;
end;
$function$
;

-- guard: get_cs_directory_admin(uuid,integer,integer)
CREATE OR REPLACE FUNCTION public.get_cs_directory_admin(p_actor_id uuid, p_limit integer DEFAULT 500, p_offset integer DEFAULT 0)
 RETURNS SETOF cold_storage_directory
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.cold_storage_directory order by district, name limit greatest(p_limit,1) offset greatest(p_offset,0);
end;
$function$
;

-- guard: get_feedback_messages(uuid,text,text,integer)
CREATE OR REPLACE FUNCTION public.get_feedback_messages(p_actor_id uuid, p_moderation text DEFAULT NULL::text, p_status text DEFAULT 'open'::text, p_limit integer DEFAULT 100)
 RETURNS SETOF feedback_messages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query
    select * from public.feedback_messages
    where (p_moderation is null or moderation = p_moderation)
      and (p_status is null or status = p_status)
    order by created_at desc
    limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$function$
;

-- guard: get_listing_reports(uuid,text,integer)
CREATE OR REPLACE FUNCTION public.get_listing_reports(p_actor_id uuid, p_status text DEFAULT 'open'::text, p_limit integer DEFAULT 100)
 RETURNS TABLE(id bigint, target_type text, target_id text, listing_id uuid, reason text, note text, reporter_phone text, status text, resolution_note text, created_at timestamp with time zone, resolved_at timestamp with time zone, listing_category text, listing_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query
    select r.id, r.target_type, r.target_id, r.listing_id, r.reason, r.note,
           r.reporter_phone, r.status, r.resolution_note, r.created_at,
           r.resolved_at, l.category, l.status
    from public.listing_reports r
    left join public.listings l on l.id = r.listing_id
    where (p_status is null or r.status = p_status)
    order by r.created_at desc
    limit greatest(p_limit, 1);
end;
$function$
;

-- guard: get_my_listings(uuid)
CREATE OR REPLACE FUNCTION public.get_my_listings(p_actor_id uuid)
 RETURNS TABLE(id uuid, listing_type text, category text, status text, latitude numeric, longitude numeric, pincode text, details jsonb, self_declared boolean, created_at timestamp with time zone, expires_at timestamp with time zone, is_expired boolean, is_available boolean, contact_click_count integer, admin_disabled boolean, admin_disabled_reason text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select l.id, l.listing_type, l.category, l.status, l.latitude, l.longitude,
         l.pincode, l.details, l.self_declared, l.created_at, l.expires_at,
         (l.expires_at <= now()) as is_expired,
         l.is_available, l.contact_click_count,
         (l.admin_disabled_at is not null) as admin_disabled,
         l.admin_disabled_reason
  from public.listings l
  where l.user_id = p_actor_id
  order by l.created_at desc;
$function$
;

-- guard: get_my_mela_interests(uuid)
CREATE OR REPLACE FUNCTION public.get_my_mela_interests(p_actor_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select mela_id from public.kisan_mela_interest where user_id = p_actor_id;
$function$
;

-- guard: get_my_pending_photo_deletions(uuid)
CREATE OR REPLACE FUNCTION public.get_my_pending_photo_deletions(p_actor_id uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select coalesce(array_agg(d.object_name order by d.queued_at), '{}'::text[])
  from public.listing_photo_deletions d
  where d.queued_by = p_actor_id
    and d.queued_at > now() - interval '30 days'
    and exists (select 1 from storage.objects o where o.bucket_id = 'listing-photos' and o.name = d.object_name);
$function$
;

-- guard: get_recent_mela_merges(uuid)
CREATE OR REPLACE FUNCTION public.get_recent_mela_merges(p_actor_id uuid)
 RETURNS TABLE(merged_id uuid, merged_name text, merged_state text, survivor_id uuid, survivor_name text, reason text, merged_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query
    select m.id, coalesce(m.name_en, m.name_hi), m.state, s.id, coalesce(s.name_en, s.name_hi),
           m.merge_reason, m.merged_at
    from public.kisan_mela m
    join public.kisan_mela s on s.id = m.merged_into
    where m.merged_into is not null
    order by m.merged_at desc nulls last
    limit 100;
end; $function$
;

-- guard: get_search_misses(uuid,integer)
CREATE OR REPLACE FUNCTION public.get_search_misses(p_actor_id uuid, p_limit integer DEFAULT 100)
 RETURNS TABLE(query text, misses bigint, last_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  return query
    select lower(s.query) as query, count(*)::bigint as misses, max(s.created_at) as last_at
    from public.search_misses s
    group by lower(s.query)
    order by misses desc, last_at desc
    limit greatest(p_limit, 1);
end;
$function$
;

-- guard: get_whatsapp_optins(uuid)
CREATE OR REPLACE FUNCTION public.get_whatsapp_optins(p_actor_id uuid)
 RETURNS TABLE(full_name text, phone text, village_town text, pincode text, preferred_mandi text, main_crops text, whatsapp_opt_in_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.is_admin(p_actor_id) then raise exception 'not authorized'; end if;
  return query
    select p.full_name, p.phone, p.village_town, p.pincode, p.preferred_mandi, p.main_crops, p.whatsapp_opt_in_at
    from public.profiles p where p.whatsapp_opt_in = true order by p.whatsapp_opt_in_at desc nulls last;
end;
$function$
;

-- guard: moderate_feedback(uuid,bigint,text)
CREATE OR REPLACE FUNCTION public.moderate_feedback(p_actor_id uuid, p_id bigint, p_action text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_row public.feedback_messages%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if p_action not in ('approve','reject') then raise exception 'feedback_action_invalid'; end if;
  select * into v_row from public.feedback_messages where id = p_id;
  if not found then raise exception 'feedback_not_found'; end if;
  if p_action = 'approve' then
    if not v_row.public_ok or v_row.kind = 'problem' then raise exception 'feedback_not_public'; end if;
    update public.feedback_messages set moderation = 'approved' where id = p_id;
  else
    update public.feedback_messages set moderation = 'rejected' where id = p_id;
  end if;
end;
$function$
;

-- guard: queue_listing_photo_deletions(uuid,text[])
CREATE OR REPLACE FUNCTION public.queue_listing_photo_deletions(p_actor_id uuid, p_paths text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  -- housekeeping first: forget queued paths whose file no longer exists
  delete from public.listing_photo_deletions d
   where not exists (select 1 from storage.objects o where o.bucket_id = 'listing-photos' and o.name = d.object_name);
  insert into public.listing_photo_deletions (object_name, queued_by)
  select distinct p, p_actor_id from unnest(coalesce(p_paths, '{}'::text[])) as p where p is not null and p <> ''
  on conflict (object_name) do update set queued_by = excluded.queued_by, queued_at = now();
end;
$function$
;

-- guard: remove_listing(uuid,uuid)
CREATE OR REPLACE FUNCTION public.remove_listing(p_actor_id uuid, p_listing_id uuid)
 RETURNS listings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.listings%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.listings set status = 'removed' where id = p_listing_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$function$
;

-- guard: require_admin(uuid)
CREATE OR REPLACE FUNCTION public.require_admin(p_actor_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and is_admin = true) then
    raise exception 'not_admin';
  end if;
end;
$function$
;

-- guard: resolve_carbon_suggestion(uuid,bigint,boolean)
CREATE OR REPLACE FUNCTION public.resolve_carbon_suggestion(p_actor_id uuid, p_id bigint, p_approve boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  update public.carbon_suggestions set status = case when p_approve then 'approved' else 'rejected' end, resolved_at = now(), resolved_by = p_actor_id where id = p_id;
  if not found then raise exception 'not_found'; end if;
end;
$function$
;

-- guard: resolve_cs_claim(uuid,bigint,boolean)
CREATE OR REPLACE FUNCTION public.resolve_cs_claim(p_actor_id uuid, p_claim_id bigint, p_approve boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare c public.cold_storage_claims%rowtype;
begin
  perform public.require_admin(p_actor_id);
  select * into c from public.cold_storage_claims where id = p_claim_id;
  if not found then raise exception 'not_found'; end if;
  update public.cold_storage_claims set status = case when p_approve then 'approved' else 'rejected' end, resolved_at = now(), resolved_by = p_actor_id where id = p_claim_id;
  update public.cold_storage_directory
    set claim_status = case when p_approve then 'approved' else 'unclaimed' end,
        claim_phone = case when p_approve then c.phone else claim_phone end,
        updated_at = now()
    where id = c.dir_id;
end;
$function$
;

-- guard: resolve_listing_report(uuid,bigint,text,text)
CREATE OR REPLACE FUNCTION public.resolve_listing_report(p_actor_id uuid, p_report_id bigint, p_action text, p_resolution_note text)
 RETURNS listing_reports
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare r public.listing_reports%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if p_action not in ('removed','dismissed') then raise exception 'invalid_action'; end if;
  select * into r from public.listing_reports where id = p_report_id;
  if not found then raise exception 'not_found'; end if;

  if p_action = 'removed' and r.listing_id is not null then
    update public.listings set status = 'removed' where id = r.listing_id;
  end if;

  update public.listing_reports set
    status = p_action,
    resolution_note = nullif(trim(p_resolution_note), ''),
    resolved_at = now(),
    resolved_by = p_actor_id
  where id = p_report_id returning * into r;
  return r;
end;
$function$
;

-- guard: set_feedback_status(uuid,bigint,text)
CREATE OR REPLACE FUNCTION public.set_feedback_status(p_actor_id uuid, p_id bigint, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  perform public.require_admin(p_actor_id);
  if p_status not in ('open','replied','closed') then raise exception 'feedback_status_invalid'; end if;
  update public.feedback_messages set status = p_status where id = p_id;
  if not found then raise exception 'feedback_not_found'; end if;
end;
$function$
;

-- guard: set_language(uuid,text)
CREATE OR REPLACE FUNCTION public.set_language(p_actor_id uuid, p_language text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_profile public.profiles%rowtype;
begin
  if p_language not in ('hi', 'en') then
    raise exception 'invalid_language';
  end if;
  update public.profiles
    set preferred_language = p_language
    where id = p_actor_id
    returning * into v_profile;
  if not found then
    raise exception 'not_found';
  end if;
  return v_profile;
end;
$function$
;

-- guard: set_listing_availability(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.set_listing_availability(p_actor_id uuid, p_listing_id uuid, p_is_available boolean)
 RETURNS listings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_row public.listings%rowtype;
begin
  select * into v_row from public.listings where id = p_listing_id;
  if not found then raise exception 'not_found'; end if;
  if v_row.user_id <> p_actor_id then raise exception 'not_owner'; end if;
  update public.listings
    set is_available = coalesce(p_is_available, true),
        availability_changed_at = now(),
        contact_click_count = 0
    where id = p_listing_id
    returning * into v_row;
  return v_row;
end;
$function$
;

-- guard: set_listing_unavailable(uuid,uuid,date,boolean)
CREATE OR REPLACE FUNCTION public.set_listing_unavailable(p_actor_id uuid, p_listing_id uuid, p_date date, p_busy boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not exists (select 1 from public.listings where id = p_listing_id and user_id = p_actor_id) then
    raise exception 'not_listing_owner';
  end if;
  if p_busy then
    insert into public.listing_unavailable_dates (listing_id, unavailable_date)
    values (p_listing_id, p_date) on conflict do nothing;
  else
    delete from public.listing_unavailable_dates where listing_id = p_listing_id and unavailable_date = p_date;
  end if;
end $function$
;

-- guard: set_mela_interest(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.set_mela_interest(p_actor_id uuid, p_mela_id uuid, p_interested boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not exists (select 1 from public.profiles where id = p_actor_id) then raise exception 'not_authorized'; end if;
  if coalesce(p_interested, true) then
    insert into public.kisan_mela_interest (mela_id, user_id) values (p_mela_id, p_actor_id)
      on conflict (mela_id, user_id) do nothing;
  else
    delete from public.kisan_mela_interest where mela_id = p_mela_id and user_id = p_actor_id;
  end if;
  return true;
end;
$function$
;

-- guard: set_my_listing_disabled(uuid,uuid,boolean)
CREATE OR REPLACE FUNCTION public.set_my_listing_disabled(p_actor_id uuid, p_listing_id uuid, p_disabled boolean)
 RETURNS listings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.listings%rowtype;
begin
  select * into v from public.listings where id = p_listing_id for update;
  if not found then raise exception 'not_found'; end if;
  if v.user_id is distinct from p_actor_id then raise exception 'not_owner'; end if;

  if coalesce(p_disabled, false) then
    if v.status = 'disabled' then return v; end if;                 -- already disabled: no-op
    if v.status <> 'active' then raise exception 'invalid_state'; end if;
    update public.listings set status = 'disabled' where id = p_listing_id returning * into v;
  else
    if v.status = 'active' then return v; end if;                   -- already enabled: no-op
    if v.status <> 'disabled' then raise exception 'invalid_state'; end if;
    if v.admin_disabled_at is not null then raise exception 'disabled_by_admin'; end if;
    -- expires_at is NOT touched: an expired listing stays expired (hidden) after enabling.
    update public.listings set status = 'active' where id = p_listing_id returning * into v;
  end if;
  return v;
end;
$function$
;

-- guard: update_kisan_profile(uuid,numeric,text,boolean,boolean,boolean,text)
CREATE OR REPLACE FUNCTION public.update_kisan_profile(p_actor_id uuid, p_land_acres numeric DEFAULT NULL::numeric, p_main_crops text DEFAULT NULL::text, p_interest_lease boolean DEFAULT false, p_interest_equipment boolean DEFAULT false, p_whatsapp_opt_in boolean DEFAULT NULL::boolean, p_preferred_mandi text DEFAULT NULL::text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_profile public.profiles%rowtype;
begin
  if not exists (select 1 from public.profiles where id = p_actor_id) then raise exception 'not_authorized'; end if;
  update public.profiles set
    land_acres         = p_land_acres,
    main_crops         = nullif(trim(coalesce(p_main_crops, '')), ''),
    interest_lease     = coalesce(p_interest_lease, false),
    interest_equipment = coalesce(p_interest_equipment, false),
    whatsapp_opt_in    = coalesce(p_whatsapp_opt_in, whatsapp_opt_in),
    whatsapp_opt_in_at = case
      when p_whatsapp_opt_in is true  and whatsapp_opt_in is distinct from true then now()
      when p_whatsapp_opt_in is false then null
      else whatsapp_opt_in_at end,
    preferred_mandi    = coalesce(nullif(trim(coalesce(p_preferred_mandi, '')), ''), preferred_mandi)
  where id = p_actor_id
  returning * into v_profile;
  return v_profile;
end;
$function$
;

-- guard: update_profile(uuid,text,text,text,text)
CREATE OR REPLACE FUNCTION public.update_profile(p_actor_id uuid, p_full_name text, p_village_town text, p_pincode text, p_language text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_actor   public.profiles%rowtype;
  v_pin     public.pincodes%rowtype;
  v_lang    text;
  v_profile public.profiles%rowtype;
begin
  select * into v_actor from public.profiles where id = p_actor_id;
  if not found then
    raise exception 'not_authorized';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'name_required';
  end if;
  select * into v_pin from public.pincodes where pincode = p_pincode;
  if not found then
    raise exception 'pincode_not_found';
  end if;
  v_lang := case when p_language in ('hi', 'en') then p_language else v_actor.preferred_language end;

  update public.profiles set
    full_name          = trim(p_full_name),
    village_town       = nullif(trim(coalesce(p_village_town, '')), ''),
    pincode            = p_pincode,
    latitude           = v_pin.latitude,
    longitude          = v_pin.longitude,
    preferred_language = v_lang
  where id = p_actor_id
  returning * into v_profile;

  return v_profile;
end;
$function$
;
