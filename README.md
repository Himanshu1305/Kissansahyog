# किसान सहयोग · Kisan Sahyog

An information-sharing web platform (PWA) for farmers, landowners, equipment owners, and
laborers. Users post **Offers** ("I have land/equipment/labor") or **Requirements**
("I need …") and discover nearby matches within 30 km, connecting by a direct phone call.
The platform is **not** involved in any deal, payment, or agreement — it is a discovery
layer only.

Pilot region: **Sagar, Madhya Pradesh**. Architected to expand to more regions without a rebuild.

Voice: **Team Kisan Sahyog** (anonymous founder).

## Tech

React + Vite + Tailwind CSS · Supabase (Postgres) · PWA · deployed on Cloudflare Pages (later).

## Setup

```bash
npm install
cp .env.example .env        # fill in Supabase URL + keys
npm run db migrate          # apply SQL migrations to the remote project (needs SUPABASE_ACCESS_TOKEN)
npm run seed                # seed pincodes / crops / equipment_types (needs service role key)
npm run dev
```

## Auth (MVP)

Phone-number-only, **no OTP** (trust-based). All identity logic is isolated in
`src/lib/auth/` for a clean swap to real Phone OTP in Phase 2. See `PROJECT_CONTEXT.md`.

## Scripts

| command | purpose |
| --- | --- |
| `npm run dev` / `build` / `preview` | Vite dev / production build / preview |
| `npm run db migrate` \| `status` \| `query "SQL"` | apply/inspect migrations via Supabase Management API |
| `npm run seed` | idempotent lookup-table seeding (service role) |

More detail lives in `PROJECT_CONTEXT.md` (architecture, schema, expansion design, OTP swap plan)
and `KNOWN_ISSUES.md`.
