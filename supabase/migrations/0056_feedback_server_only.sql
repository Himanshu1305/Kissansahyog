-- Batch 7G — the feedback form saves through the site's own server only.
-- NOT APPLIED by the batch that wrote it: apply to staging first, then production.
--
-- What it does: takes away the browser's permission to call submit_feedback (0055)
-- directly. From now on only the service role may run it, which is what the
-- /api/feedback Pages Function uses. Nothing else changes: the function body, the
-- table, get_public_feedback and the admin functions stay exactly as 0055 left them.
--
-- Deploy the site build that no longer calls the RPC from the browser before (or
-- together with) this migration; an older build would fall back to the e-mail link.
--
-- Rollback note: re-grant to anon, authenticated —
--   grant execute on function public.submit_feedback(text, text, text, text, text, text, boolean) to anon, authenticated;

revoke execute on function public.submit_feedback(text, text, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.submit_feedback(text, text, text, text, text, text, boolean) to service_role;
