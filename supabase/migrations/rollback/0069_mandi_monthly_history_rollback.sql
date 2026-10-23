-- Rollback for 0069 (optional): removes the history table and its data. The website hides the section by itself.
drop table if exists public.mandi_monthly_history;
