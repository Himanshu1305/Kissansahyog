# Batch 17C - decisions

**Four cron times** (UTC, with IST): `37 19` (01:07), `47 20` (02:17), `47 21` (03:17), `37 22` (04:07). GitHub starts scheduled runs late, worst at the busy minutes 0 and 30 (the old single `0 23` run really started 06:34-07:59 IST). So: several tries, early, off those minutes. All four fall on the same IST calendar date as the morning they serve (unit test).

**Cheap first step.** "Is today's post already complete?" runs before `npm ci` and Playwright, so a try with nothing to do costs seconds and ends green.

**Why `voice_sha256` means complete.** The voice is stored only after the message and card are saved, and migration 0073 (already live) returns `today.voice_sha256`. No database change is needed.

**Fail open.** Any error, timeout (15 s), bad answer, missing setting, or an empty ElevenLabs key means "not complete", and the full job runs (it is idempotent). A broken check can never stop the post being made. The script always exits 0; the step only sets `complete=true|false`.

**Manual runs always run.** A normal manual run does not even call the database (`complete=false`), because the founder uses it to regenerate. A manual run with `check_first` ON behaves like a scheduled try, so the skip path can be proved by hand in real GitHub.

**One guard condition.** Later steps use `if: steps.check.outputs.complete != 'true'`. The task text suggested `github.event_name != 'schedule' || ...`, but that would make a `check_first` manual run never skip. Because the check answers false for every normal manual run, the single condition gives all three wanted behaviours.

**Known behaviour (not a bug).** If the voice keeps failing (for example ElevenLabs credits used up), the post is never "complete", so all four tries run the full job and each re-saves the message and card (weather may change slightly) until the post is marked as posted. Accepted: the post still exists early, report.txt says why the voice is missing, failed voice calls cost nothing, and the database leaves an already-posted post alone.

**Failed save is RED.** `run.mjs` returns non-zero when the save fails (`saveToDatabase` exit 1: refused secret, too large, unreachable, unexpected answer). A missing voice never changes the exit code. Not changed in this batch.

**Untouched:** generator, card, voice, message, database, dependencies, OTP switches. Old 16B workflow test updated for the new schedule.

Note: the check script needs Node 18 or newer (built-in fetch) and runs before setup-node; this was not verified against a specific ubuntu-latest Node version, so the workflow no longer claims one. The check step also has `continue-on-error: true` plus a crash notice, so a crash of the check can never skip the job.

**Data freshness (details in evidence/data-freshness.md).** The post date, tithi and sowing days left all come from the IST date at all four times (tests added). Mandi: the rule is unchanged (yesterday, else up to 3 days back, labelled); at 01:07 IST the data is whatever the 23:35 IST refresh stored. Weather: the saved forecast is normally 0.3-1.5 h old at the four times; past 8 h the generator tries Open-Meteo directly and otherwise leaves the weather out. Two lines were added to report.txt only (`mandi date used`, `weather cache age`); a test proves the message and voice script stay byte-identical. Production contents at those hours were not checked.
