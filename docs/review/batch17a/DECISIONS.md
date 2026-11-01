# Batch 17A - decisions

One statement per decision.

1. The voice script is built from the same compose model as the written message, so the same data-date, reviewed and verified rules apply.
2. Numbers 0-99 are a written table in `hindiNumber.mjs`; larger numbers are composed from it up to 99999.
3. An older data date is spoken as "<day> <month> ka mandi bhav" and never as "kal" or "aaj".
4. The spraying hint in the script is the message's own task text containing the word for spraying; no new advice is invented.
5. The "one item" is a scheme only when the rotating slot is a reviewed or verified scheme, otherwise the first task not already spoken; unreviewed content never enters the voice.
6. When the script is over 750 characters the optional parts drop in this order: third crop, spraying hint, the item, second crop. Under 450 it is not padded.
7. Latin letters, digits, symbols and emojis that survive into the script are spelled or converted to Devanagari words by `speakable()`, so the output always matches Devanagari letters plus `। , ! ?` only.
8. `language_code: "hi"` is sent only for `eleven_turbo_v2_5`, `eleven_flash_v2_5` and `eleven_v3`, because the ElevenLabs reference says `multilingual_v2` does not support it.
9. The voice step runs after the message is saved, so a changed message (which clears the stored voice) is always seen as having no voice and gets a new one.
10. The cost guard compares the SHA-256 of the script with `today.voice_sha256` from `morning_post_context`; equal means no ElevenLabs call.
11. A local `npm run morning` without `--save` writes `voice-script.txt` only and makes no API call; `--voice` is the explicit switch to call ElevenLabs locally, `--no-voice` skips it always.
12. Files are written to the run folder `out/morning/<date>/` next to `card.png`, which the workflow upload (`out/morning/**`) already covers; the spec's `out/morning/voice.mp3` is read as this folder.
13. The voice step never throws into the run: every failure becomes one line in `report.txt` and on the console, and the post is saved without voice.
14. `report_text` saved in the database does not contain the voice line, because the message is saved before the voice step; the line is in the local `report.txt` and the workflow log.
15. Migration 0073 keeps the table closed (RLS on, no policies, privileges revoked) and uses the 0070 grant pattern for every function.
16. `morning_post_voice_upsert` checks the secret first, so a wrong or missing secret always answers `forbidden`.
17. The voice is cleared inside `morning_post_upsert` with `is distinct from` against the old message text; the right-hand sides of `ON CONFLICT DO UPDATE` see the old row, so the order of the assignments does not matter.
18. `morning_post_history` returns `voice_script` but never the audio; `morning_post_get` returns all three voice fields.
19. The staging SQL test (`TEST_0073_STAGING.sql`) is written and ready but could not be run: the Supabase connector refused SQL on staging, which was not worked around.
20. The admin page shows the voice section, then a send section; every old button is unchanged.
21. "Share card + voice" appears only when `navigator.canShare({files})` is true for a PNG and an MP3; otherwise the page shows the hint text.
22. The WhatsApp text button opens `https://wa.me/?text=` with the URL-encoded message (the message is under 1500 characters).
23. The card keeps the headline price the message uses (the 30-day basket price); the small mandi name beside it is the mandi with the highest price that day and is labelled "ऊँचा:" so the two are not confused.
24. The card shows up to 5 crops: the verified crops the message shows plus the verified extras the summary already holds, never anything unchecked.
25. The scheme box shows a scheme only from the reviewed/verified slot; otherwise it shows the first work task; the tip box shows the slot's tip/knowledge/proverb, otherwise the next work task; each box is left out when there is nothing.
26. The three day boxes are today, tomorrow and the day after (the forecast has exactly those three days).
27. The card fit step shrinks sizes down to 70 percent before the renderer reports an overflow; overflow is measured as the last box bottom against the footer top.
28. The existing 16A card test that required 34 px minimum text now requires 22 px, because the approved reference uses small mandi names.
29. The Noto Sans Devanagari 600 and 800 weights (OFL, already in `node_modules`) are bundled next to the 400 and 700 files; the latin faces are declared last so digits, the rupee sign and the arrows use them.
30. The workflow checks out the default branch and passes `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` to the one step; nothing prints the environment.
31. The ship script is the 16G script plus: the read-only 0073 probe (wrong secret must answer exactly `forbidden`), the new AdminMorning chunk marker, no sitemap or search-index entry, no admin content in the HTML of `/admin/morning`; it rolls back by itself on any failed gate.
32. The rollback target is the live 16G deployment `3585b4c1-6ce6-4c51-a47d-660ca75217fe`.
33. No new npm dependency was added.
