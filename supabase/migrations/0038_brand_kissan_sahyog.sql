-- V2 Phase 3 — Brand spelling: English brand name becomes "Kissan Sahyog"
-- (double "s", matching the domain). Hindi "किसान सहयोग" is unchanged, and the
-- protected words (Kisan Mela, Kisan Sawaal, PM-KISAN, …) are untouched.
-- Additive + idempotent.

-- 1. articles.author_name default → "Team Kissan Sahyog"
alter table public.articles alter column author_name set default 'Team Kissan Sahyog';

-- 2. Backfill existing rows (incl. the seeded intercropping article).
update public.articles
  set author_name = 'Team Kissan Sahyog'
  where author_name = 'Team Kisan Sahyog';

update public.kisan_sawaal
  set answered_by = 'Team Kissan Sahyog'
  where answered_by = 'Team Kisan Sahyog';

-- 3. RPC defaults → "Team Kissan Sahyog" (recreate with the new fallback string).
create or replace function public.admin_upsert_article(
  p_actor_id uuid, p_id uuid, p_slug text, p_title_hi text, p_title_en text,
  p_summary_hi text, p_summary_en text, p_content_hi text, p_content_en text,
  p_author_name text, p_cover_image_url text, p_is_published boolean
) returns public.articles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
$$;

create or replace function public.admin_answer_sawaal(
  p_actor_id uuid, p_id uuid, p_answer_hi text, p_answer_en text,
  p_answered_by text, p_is_published boolean
) returns public.kisan_sawaal
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.kisan_sawaal%rowtype; v_pub boolean := coalesce(p_is_published, false);
begin
  perform public.require_admin(p_actor_id);
  update public.kisan_sawaal set
    answer_hi = p_answer_hi, answer_en = p_answer_en,
    answered_by = coalesce(nullif(trim(p_answered_by), ''), 'Team Kissan Sahyog'),
    answered_at = case when coalesce(trim(p_answer_hi), '') <> '' then now() else answered_at end,
    is_published = v_pub
  where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;
