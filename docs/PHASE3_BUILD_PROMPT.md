# Kisan Sahyog — Phase 3 Build Prompt
# Nav Fix + Email Auth + User Profile + Admin Dashboard + Articles Section

DO NOT ask for approval at any step. Auto-accept all actions. Read PROJECT_CONTEXT.md before starting. Update PROJECT_CONTEXT.md after completing. Commit and push after each phase passes its checklist.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Live staging:** https://staging.kissansahyog.com
**Deploy after all phases complete:** `npx wrangler pages deploy dist --project-name kissansahyog`

---

## Phase 1 — Nav home button fix

**Problem:** After logging in, users cannot get back to the public homepage. The logo/brand name in the nav bar must be a clickable link.

**Fix:**
- Logo + "किसान सहयोग" in the NavBar must link to `/` (public homepage) for both authenticated and unauthenticated users
- For authenticated users, `/` shows the public homepage with the nav in logged-in state (user name visible, Login/Signup replaced by profile/logout)
- Do NOT redirect authenticated users away from `/` — they should be able to view the public homepage even when logged in

**Test checklist:**
- Positive: Logged-in user clicks logo → lands on public homepage, still logged in (nav shows their name, not Login/Signup)
- Positive: Unauthenticated user clicks logo → lands on public homepage
- Regression: No other nav links broken

Commit + push: "Phase 1: logo links to homepage for all users"

---

## Phase 2 — Email + phone login (dual auth)

**Context:** Current auth is phone-number-only (trust-based MVP, no OTP). This adds email+password as an *additional* option. Phone flow is unchanged. Both flows create/use the same `profiles` table.

**Supabase setup:**
- Enable Email provider in Supabase Auth (email + password, no magic link needed for MVP)
- Add `email` column (text, nullable, unique) to the `profiles` table — phone stays as the primary identifier for phone-registered users, email is null for them; email-registered users have email set, phone may be null
- Add `auth_provider` column (text, check constraint 'phone' or 'email', default 'phone') to profiles — records which method was used at signup
- Add `is_admin` (boolean, default false) to profiles — used in Phase 4

Write migration file for these schema changes.

**UI changes on the login/signup screen:**
- Add a toggle/tab at the top of both signup and login screens: "📱 फ़ोन से / By Phone" | "✉️ ईमेल से / By Email"
- Phone tab: existing flow unchanged (phone number entry, trust-based login)
- Email tab:
  - Signup: name, email, password (min 8 chars), village/town, pincode, language preference — same fields as phone signup minus phone number, plus email + password
  - Login: email + password
  - Use Supabase Auth email/password methods (`supabase.auth.signUp`, `supabase.auth.signInWithPassword`)
  - On email signup, insert into profiles with auth_provider='email', email set, phone null
  - On email login, fetch profile by matching Supabase auth user id
- Both tabs show the signup disclaimer (same as existing, one-time acknowledgment)
- Error messages for email auth: invalid email format, password too short, email already registered, wrong password — all in both Hindi and English

**Auth service module:** Both phone and email auth must go through the existing isolated `authService.js` module (the Phase 2 OTP swap point from v1). Add email methods to the same module — do not create a separate auth flow outside it. Add a comment flagging that phone auth still needs real OTP in a future phase.

**Test checklist:**
- Positive: Sign up with email → profile created with auth_provider='email', lands on authenticated home
- Positive: Log out, log back in with same email+password → profile loaded correctly
- Positive: Phone signup/login still works exactly as before
- Negative: Email signup with invalid email format → rejected with clear message
- Negative: Email signup with password under 8 characters → rejected
- Negative: Email login with wrong password → rejected with clear message
- Negative: Same email cannot register twice → clear "already registered" message
- Edge: A phone-registered user and an email-registered user can coexist with different profiles; no collision

Commit + push: "Phase 2: email+password auth alongside existing phone auth"

---

## Phase 3 — User profile page

**Route:** `/profile` — authenticated only, redirect to login if not logged in

**Access:** From the nav bar — when logged in, clicking the user's name/initial opens a dropdown with "मेरी प्रोफ़ाइल / My Profile" and "लॉगआउट / Logout"

**Profile page sections:**

**3a. Profile info (editable):**
- Full name (editable)
- Phone number (shown if phone-registered, read-only — phone is the identifier)
- Email (shown if email-registered, read-only — email is the identifier)
- Village/town (editable)
- Pincode (editable — when changed, re-derive lat/long from pincodes table)
- Preferred language (toggle — saves to profile)
- "बदलाव सहेजें / Save Changes" button

**3b. My listings summary:**
- Count of active listings by category
- Link to "मेरी लिस्टिंग / My Listings" (existing screen)
- Date joined ("किसान सहयोग से जुड़े: / Member since:")

**3c. Account section:**
- For email-registered users: "पासवर्ड बदलें / Change Password" — simple form (current password, new password, confirm) using Supabase auth update
- For phone-registered users: no password section (they have none)
- "अकाउंट डिलीट करें / Delete Account" — shows a confirmation dialog first: "क्या आप वाकई अकाउंट हटाना चाहते हैं? आपकी सभी लिस्टिंग भी हट जाएंगी।" — if confirmed, deletes profile and all their listings (cascade), then signs out

**Test checklist:**
- Positive: Profile page loads with correct user data for both phone and email registered users
- Positive: Editing name and village and saving → changes persist after page reload
- Positive: Changing pincode → lat/long updated correctly from pincodes table
- Positive: Email user can change password successfully
- Positive: Delete account → profile and listings removed, user signed out
- Negative: Unauthenticated user visiting /profile → redirected to login
- Negative: Phone user does not see a change password section
- Edge: User with no listings shows "0 active listings" cleanly, not a broken layout

Commit + push: "Phase 3: user profile page with edit, listings summary, account management"

---

## Phase 4 — Admin dashboard

**Route:** `/admin` — authenticated + `is_admin = true` only. If authenticated but not admin: show "Access denied" page, not a 404 or crash. If not authenticated: redirect to login.

**How to become admin:** A one-time manual SQL update in the Supabase dashboard sets `is_admin = true` on the founder's profile row. The prompt does NOT hardcode any specific phone number or email — the is_admin flag in the database is the sole gate. Document this clearly in PROJECT_CONTEXT.md with the exact SQL to run:
```sql
UPDATE profiles SET is_admin = true WHERE phone = 'YOUR_PHONE_NUMBER';
-- or for email-registered:
UPDATE profiles SET is_admin = true WHERE email = 'YOUR_EMAIL';
```

**Admin dashboard sections:**

**4a. Platform overview (top stats bar):**
- Total registered users
- Total active listings (broken down by category: Land / Equipment / Labor / Bhusa-Parali / Agri-Inputs)
- Total closed/found listings
- Total experts in directory
- Total published articles

**4b. Recent listings (table):**
- Last 20 listings across all categories
- Columns: Category, Type (Offer/Requirement), Location (pincode + village), Posted by (phone or email), Created at, Status
- Action: "हटाएं / Remove" button — sets status to 'removed' (add this value to the status check constraint, alongside 'active', 'closed'). Removed listings do not appear in public browse or homepage. This is the moderation tool.

**4c. Expert directory management:**
- Table of all experts (active and inactive)
- Columns: Name, Organisation, Specialisation, Phone, Active status
- Actions: Toggle active/inactive, Edit (opens a form to edit all fields), Add new expert (same fields as the experts table from v1.1)
- This is how real experts get added — replacing the placeholder data seeded in v1.1

**4d. Articles management:**
- Table of all articles (published and draft)
- Columns: Title (Hindi), Author, Published at, Status (published/draft)
- Actions: Edit, Toggle published/draft, Delete
- "नया लेख / New Article" button — opens article creation form (see Phase 5 for fields)

**4e. Users (read-only list):**
- Paginated list of registered users (most recent first)
- Columns: Name, Phone/Email, Village, Pincode, Joined date, Listing count
- No edit capability — admin can view but not modify user data from this panel
- Search by name or phone/email

**RLS for admin:**
- Admin dashboard reads use the service role key via a dedicated server-side function/RPC — not the anon key. The anon key must never return all users' phone numbers or emails to a client-side request.
- Create a SECURITY DEFINER RPC `get_admin_stats()` that returns the overview counts — callable only when the requesting profile has is_admin = true (check inside the function).
- Create a SECURITY DEFINER RPC `get_admin_listings(limit, offset)` that returns the recent listings with poster phone/email — same admin check.
- Create a SECURITY DEFINER RPC `get_admin_users(limit, offset)` — same.
- These RPCs check is_admin server-side; a non-admin calling them gets an error, not data.

**Test checklist:**
- Positive: Admin user visits /admin → sees dashboard with correct stats
- Positive: Admin removes a listing → it disappears from public browse and homepage immediately
- Positive: Admin adds a new expert → appears in the public Expert directory
- Positive: Admin toggles an expert inactive → expert disappears from public directory
- Negative: Non-admin authenticated user visits /admin → sees "Access denied", not data
- Negative: Unauthenticated user visits /admin → redirected to login
- Negative: Direct API call to get_admin_stats() from a non-admin profile → returns error, not stats
- Edge: Admin dashboard with 0 listings, 0 users — shows zeros cleanly, not broken layout

Commit + push: "Phase 4: admin dashboard with moderation, expert management, stats"

---

## Phase 5 — Articles / Blog section

**New database table: `articles`**
```sql
CREATE TABLE articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title_hi text NOT NULL,
  title_en text NOT NULL,
  summary_hi text,
  summary_en text,
  content_hi text NOT NULL,
  content_en text NOT NULL,
  author_name text NOT NULL DEFAULT 'Team Kisan Sahyog',
  cover_image_url text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```
RLS: Public read for is_published = true. Admin-only insert/update/delete (via service role).

**Routes:**
- `/articles` — public article listing page
- `/articles/[slug]` — public article detail page

**Article listing page (`/articles`):**
- Grid of article cards, published articles only, sorted by published_at descending
- Each card: cover image (or a colour placeholder if none), title in current language, summary (2-3 sentences), author, published date, "पढ़ें / Read" button
- Linked from: footer, nav (add "लेख / Articles" link to nav), and relevant category pages (e.g. link the Parali article from the Bhusa/Parali browse page)

**Article detail page (`/articles/[slug]`):**
- Full article content rendered from the content_hi / content_en field (support basic markdown or plain text with paragraph breaks)
- Author name, published date
- Related category link at the bottom
- Social share hint: "इस लेख को साझा करें / Share this article" — simple copy-link button (copies the article URL to clipboard)
- Back to Articles link

**Admin article creation (in Phase 4 admin dashboard):**
- Fields: Title (Hindi + English), Summary (Hindi + English), Content (Hindi + English, textarea), Author name (default "Team Kisan Sahyog"), Slug (auto-generated from English title, editable), Published (toggle)
- When Published is toggled on, sets published_at = now()

**Seed these two articles directly in the migration as published articles:**

---

**Article 1:**
- slug: `parali-pollution-kisaan-ki-majboori`
- title_hi: `पराली जलाना — किसान की मजबूरी या हमारी गलत सोच?`
- title_en: `Burning Crop Residue — A Farmer's Compulsion or Our Wrong Thinking?`
- author_name: `Team Kisan Sahyog`
- is_published: true

content_hi:
```
हर साल अक्टूबर-नवंबर में जब उत्तर भारत में धुंध छाती है, तो सबसे पहले किसानों की तरफ उंगली उठती है। "पराली जला रहे हैं किसान" — यह वाक्य समाचारों में, सोशल मीडिया पर और सरकारी बयानों में बार-बार दोहराया जाता है। लेकिन क्या हम एक बार किसान की नज़र से भी देखने की कोशिश करते हैं?

एक किसान पराली इसलिए नहीं जलाता क्योंकि वो पर्यावरण का दुश्मन है। वो इसलिए जलाता है क्योंकि उसके पास कोई और रास्ता नहीं है। धान की कटाई के बाद खेत में बचा पैरा हटाने का खर्च उसकी कमाई से ज़्यादा होता है। मशीनें महंगी हैं, मज़दूर मिलते नहीं, और अगली फसल की बुवाई का वक्त आ जाता है।

अब ज़रा दूसरा पहलू देखिए। यही किसान, जिस पर हम प्रदूषण फैलाने का आरोप लगाते हैं — वो साल भर करोड़ों टन अनाज उगाता है। उसके खेत सूरज की रोशनी को भोजन में बदलते हैं, कार्बन को ज़मीन में दबाते हैं, और वातावरण में ऑक्सीजन छोड़ते हैं। क्या कोई कारखाना यह काम करता है? क्या कोई शहरी उद्योग हवा को शुद्ध करता है? नहीं।

किसान इस देश का सबसे बड़ा पर्यावरण उत्पादक है। वो अन्नदाता ही नहीं, ऑक्सीजन दाता भी है। फिर भी जब प्रदूषण की बात आती है तो सारा दोष उसी पर?

असली सवाल यह है: क्या हम उस किसान को पराली न जलाने का विकल्प दे रहे हैं? क्या उसकी पराली को खरीदने वाले उद्योग हैं? क्या उसे उचित दाम मिल रहे हैं? अगर नहीं, तो समाधान कानून से नहीं, बाज़ार से आएगा।

किसान सहयोग का भूसा-पराली मंच इसी सोच से बना है — ताकि किसान अपनी पराली बेच सके, जला नहीं।
```

content_en:
```
Every October and November, when haze descends on North India, farmers are the first to be blamed. "Farmers are burning stubble" — this phrase echoes through news channels, social media, and government statements. But do we ever try to see it from the farmer's perspective?

A farmer doesn't burn crop residue because he is an enemy of the environment. He burns it because he has no other choice. The cost of clearing the straw left after paddy harvest often exceeds what he earned from the crop. Machines are expensive, labour is scarce, and the window for sowing the next crop is closing fast.

Now consider the other side. This same farmer — accused of polluting the air — grows hundreds of millions of tonnes of food every year. His fields convert sunlight into food, absorb carbon into the soil, and release oxygen into the atmosphere. Does any factory do this? Does any urban industry purify the air? No.

The farmer is this country's largest environmental producer. He is not just the provider of food — he is a provider of oxygen. Yet when pollution is discussed, all blame falls on him?

The real question is: are we giving farmers an alternative to burning? Are there industries ready to buy their stubble? Are they being paid a fair price? If not, the solution will not come from laws — it will come from markets.

Kisan Sahyog's Bhusa-Parali marketplace was built on exactly this idea — so that farmers can sell their residue, not burn it.
```

---

**Article 2:**
- slug: `kisaan-carbon-credit-kya-hai`
- title_hi: `क्या किसान कार्बन क्रेडिट से कमाई कर सकते हैं? — एक खुला सवाल`
- title_en: `Can Farmers Earn from Carbon Credits? — An Open Question`
- author_name: `Team Kisan Sahyog`
- is_published: true

content_hi:
```
यह लेख किसी दावे के साथ नहीं, एक सवाल के साथ शुरू होता है।

दुनिया के कई देशों में किसान अब सिर्फ अनाज नहीं बेचते — वे हवा भी बेचते हैं। सटीक रूप से कहें तो वे "कार्बन क्रेडिट" बेचते हैं। जब एक किसान जैविक खेती अपनाता है, पेड़ लगाता है, या पराली नहीं जलाता — तो वो वातावरण से कार्बन को कम करने में मदद करता है। इस काम के लिए दुनिया के कई बाज़ारों में उसे पैसे मिलते हैं।

अमेरिका में Indigo Ag जैसी कंपनियां किसानों को कार्बन क्रेडिट के बदले प्रति एकड़ भुगतान करती हैं। ऑस्ट्रेलिया में सरकार का Carbon Farming Initiative किसानों को सीधे कार्बन बाज़ार से जोड़ता है। केन्या और घाना में छोटे किसान भी इस व्यवस्था से जुड़ने लगे हैं।

भारत में क्या स्थिति है?

भारत में कार्बन क्रेडिट बाज़ार अभी शुरुआती अवस्था में है। SEBI ने 2023 में Carbon Credit Trading Scheme की रूपरेखा तैयार की। कुछ राज्यों में पायलट प्रोजेक्ट चल रहे हैं। लेकिन छोटे किसानों तक यह व्यवस्था अभी नहीं पहुंची।

तो सवाल यह है — क्या Sagar के किसान, जो हर साल लाखों एकड़ में गेहूं, चना और सोयाबीन उगाते हैं, भविष्य में कार्बन क्रेडिट से कमाई कर सकते हैं? क्या पराली न जलाने के एवज में उन्हें कोई बाज़ार मूल्य मिल सकता है?

हम इसका जवाब नहीं जानते। लेकिन हम यह ज़रूर मानते हैं कि यह सवाल पूछना ज़रूरी है।

अगर आप इस विषय के जानकार हैं — कृषि वैज्ञानिक, पर्यावरण विशेषज्ञ, या नीति निर्माता — तो हमसे संपर्क करें। किसान सहयोग इस चर्चा को आगे बढ़ाना चाहता है।
```

content_en:
```
This article begins not with an answer, but with a question.

In many countries around the world, farmers no longer sell only grain — they sell air. More precisely, they sell "carbon credits." When a farmer adopts organic farming, plants trees, or avoids burning stubble — they help reduce carbon in the atmosphere. In many global markets, they are paid for doing so.

In the United States, companies like Indigo Ag pay farmers per acre for generating carbon credits. In Australia, the government's Carbon Farming Initiative directly connects farmers to carbon markets. In Kenya and Ghana, smallholder farmers are beginning to participate in these systems.

What is the situation in India?

India's carbon credit market is still in its early stages. SEBI outlined a Carbon Credit Trading Scheme framework in 2023. Some states have pilot projects underway. But this system has not yet reached small farmers.

So the question is — could farmers in Sagar district, who grow wheat, gram, and soybean across lakhs of acres every year, earn from carbon credits in the future? Could there be a market value for not burning their stubble?

We don't know the answer. But we believe the question is worth asking.

If you are a subject matter expert — an agricultural scientist, environment specialist, or policy maker — please reach out to us. Kisan Sahyog wants to take this conversation forward.
```

---

## Phase 6 — Bilingual audit and integration

- Audit all new strings from Phases 1-5 for Hindi/English coverage
- Add "लेख / Articles" to the nav bar
- Link the Parali article from the Bhusa/Parali browse page ("इस बारे में पढ़ें / Read about this")
- Confirm all admin dashboard strings are also bilingual (admin-facing UI still needs to be usable by someone who prefers Hindi)
- Confirm `/privacy` and `/terms` pages still load correctly after schema changes

**Test checklist:**
- Full language toggle test across every new screen (profile, admin, articles list, article detail)
- No hardcoded single-language strings in any new code

Commit + push: "Phase 6: bilingual audit, articles nav link, Parali article cross-link"

---

## Phase 7 — Integration tests and documentation

**Integration checks:**
- Full unauthenticated journey: homepage → articles → read article → click category card → see listings (anonymised) → sign up (email) → post a listing → view profile → log out
- Full authenticated journey: log in (phone) → browse all 5 categories → post listing → view My Listings → view profile → edit profile → log out
- Admin journey: log in as admin → view dashboard stats → remove a listing → add an expert → create a new article draft → publish it → verify it appears on /articles

**Update PROJECT_CONTEXT.md:**
- articles table schema
- admin RPC functions (get_admin_stats, get_admin_listings, get_admin_users)
- is_admin flag and the SQL to set it (exact query)
- email auth addition to authService.js
- profile page route
- articles routes

**Update KNOWN_ISSUES.md:**
- Close: homepage nav home button (fixed in Phase 1)
- Add: v1 Playwright E2E specs still need updating for new required fields (carried from v1.1)
- Add: Email verification not enabled — email-registered users are trusted on signup without confirming their address (acceptable for MVP, flag for future)

Commit + push: "Phase 7: integration tests, PROJECT_CONTEXT.md and KNOWN_ISSUES.md updated"

Deploy: `npx wrangler pages deploy dist --project-name kissansahyog`

---

## Explicitly OUT of scope for this build

- Email verification / confirmation emails (email is trusted on signup for now)
- Social login (Google, Facebook)
- Rich text editor for articles (plain text / basic markdown only)
- Comment system on articles
- Article categories or tags
- Any payment processing
- Any change to existing listing categories, RLS policies, or SECURITY DEFINER RPCs from v1/v1.1

---

## Definition of done

- Logo links home for all users (Phase 1)
- Email+password signup and login working alongside phone auth (Phase 2)
- User profile page — view, edit, delete (Phase 3)
- Admin dashboard at /admin, gated by is_admin, with moderation + expert management + article management (Phase 4)
- Articles section at /articles and /articles/[slug], both seeded articles published and readable (Phase 5)
- All new strings fully bilingual (Phase 6)
- All phase checklists passed (Phase 7)
- Deployed live to staging.kissansahyog.com
- PROJECT_CONTEXT.md and KNOWN_ISSUES.md updated
