-- TEST for 0074 - run on STAGING ONLY (never production). Everything happens inside one transaction that is rolled back,
-- so no data or secret is left behind. Any failed check raises an error; reaching the final select means all passed.
-- Pure ASCII. Needs 0070, 0073 and 0074 applied.
begin;

do $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  r jsonb;
  s text := 'test-secret-17e';
  v_src text;
begin
  -- a throw-away secret for this transaction only
  delete from public.morning_post_secret;
  insert into public.morning_post_secret (id, secret_sha256) values (true, encode(sha256(convert_to(s, 'utf8')), 'hex'));
  delete from public.morning_posts where post_date = v_today;

  -- wrong or missing secret: identical forbidden on every job function
  r := public.morning_post_video_upsert('wrong', v_today, 'AAAA', '{}'::jsonb); assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'video wrong secret';
  r := public.morning_post_video_upsert(null, v_today, 'AAAA', '{}'::jsonb);    assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'video null secret';
  r := public.morning_post_video_upsert('', v_today, 'AAAA', '{}'::jsonb);      assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'video empty secret';
  r := public.morning_post_context('wrong', v_today);                           assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'context wrong secret';

  -- no post row yet / bad date / bad input
  r := public.morning_post_video_upsert(s, v_today, 'AAAA', '{}'::jsonb);      assert r->>'error' = 'not_found', 'not_found';
  r := public.morning_post_video_upsert(s, v_today + 30, 'AAAA', '{}'::jsonb); assert r->>'error' = 'bad_date', 'bad_date';
  r := public.morning_post_video_upsert(s, v_today, null, '{}'::jsonb);        assert r->>'error' = 'bad_input', 'null video bad_input';
  r := public.morning_post_video_upsert(s, v_today, '', '{}'::jsonb);          assert r->>'error' = 'bad_input', 'empty video bad_input';

  -- a post with a message and a card but NO voice: no video allowed
  r := public.morning_post_upsert(s, v_today, 'message one', 'poll', 'q1', 'CARD1', 'rep'); assert (r->>'ok')::boolean, 'upsert 1';
  r := public.morning_post_video_upsert(s, v_today, 'AAAA', '{}'::jsonb);      assert r->>'error' = 'bad_input', 'no voice -> bad_input';
  r := public.morning_post_context(s, v_today);
  assert (r->'today'->>'has_video')::boolean = false, 'context has_video false (no video)';

  -- a post with a voice but NO card: no video allowed
  r := public.morning_post_upsert(s, v_today, 'message nocard', 'poll', 'q1', null, 'rep'); assert (r->>'ok')::boolean, 'upsert nocard';
  r := public.morning_post_voice_upsert(s, v_today, 'script one', 'MP3ONE', '{"model":"m"}'::jsonb); assert (r->>'ok')::boolean, 'voice nocard';
  r := public.morning_post_video_upsert(s, v_today, 'AAAA', '{}'::jsonb);      assert r->>'error' = 'bad_input', 'no card -> bad_input';

  -- card + voice present: the video is stored
  r := public.morning_post_upsert(s, v_today, 'message one', 'poll', 'q1', 'CARD1', 'rep'); assert (r->>'ok')::boolean, 'upsert 1b';
  r := public.morning_post_voice_upsert(s, v_today, 'script one', 'MP3ONE', '{"model":"m"}'::jsonb); assert (r->>'ok')::boolean, 'voice 1';
  r := public.morning_post_video_upsert(s, v_today, repeat('A', 3000001), '{}'::jsonb); assert r->>'error' = 'too_large', 'video too large';
  r := public.morning_post_video_upsert(s, v_today, repeat('A', 3000000), '{"a":1}'::jsonb); assert (r->>'ok')::boolean, 'video at the size cap is accepted';
  r := public.morning_post_video_upsert(s, v_today, 'VIDEOONE', '{"duration_s":41.2}'::jsonb); assert (r->>'ok')::boolean, 'video 1';
  assert (select video_mp4_b64 from public.morning_posts where post_date = v_today) = 'VIDEOONE', 'video stored';

  -- src_sha256 is computed inside the database from the stored card and voice, not from the client
  v_src := encode(sha256(convert_to('CARD1' || '|' || 'MP3ONE', 'utf8')), 'hex');
  assert (select video_meta->>'src_sha256' from public.morning_posts where post_date = v_today) = v_src, 'src_sha256 computed by the database';
  assert (select (video_meta->>'duration_s')::numeric from public.morning_posts where post_date = v_today) = 41.2, 'client meta kept';
  r := public.morning_post_video_upsert(s, v_today, 'VIDEOONE', '{"src_sha256":"forged"}'::jsonb); assert (r->>'ok')::boolean, 'video 1 again';
  assert (select video_meta->>'src_sha256' from public.morning_posts where post_date = v_today) = v_src, 'a forged src_sha256 is overwritten';

  -- context and get: has_video true, old keys intact, NO video bytes in get
  r := public.morning_post_context(s, v_today);
  assert (r->'today'->>'has_video')::boolean, 'context has_video true';
  assert r->'today'->>'voice_sha256' = encode(sha256(convert_to('script one', 'utf8')), 'hex'), 'context voice hash kept';
  assert r ? 'yesterday' and (r->>'ok')::boolean, 'context old keys';

  -- unchanged re-saves keep the video
  r := public.morning_post_upsert(s, v_today, 'message one', 'poll', 'q1', 'CARD1', 'rep2'); assert (r->>'ok')::boolean, 'upsert same';
  assert (select video_mp4_b64 = 'VIDEOONE' and video_meta is not null from public.morning_posts where post_date = v_today), 'video kept on unchanged re-save';
  r := public.morning_post_voice_upsert(s, v_today, 'script one', 'MP3ONE', '{"model":"m"}'::jsonb); assert (r->>'ok')::boolean, 'voice same';
  assert (select video_mp4_b64 = 'VIDEOONE' and video_meta is not null from public.morning_posts where post_date = v_today), 'video kept on unchanged voice re-save';
  assert (select voice_mp3_b64 = 'MP3ONE' from public.morning_posts where post_date = v_today), 'voice kept too';

  -- CHANGED card: the video is cleared (message and voice stay)
  r := public.morning_post_upsert(s, v_today, 'message one', 'poll', 'q1', 'CARD2', 'rep3'); assert (r->>'ok')::boolean, 'upsert new card';
  assert (select video_mp4_b64 is null and video_meta is null from public.morning_posts where post_date = v_today), 'video cleared by a changed card';
  assert (select voice_mp3_b64 = 'MP3ONE' from public.morning_posts where post_date = v_today), 'voice kept when only the card changed';
  r := public.morning_post_context(s, v_today); assert (r->'today'->>'has_video')::boolean = false, 'context has_video false after card change';
  r := public.morning_post_video_upsert(s, v_today, 'VIDEOTWO', '{}'::jsonb); assert (r->>'ok')::boolean, 'video 2';

  -- CHANGED message: the video (and the voice, as in 0073) is cleared
  r := public.morning_post_upsert(s, v_today, 'message two', 'poll', 'q1', 'CARD2', 'rep4'); assert (r->>'ok')::boolean, 'upsert new message';
  assert (select video_mp4_b64 is null and video_meta is null from public.morning_posts where post_date = v_today), 'video cleared by a changed message';
  assert (select voice_script is null and voice_mp3_b64 is null and voice_meta is null from public.morning_posts where post_date = v_today), '0073 rule: voice cleared by a changed message';
  r := public.morning_post_context(s, v_today); assert r->'today'->>'voice_sha256' is null, '0073 rule: context hash null after clear';

  -- CHANGED voice: the video is cleared (card and message stay)
  r := public.morning_post_voice_upsert(s, v_today, 'script two', 'MP3TWO', '{}'::jsonb); assert (r->>'ok')::boolean, 'voice 2';
  r := public.morning_post_video_upsert(s, v_today, 'VIDEOTHREE', '{}'::jsonb); assert (r->>'ok')::boolean, 'video 3';
  assert (select video_mp4_b64 = 'VIDEOTHREE' from public.morning_posts where post_date = v_today), 'video 3 stored';
  r := public.morning_post_voice_upsert(s, v_today, 'script two b', 'MP3THREE', '{}'::jsonb); assert (r->>'ok')::boolean, 'voice 3';
  assert (select video_mp4_b64 is null and video_meta is null from public.morning_posts where post_date = v_today), 'video cleared by a changed voice';
  assert (select card_png_b64 = 'CARD2' and message_text = 'message two' from public.morning_posts where post_date = v_today), 'card and message kept when only the voice changed';

  -- the job read of the stored voice: secret-guarded, date-guarded, returns the stored mp3 only
  r := public.morning_post_voice_get('wrong', v_today);  assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'voice_get wrong secret';
  r := public.morning_post_voice_get(null, v_today);     assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'voice_get null secret';
  r := public.morning_post_voice_get(s, v_today + 30);   assert r->>'error' = 'bad_date', 'voice_get bad_date';
  r := public.morning_post_voice_get(s, v_today);        assert (r->>'ok')::boolean and r->>'voice_mp3_b64' = 'MP3THREE', 'voice_get returns the stored mp3';
  assert not (r ? 'card_png_b64') and not (r ? 'message_text'), 'voice_get returns nothing else';

  -- posted posts are left alone
  r := public.morning_post_video_upsert(s, v_today, 'VIDEOFOUR', '{}'::jsonb); assert (r->>'ok')::boolean, 'video 4';
  update public.morning_posts set posted_at = now() where post_date = v_today;
  r := public.morning_post_video_upsert(s, v_today, 'VIDEOFIVE', '{}'::jsonb); assert r->>'error' = 'already_posted', 'already_posted';
  assert (select video_mp4_b64 = 'VIDEOFOUR' from public.morning_posts where post_date = v_today), 'posted video untouched';
  r := public.morning_post_upsert(s, v_today, 'message three', 'poll', 'q1', 'CARD3', 'rep5'); assert r->>'error' = 'already_posted', 'upsert already_posted';
  r := public.morning_post_voice_upsert(s, v_today, 'x', 'eA==', '{}'::jsonb); assert r->>'error' = 'already_posted', 'voice already_posted';
  assert (select video_mp4_b64 = 'VIDEOFOUR' from public.morning_posts where post_date = v_today), 'posted video still untouched';

  -- the admin reads refuse a non-admin
  r := public.morning_post_get('00000000-0000-0000-0000-000000000000'::uuid, v_today);        assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'get non-admin';
  r := public.morning_post_video_get('00000000-0000-0000-0000-000000000000'::uuid, v_today);  assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'video_get non-admin';
  r := public.morning_post_history('00000000-0000-0000-0000-000000000000'::uuid, 14);         assert r = '{"ok": false, "error": "forbidden"}'::jsonb, 'history non-admin';
end
$$;

-- tables stay closed: no grants to the API roles (an assert, not 1/0: Postgres folds constant expressions while planning, so 1/0 would always fail)
do $$
declare t text; r text;
begin
  foreach t in array array['public.morning_posts', 'public.morning_post_secret'] loop
    foreach r in array array['anon', 'authenticated'] loop
      assert not has_table_privilege(r, t, 'select,insert,update,delete'), r || ' has a grant on ' || t;
      assert not has_column_privilege(r, 'public.morning_posts', 'video_mp4_b64', 'select,insert,update'), r || ' has a grant on video_mp4_b64';
    end loop;
  end loop;
end
$$;

-- the new functions are callable by the API roles only through their guards (job secret / admin session)
do $$
begin
  assert has_function_privilege('anon', 'public.morning_post_video_upsert(text, date, text, jsonb)', 'execute'), 'anon cannot call video_upsert';
  assert has_function_privilege('anon', 'public.morning_post_video_get(uuid, date)', 'execute'), 'anon cannot call video_get';
  assert not has_function_privilege('public', 'public.morning_post_video_upsert(text, date, text, jsonb)', 'execute'), 'PUBLIC can call video_upsert';
  assert not has_function_privilege('public', 'public.morning_post_voice_get(text, date)', 'execute'), 'PUBLIC can call voice_get';
end
$$;

select 'ALL 0074 CHECKS PASSED' as result;
rollback;
