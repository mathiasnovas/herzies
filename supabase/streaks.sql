-- Add streak columns to herzies table
ALTER TABLE public.herzies
  ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_last_date text DEFAULT NULL;
