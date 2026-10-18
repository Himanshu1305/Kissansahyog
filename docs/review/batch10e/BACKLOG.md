# Batch 10E — BACKLOG

- **(3A) "Add e-mail" on Profile** for phone-only users (not built in 10E by rule).
- **(3A) Password reset / account recovery for phone-only users** needs OTP (they have no e-mail or password).
- **(3A) Profile "Save changes" requires a 6-digit pincode** (`updateProfile` → `isValidPincode`), but sign-ups since 7L-2 (e-mail and now phone-only) have no pincode, so editing the name first asks for a pincode. Pre-existing; decision 35.
- **(3A) Login page order:** the e-mail box is still shown before the mobile box; consider putting the mobile box first now that most users have no e-mail.
- **(3C) Server-side date enforcement:** `create_listing*` should refuse equipment / land / labor / drone-didi posts without `available_from`, with a start in the past (IST) or an end before the start. Today it is client-side only (production DB change, not allowed in 10E).
- **(3C) Date filter / sort on Browse** ("available this week", soonest first) and an **"अवधि समाप्त" tag** (or auto-hide) for listings whose `available_to` has passed. Not built (founder rule).
- **(3B/3C) Edit-listing flow:** none exists; when built it must keep `details.extra_info`, reuse `ExtraInfoField` + `DateBlock`, and ask old dateless listings for a start date on re-submit.
- **(3C) Review dates for transport, greenhouse, cold storage** (DECISIONS 51).
- **(3B) Phone-rule false positives** like "2023 2024 2025" (plain numbers joined by spaces adding up to 10+ digits); watch farmer feedback (DECISIONS 40).
