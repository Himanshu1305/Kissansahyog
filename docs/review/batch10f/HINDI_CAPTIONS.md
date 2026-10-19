# Batch 10F — Hindi wording for founder review (all HUMAN-REVIEW)

All text lives in `src/lib/i18n/strings.js` (hi + en). "सीताराम" greeting rule unchanged (no new greeting).

## Phase 1 — homepage hero
| Key | Hindi | English | Note |
|---|---|---|---|
| `home_hero_demo` | 1 मिनट का डेमो देखें | Watch a 1-minute demo | Same words as the 10D button (key renamed from `home_live_cta_demo`). Not new wording. |

Removed (no longer shown anywhere): the five persona tabs ("किराये पर यंत्र चाहिए" …), their captions, "उदाहरण" in the phone, "रजिस्टर करें" hero button, the field-picture sentence, the crop strip words and the four facts ("… छोटे डेमो — साइट चलाना सीखें" etc.).

## Phase 2 — collapsible sections
| Key | Hindi | English | Where |
|---|---|---|---|
| `section_expand` | खोलें | Expand | Screen-reader text after a collapsed section heading (not visible). |
| `section_collapse` | बंद करें | Collapse | Screen-reader text after an open section heading (not visible). It appears in the prerendered page text (SEO diff: "बंद करें" per section). |

No visible new wording: the arrow is a drawn chevron. The mandi-compare view's new heading reuses the existing tab label "मंडी तुलना".
