# SEO / AEO / GEO checklist (Phase 14)

Per-page standard (§0.6). Enforced automatically by `scripts/test/v2_seo_audit.mjs`
over every prerendered HTML file, except items marked (manual).

## On-page SEO (automated)
- [x] Unique `<title>` ≤ 60 chars, primary keyword first (audit: present + unique)
- [x] Meta description ≤ 155 chars, unique (audit: present + unique)
- [x] Exactly one `<h1>` (audit)
- [x] Canonical tag (audit)
- [x] `hreflang` hi-IN / en-IN / x-default — Q&A pages hi-IN + x-default only (audit)
- [x] Open Graph + Twitter card tags + share image (audit; per-hub OG images in /og/)
- [x] JSON-LD parses (audit)
- [x] H2/H3 hierarchy mirroring real questions (manual — authored in content/pages + Q&A)
- [x] Clean slug (manual — kebab-case slugs)
- [x] Hindi alt text on content images (manual)
- [x] Breadcrumbs + BreadcrumbList JSON-LD (PageShell/Breadcrumbs)
- [x] ≥3 contextual internal links (RelatedBoxes + in-content links)
- [x] "अंतिम अपडेट" + byline Team Kissan Sahyog (LastUpdated + authored)

## AEO / GEO (manual, authored)
- [x] 40–60 word "संक्षेप में" direct-answer box (summary block / Q&A AEO box)
- [x] FAQ section (FAQPage JSON-LD on hubs)
- [x] Quotable one-line facts with citations (fact blocks + <Cite/>)
- [x] "स्रोत" Sources section (SourcesList)
- [x] Explicit entity names (schemes, departments, places)

## JSON-LD coverage
- [x] Sitewide Organization + WebSite (SearchAction) — SiteJsonLd in App
- [x] BreadcrumbList every page
- [x] Article (content hubs), FAQPage (FAQ pages), QAPage (Q&A), HowTo (guides), ItemList (directories/hubs)
- [x] LocalBusiness-type for cold-storage district entries

## Technical SEO
- [x] Pre-rendered HTML with full content (build:full → dist/<route>/index.html; curl-verified)
- [x] Canonical, hreflang, OG/Twitter + share image
- [x] Split sitemaps + index (sitemap.xml → pages/sawaal/cold-storage/schemes), generated in build:full
- [x] robots.txt (allow all content; disallow /search, /join, auth routes; sitemap ref)
- [x] llms.txt describing sections + key pages
- [x] Real 404 (noindex) — NotFound screen
- [x] /search is noindex + excluded from prerender
- [x] Per-route code splitting (lazy routes); eager-bundle guard vs Phase 0 baseline
- [x] Lazy-loaded, sized images (loading="lazy")

## Share hooks
- [x] WhatsApp share button + pre-written Hindi text
- [x] One shareable fact line; RelatedBoxes (Phase 11)

## Owner actions
- [ ] Verify the site in Google Search Console; submit https://kissansahyog.com/sitemap.xml
- [ ] Add DATA_GOV_IN_API_KEY → expand Q&A + re-rank keywords with real volumes
- [ ] Always deploy with `npm run build:full`
