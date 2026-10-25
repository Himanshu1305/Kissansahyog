# Batch 13A decisions
1. Cause of "Offering / Looking for not working": diagnosed by reading the code, NOT reproduced live at 360 x 640 on staging (a staging run was not possible; see REPORT). The old filter did re-query by `listing_type`, but the "Popular listings" block above the grid ignored the type and filled the first phone screen, and with "All" nothing said which cards were offers. Fixed by splitting in the browser, two headed sections and a type-aware, collapsed-on-phone popular block.
2. Tag block with a tag already in the web address starts OPEN on phones (the brief says collapsed "when no tag is selected").
3. When one type is chosen its section is shown without an arrow (always expanded, as asked).
4. Block open/closed state is kept in sessionStorage (own small component, not CollapsibleSection, which uses localStorage and different phone defaults).
5. Popular list is fetched with limit 12, filtered by type, then trimmed to 4.
6. Desktop clipping: NOT reproduced at 1366/1536/1725/1920 (strip and heading sit 16 px from the left edge, no horizontal overflow). Per the brief, no change; see BACKLOG.md.
7. Existing spec `guide-10c-browse-etag.spec.js` updated (phone tag block starts collapsed; result-card selector no longer excludes all `<section>`s).
8. Staging deploy refused by the permission check; not worked around.
