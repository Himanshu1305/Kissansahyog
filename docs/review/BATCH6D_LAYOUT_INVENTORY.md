# Batch 6D layout inventory

`PageShell` always provides the 1200px responsive shared frame. `PageShell width="content"` now keeps its 72ch reading column inside that frame and adds a sticky related-links panel on desktop. `Screen` defaults to the same wide frame.

| File | Layout primitive | Final width | Page-width classes |
|---|---|---|---|
| Admin.jsx | PageShell | content inside wide | none |
| AgroForestry.jsx | PageShell | wide | none |
| ArticleDetail.jsx | PageShell | content inside wide + related links | none |
| Articles.jsx | PageShell | wide | none |
| Bazaar.jsx | PageShell | wide | none |
| Browse.jsx | Screen | wide | none |
| CarbonBrief.jsx | PageShell | content inside wide + related links | none |
| CarbonCredit.jsx | PageShell | content inside wide + related links | none |
| ColdStorage.jsx | PageShell | wide | none |
| ColdStorageDistrict.jsx | PageShell | wide | none |
| Contact.jsx | PageShell | content inside wide + related links | none |
| Credits.jsx | PageShell | wide | none |
| DroneDidi.jsx | PageShell | wide | none |
| ExpertDetail.jsx | Screen | wide | none |
| Experts.jsx | Screen | wide | none |
| FasalSalah.jsx | PageShell | wide | none |
| Greenhouse.jsx | PageShell | wide | none |
| GreenhouseSubsidy.jsx | PageShell | content inside wide + related links | none |
| Founder.jsx | PageShell | wide | none |
| Grievance.jsx | PageShell | content inside wide + related links | none |
| Home.jsx | PageShell | wide | none |
| Homepage.jsx | home `Section`/`ks-section-inner` | wide | `w-[96px]` thumbnail; `md:max-w-[58%]` hero proportion (both whitelisted in verifier) |
| Info.jsx | PageShell | wide | none |
| Join.jsx | Screen | wide | none |
| Jugaad.jsx | PageShell | wide | none |
| JugaadJankari.jsx | PageShell | content inside wide + related links | none |
| KisanMela.jsx | PageShell | wide | `min-w-*` select controls only (not a page-width wrapper) |
| KisanMelaSubmit.jsx | Screen | wide | none |
| ListingDetail.jsx | Screen | wide | none |
| Login.jsx | Screen | wide | none |
| Mausam.jsx | PageShell | wide | none |
| Msp.jsx | PageShell | wide | none |
| MyListings.jsx | Screen | wide | none |
| NotFound.jsx | PageShell | content inside wide + related links | none |
| Post.jsx | Screen | wide | none |
| Privacy.jsx | PageShell | content inside wide + related links | none |
| Profile.jsx | Screen | wide | none |
| Resources.jsx | PageShell | wide | none |
| Safalta.jsx | PageShell | wide | none |
| Sawaal.jsx | PageShell | wide | none |
| SawaalDetail.jsx | PageShell | content inside wide + related links | none |
| SawaalHub.jsx | PageShell | content inside wide + related links | none |
| SchemeDetail.jsx | PageShell | content inside wide + related links | none |
| Search.jsx | PageShell | content inside wide + related links | none |
| Signup.jsx | Screen | wide | none |
| Terms.jsx | PageShell | wide with existing sticky table of contents | none |
| Videos.jsx | Screen | wide | none |
| Welcome.jsx | PageShell | content inside wide | none |
| Yojana.jsx | Screen | wide | none |
| components/pages/shared.jsx | shared component, not a route | inherits caller frame | none |
