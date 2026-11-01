-- TEST for 0073 - run on STAGING ONLY (never production). Everything happens inside one transaction that is rolled back,
-- so no data or secret is left behind. Any failed check raises an error; reaching the final select means all passed.
-- Pure ASCII. Needs 0070 and 0073 applied.
begin;

do $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  r jsonb;
  h text;
begin
  -- a throw-away secret for this transaction only
  delete from public.morning_post_secret;
  insert into public.morning_post_secret (id, secret_sha256) values (true, encode(sha256(convert_to('test-secret-17a', 'utf8')), 'hex'));
  delete from public.morning_posts where post_date = v_today;

  -- wrong or missing secret: identical forbidden on every job function
  r := public.morning_post_voice_upsert('wrong', v_today, 'x', 'eA==', '{}'::jsonb);   assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'voice wrong secret';
  r := public.morning_post_voice_upsert(null, v_today, 'x', 'eA==', '{}'::jsonb);      assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'voice null secret';
  r := public.morning_post_upsert('wrong', v_today, 'm', null, null, null, null);       assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'upsert wrong secret';
  r := public.morning_post_context('wrong', v_today);                                   assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'context wrong secret';

  -- no post row yet
  r := public.morning_post_voice_upsert('test-secret-17a', v_today, 'x', 'eA==', '{}'::jsonb); assert r->>'error' = 'not_found', 'not_found';
  r := public.morning_post_voice_upsert('test-secret-17a', v_today + 30, 'x', 'eA==', '{}'::jsonb); assert r->>'error' = 'bad_date', 'bad_date';

  -- save a message, then a voice
  r := public.morning_post_upsert('test-secret-17a', v_today, 'message one', 'poll', 'q1', null, 'rep'); assert (r->>'ok')::boolean, 'upsert 1';
  r := public.morning_post_voice_upsert('test-secret-17a', v_today, 'script one', 'eA==', '{"model":"m"}'::jsonb); assert (r->>'ok')::boolean, 'voice 1';
  r := public.morning_post_voice_upsert('test-secret-17a', v_today, repeat('x', 2001), 'eA==', '{}'::jsonb); assert r->>'error' = 'too_large', 'script too large';
  r := public.morning_post_voice_upsert('test-secret-17a', v_today, 'x', repeat('A', 1400001), '{}'::jsonb); assert r->>'error' = 'too_large', 'mp3 too large';

  -- context carries the hash of the stored script, plus the old keys
  r := public.morning_post_context('test-secret-17a', v_today);
  h := encode(sha256(convert_to('script one', 'utf8')), 'hex');
  assert r->'today'->>'voice_sha256' = h, 'context hash';
  assert r ? 'yesterday' and (r->>'ok')::boolean, 'context old keys';

  -- SAME message again: the voice stays
  r := public.morning_post_upsert('test-secret-17a', v_today, 'message one', 'poll', 'q1', null, 'rep2'); assert (r->>'ok')::boolean, 'upsert same';
  assert (select voice_script from public.morning_posts where post_date = v_today) = 'script one', 'voice kept for unchanged message';
  assert (select voice_mp3_b64 is not null and voice_meta is not null from public.morning_posts where post_date = v_today), 'mp3 and meta kept';

  -- CHANGED message: the voice is cleared
  r := public.morning_post_upsert('test-secret-17a', v_today, 'message two', 'poll', 'q1', null, 'rep3'); assert (r->>'ok')::boolean, 'upsert changed';
  assert (select voice_script is null and voice_mp3_b64 is null and voice_meta is null from public.morning_posts where post_date = v_today), 'voice cleared for changed message';
  r := public.morning_post_context('test-secret-17a', v_today); assert r->'today'->>'voice_sha256' is null, 'context hash null after clear';

  -- posted posts are left alone
  update public.morning_posts set posted_at = now() where post_date = v_today;
  r := public.morning_post_voice_upsert('test-secret-17a', v_today, 'x', 'eA==', '{}'::jsonb); assert r->>'error' = 'already_posted', 'already_posted';

  -- read functions refuse a non-admin
  r := public.morning_post_get('00000000-0000-0000-0000-000000000000'::uuid, v_today); assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'get non-admin';
  r := public.morning_post_history('00000000-0000-0000-0000-000000000000'::uuid, 14);  assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'history non-admin';
end
$$;

-- tables stay closed: no grants to the API roles (an assert, not 1/0: Postgres folds constant expressions while planning, so 1/0 would always fail)
do $$
declare t text; r text;
begin
  foreach t in array array['public.morning_posts', 'public.morning_post_secret'] loop
    foreach r in array array['anon', 'authenticated'] loop
      assert not has_table_privilege(r, t, 'select,insert,update,delete'), r || ' has a grant on ' || t;
    end loop;
  end loop;
end
$$;

select 'ALL 0073 CHECKS PASSED' as result;
rollback;
