# Batch 10G — backlog (found, not done in this batch)

| # | Item | Why it matters | Size |
|---|---|---|---|
| 1 | **Rate limiting on the delete / disable RPCs** (`set_my_listing_disabled`, `delete_my_listing`, `admin_*`). Today any number of calls per minute is accepted. | Abuse / scripted mass toggling | S |
| 2 | **The `p_actor_id` trust model.** Every listing RPC (old and new) trusts the profile id the app sends; anyone who learns a user's id could act as that user (disable or DELETE their listings), and an admin's id is enough to call the admin RPCs. Existing design (advisors flag all 129+ such functions); needs real sessions (OTP / Supabase Auth `auth.uid()`) before scale. | Security — the most important item here | L |
| 3 | **Auto-delete of expired listings and their photos** (e.g. 90 days after expiry), through the same queue so the files are removed too. | Storage cost, "removed from the system" also for old listings | M |
| 4 | **30-day trash for accidental deletes** — the founder chose permanent delete; a trash would need the photos kept until the trash is emptied. | Mistakes cannot be undone today | M |
| 5 | **Tell the seller when an admin deletes or disables their listing** (WhatsApp / SMS / in-app note). Disable shows the reason in My Listings; a deleted listing just disappears. | Fairness, fewer support calls | S–M |
| 6 | **Bulk admin actions** (select several listings → disable / delete) and paging/search in the admin listings panel (today: the newest 20). | Admin time when spam arrives | M |
| 7 | **Admin view of a hidden listing's page** — the detail page reads through the public rule, so an admin cannot open a disabled/closed listing's page (use the panel). An `admin_get_listing(actor, id)` read RPC would fix it. | Admin convenience | S |
| 8 | **Old soft "हटाएं" (status `removed`) in the admin panel and the reports "लिस्टिंग हटाएँ"** sit next to the new permanent delete; decide: rename (e.g. "छिपाएं") or drop. | Clarity for admins | S |
| 9 | **CDN window for deleted photos** (≤ 1 h, measured 41 min on staging): lower `cacheControl` on new uploads (e.g. 600 s) if a faster disappearance matters more than repeat-download cost. | Photo visible a little after delete | S |
| 10 | **Photos of listings deleted before 10G** (e.g. through account delete / profile cascade) are not in the queue → possible orphan files. A one-off read-only report (objects in `listing-photos` not referenced by any listing) + a founder-approved cleanup. | Storage hygiene | S |
| 11 | **Profile / account delete** (`delete_account`) cascades listings but does not queue their photos. Route it through the same queue. | Same rule as listing delete | S |
| 12 | **My Listings cards show "कॉल करें / WhatsApp" on your own listing** (pre-existing ListingCard behaviour). | Odd for the seller | S |
| 13 | **Prerendered homepage / `/jugaad` cards** keep a deleted listing until the next deploy (link → "not found", photo gone). A daily rebuild, or not prerendering listing cards, would remove it sooner. | Freshness | S |
| 14 | **Collapsible / tidy My Listings** for sellers with many listings (filters: active / disabled / closed). | Less scrolling | S |
