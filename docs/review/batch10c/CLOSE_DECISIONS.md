# Batch 10C close — decisions (made unattended, safest option)

1. **Live checks ran in a Playwright copy of the 10C guide tests, pointed at production, with no web server and no `globalTeardown`.** The normal e2e config runs a DB cleanup step afterwards; that must never touch production. Every non-GET request was answered inside the test browser (0 were needed).
2. **The Post help sheet was not opened on production.** `/post` needs a login; the staging test used a fake local session. Even a fake session on production is closer to "logins" than needed, so instead I confirmed the `help-post` button is in the live Post chunk. Staging test F7 already opened it.
3. **The pre-existing `localhost:4178` preload links and the blocked Cloudflare beacon were not counted as "uncaught console errors".** They exist on the previous production deployment too (checked: 23 links on `0845c733`), and they are not crashes. Recorded as HUMAN-REVIEW and in KNOWN_ISSUES instead.
4. **No rollback.** None of the rollback triggers happened. The slow-phone misses (4.5 s hub, 345 ms task) and the preload-link issue count as "smaller" items → HUMAN-REVIEW.
5. **No code change.** The preload-link fix belongs to `scripts/prerender.mjs`; the close prompt says stop if code is needed, and this is not needed for 10C health. It is passed on to Batch 10D (homepage performance) as a known cause.
6. **1.5 deep link used `?cat=equipment`**, the parameter the code really uses (the prompt said `category`, "use the real values from the code").
7. Slow-phone run used a temporary copy of `scripts/batch10c/slow-phone.mjs` (output to `prod-live/`, chunk sizes from the live files downloaded to the scratch folder) so the staging results file was not overwritten. The temporary copy was deleted.
8. **`evidence/prod-ship/` (written by the founder's ship run) and `ship-real.log` (ignored by `*.log` in .gitignore) are not committed by this close run**: the prompt allows staging only files this run created.
