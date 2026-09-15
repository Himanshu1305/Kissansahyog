# Kisan Sahyog — Homepage & Navigation Redesign Prompt

DO NOT ask for approval at any step. Auto-accept all actions. Read PROJECT_CONTEXT.md before starting. Commit and push when complete.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Live staging:** https://staging.kissansahyog.com
**Deploy after completing:** `npx wrangler pages deploy dist --project-name kissansahyog`

---

## What this prompt addresses

The current welcome screen is a plain login/language selector. A visitor who lands on the site has no sense of what the platform does, who it's for, or why they should sign up. This prompt builds a proper public-facing homepage and global navigation bar, without changing any existing authenticated features.

---

## Core design principles (apply throughout)

- Professional, trustworthy, farmer-appropriate aesthetic — not flashy or generic tech startup
- Green and earthy palette is a sensible default; choose specific shades deliberately, not randomly
- Large tap targets, readable at arm's length on a mobile screen
- Hindi is the default language; every string must be in both Hindi and English via the existing translation system
- The homepage must feel complete even when the database has very few listings (graceful empty states, not broken-looking gaps)

---

## 1. Global navigation bar

Appears on every page — authenticated and unauthenticated.

**Left side:**
- Logo mark (use the existing wheat/paddy icon already in the app) + "किसान सहयोग" in Hindi + "Kisan Sahyog" in smaller text below or alongside

**Centre (desktop) / Hamburger menu (mobile):**
Category links — these are anchor links on the public homepage for unauthenticated users, and route to the authenticated browse screens for logged-in users:
- ज़मीन / Land
- उपकरण / Equipment
- कृषि सहयोगी / Labor
- भूसा-पराली / Residue
- कृषि सामग्री / Inputs
- विशेषज्ञ / Experts

**Right side:**
- Language toggle (हिंदी / English) — uses the existing language toggle component
- "लॉगिन / Login" button (outline style)
- "जुड़ें / Sign Up" button (filled/primary style)
- When logged in: replace Login/Signup with the user's name or phone initial + "मेरी लिस्टिंग / My Listings" link + Logout

**Behaviour:**
- Sticky on scroll (stays at top as user scrolls down)
- Mobile: hamburger collapses the category links; Login and Sign Up remain visible on mobile even when menu is collapsed
- Active category is highlighted when user is on that browse tab

---

## 2. Public homepage — structure

The homepage is the page a visitor sees at `/` before logging in. After login, the existing authenticated home (Browse tabs) remains unchanged — the public homepage is simply what shows when no session exists.

### Section 1 — Hero

Full-width hero section. No stock photo (avoid generic farmer images that look copy-pasted). Instead: a clean, bold typographic hero with a subtle background pattern or colour gradient.

Content:
- **Headline (Hindi, large):** "किसान की आय बढ़ाना — हमारा लक्ष्य"
- **Subheadline (Hindi):** "ज़मीन, उपकरण, मज़दूर और अनाज के लिए सीधा संपर्क — अपने 30 किमी के दायरे में"
- **English equivalents below or toggle-switched:** "Increasing farmer income — our mission" / "Direct connections for land, equipment, labor and produce — within 30km of you"
- Two CTA buttons: "लिस्टिंग देखें / Browse Listings" (scrolls to listings section) and "अभी जुड़ें / Join Now" (goes to signup)

### Section 2 — How it works (3 steps)

Simple, icon-based three-step explainer. Large icons, short text. Works on mobile as a vertical stack.

Steps:
1. **लिस्ट करें / List it** — "अपनी ज़मीन, उपकरण या सेवा लिस्ट करें" / "List your land, equipment, or service"
2. **मिलाएं / Match** — "30 किमी के दायरे में सही व्यक्ति खोजें" / "Find the right person within 30km"
3. **जुड़ें / Connect** — "सीधे फ़ोन पर बात करें — कोई बिचौलिया नहीं" / "Talk directly by phone — no middleman"

### Section 3 — Category cards

Six cards, one per category. Each card has:
- Category icon
- Category name (Hindi primary, English secondary)
- One-line description of what you can find there
- "देखें / Browse" button

Categories: Land, Equipment, Labor, Bhusa/Parali, Agri-Inputs, Experts

Tapping a category card:
- If not logged in: scrolls to the live listings section filtered to that category, with a "Sign up to see contact details" prompt
- If logged in: routes to the authenticated browse tab for that category

### Section 4 — Live listings (real data, anonymised)

This is the key section. Fetch recent active listings from the database (all categories, sorted by created_at descending, limit 12) and display them as cards. This section shows real data even to unauthenticated users.

**Anonymisation rules:**
- Show: category, listing type (Offer/Requirement), location (village/town + district only, NOT exact address), key details (land size, equipment type, residue type, etc.), asking price if present, time posted ("2 days ago" etc.)
- Hide: poster's name, phone number — replace with a blurred/redacted placeholder and a "Sign up to see contact" prompt that links to signup
- This gives unauthenticated visitors a real sense of platform activity without handing out phone numbers freely

**Empty state:** If fewer than 3 listings exist, show a friendly message: "अभी Sagar में लिस्टिंग जुड़ रही हैं — पहले बनें!" / "Listings are being added in Sagar — be one of the first!" with a "लिस्टिंग जोड़ें / Add a listing" CTA

**Filter bar above the listings:** Simple category filter (All / Land / Equipment / Labor / Residue / Inputs / Experts) — client-side filter on the fetched 12 results, no additional API call

### Section 5 — Mission statement

Short, honest, plain-language section. Not marketing copy.

Content:
- "हम क्यों बने? / Why we exist"
- 2-3 sentences about the mission (किसान की आय बढ़ाना), the direct-connect model (no middleman, no commission, no payment handled by us), and the pilot starting in Sagar, MP
- Disclaimer notice (short version, clearly visible but not alarming): "किसान सहयोग एक जानकारी मंच है — हम किसी भी लेन-देन में शामिल नहीं हैं।" / "Kisan Sahyog is an information platform — we are not involved in any transaction."

### Section 6 — Footer

Clean, simple footer:
- Logo + tagline
- Links: Privacy Policy (placeholder page `/privacy` — create a minimal placeholder), Terms of Use (placeholder `/terms`), Contact (`usdvisionai@gmail.com`)
- "किसान सहयोग © 2026 | USD Vision AI LLP"
- Language toggle (repeat here for accessibility)

---

## 3. Privacy Policy and Terms of Use pages

Create minimal but real placeholder pages at `/privacy` and `/terms`. These must exist before the app is shared with real users — even a simple page is better than a 404.

**Privacy Policy (`/privacy`):**
- What data is collected (phone number, pincode, listing details)
- How it's used (matching, display to other users within 30km)
- What is NOT done (no payment processing, no selling data, no third-party advertising data sharing yet)
- Contact for data queries: usdvisionai@gmail.com
- Write in both Hindi and English, Hindi first

**Terms of Use (`/terms`):**
- Platform is an information service only — not liable for transactions between users
- Self-declaration requirement for land listings
- Users must verify identity of other party before dealing
- Never send money before meeting in person (repeat the core fraud warning)
- False listings may be removed
- Write in both Hindi and English, Hindi first

Both pages should be reachable from the footer and styled consistently with the rest of the app. They do not need to be legally reviewed (flag in comments that legal review is pending before public launch) but must exist and be readable.

---

## 4. Fixes to the existing welcome/onboarding screen

Even though the homepage now exists, the login/signup flow still starts from a welcome screen for returning/direct visitors. Fix these issues visible in the current version:

- **Hindi must be selected by default** (not English) — the existing default is wrong
- **"Kisan Sahyog" appears twice** (once as title, once as redundant subtitle) — remove the duplicate
- **Tagline update:** Change "Find land, equipment, and labor near you" to "ज़मीन, उपकरण, भूसा, सामग्री और विशेषज्ञ — सीधे आपसे जुड़ें" (Hindi default) reflecting all current categories
- The welcome screen should have a "← वापस होमपेज / Back to Homepage" link at the top for users who want to browse first before signing up

---

## 5. What NOT to change

- Authenticated browse, listing creation, listing detail, My Listings, Expert directory — all unchanged
- Database schema, RLS policies, SECURITY DEFINER RPCs — do not touch
- Existing translation keys — only add new ones, never remove or rename existing ones
- The deploy command, environment variables, or any Cloudflare/Supabase configuration

---

## Test checklist

- Positive: Unauthenticated visitor lands on homepage — sees hero, how-it-works, category cards, live listings (anonymised), mission, footer. No errors.
- Positive: Clicking a category card scrolls to listings filtered to that category.
- Positive: Clicking "Sign Up" or "Join Now" goes to the signup flow.
- Positive: Clicking "Browse Listings" (hero CTA) scrolls down to the live listings section.
- Positive: Language toggle on the homepage switches all visible strings correctly.
- Positive: Nav bar is sticky — stays visible as user scrolls through the full homepage.
- Positive: On mobile, nav collapses to hamburger; Login and Sign Up buttons remain visible.
- Positive: `/privacy` and `/terms` pages load correctly and are linked from the footer.
- Positive: Welcome screen now defaults to Hindi selected.
- Positive: "Kisan Sahyog" no longer appears twice on the welcome screen.
- Negative: Phone numbers of listing posters are NOT visible to unauthenticated users anywhere on the homepage — inspect the API response to confirm phone is not returned in the public listings query, not just hidden in the UI.
- Edge: Homepage with 0 listings in the database shows the empty state gracefully, not a broken layout.
- Edge: Homepage with 1-2 listings shows those listings plus the empty-state prompt, not a half-empty broken grid.
- Regression: After logging in, the authenticated experience (Browse tabs, posting, My Listings) works exactly as before — the homepage is additive, not replacing authenticated features.

---

## Commit and deploy

Single commit (this is a UI/routing change, not a phased build):
`"Homepage redesign: public landing page, full nav, category cards, live anonymised listings, privacy/terms pages, welcome screen fixes"`

Then deploy:
`npx wrangler pages deploy dist --project-name kissansahyog`

Confirm staging.kissansahyog.com shows the new homepage after deploy.
