# Putting Batch 9 on kissansahyog.com — three steps

Production has NOT been changed. These steps do it in about 10 minutes. The script checks
everything itself and puts the old version back on its own if anything looks wrong.

Open **Git Bash** and go to the project first:

```
cd ~/projects/Kissansahyog
git checkout release-9
git pull
```

## 1. Read `docs/review/batch9/SHIP.md`

It says what changes on the live site (the list of files), which checks passed on
staging.kissansahyog.com, and what is still open. If something there worries you, stop here.

## 2. Run one command

```
bash scripts/ship-prod-9.sh
```

It takes about 10 minutes (most of it is the build). It does not ask you anything.
Want to see first what it would do, without changing anything? Run
`bash scripts/ship-prod-9.sh --dry-run`.

## 3. Read the box it prints at the end

- **`SHIP OK`** — the new version is live and every check passed. Done.
- **`SHIP FAILED … ROLLING BACK AUTOMATICALLY`**, then **`RESULT: the new version was NOT kept`** —
  the site is back on yesterday's version. Nothing else to do; send the box text to Claude Code.
- **`SHIP STOPPED BEFORE ANY CHANGE TO PRODUCTION`** — nothing was changed; the line under it
  says why (for example "not on branch release-9").
  If it says **"modified tracked files would change what ships"** and lists only
  `android/app/capacitor.build.gradle` and/or `android/capacitor.settings.gradle`: an app build
  rewrote their line endings (nothing real changed). Run
  `git checkout -- android/app/capacitor.build.gradle android/capacitor.settings.gradle`
  and run the ship command again. If it lists any OTHER file, stop and ask Claude Code.
- **`SHIP FAILED AND THE AUTOMATIC ROLLBACK DID NOT CONFIRM`** — run the rollback command below.

## If you want the old version back later (at any time)

```
bash scripts/rollback-prod-9.sh
```

This puts kissansahyog.com back on the deployment that was live before the ship (the script
remembers its id). To name it yourself:

```
bash scripts/rollback-prod-9.sh 7aebf863-7f12-4f7b-956c-86d42a1f65f6
```

(`7aebf863-…` is the version live on 2026-10-15, built from commit 206cd86.)

If even that fails: open the Cloudflare dashboard → Workers & Pages → **kissansahyog-prod** →
Deployments → the deployment `7aebf863` → the "…" menu → **Rollback to this deployment**.
