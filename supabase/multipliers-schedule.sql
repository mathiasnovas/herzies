-- Add schedule column for recurring multipliers
-- Run this in the Supabase SQL editor

ALTER TABLE public.multipliers
  ADD COLUMN IF NOT EXISTS schedule jsonb DEFAULT NULL;

-- schedule can be null (one-time, uses starts_at/ends_at range) or an object like:
-- { "days": [0], "hourStart": 0, "hourEnd": 24 }         — every Sunday all day
-- { "days": [5], "hourStart": 0, "hourEnd": 24 }         — every Friday all day
-- { "days": [0,1,2,3,4,5,6], "hourStart": 0, "hourEnd": 9 }  — every day before 9am
-- { "days": [0,1,2,3,4,5,6], "hourStart": 16, "hourEnd": 24 } — every day after 4pm
--
-- When schedule is set, starts_at/ends_at define the overall validity window
-- (e.g. "this multiplier is active from Jan 1 to Dec 31, every Sunday")

-- Seed the built-in multipliers
INSERT INTO public.multipliers (name, bonus, active, starts_at, ends_at, schedule) VALUES
  ('Sunday is Funday', 2.0, true, '2020-01-01', '2099-12-31',
   '{"days": [0], "hourStart": 0, "hourEnd": 24}'),
  ('Release Friday', 1.0, true, '2020-01-01', '2099-12-31',
   '{"days": [5], "hourStart": 0, "hourEnd": 24}'),
  ('Early Bird', 0.2, true, '2020-01-01', '2099-12-31',
   '{"days": [0,1,2,3,4,5,6], "hourStart": 0, "hourEnd": 9}'),
  ('After Hours', 0.2, true, '2020-01-01', '2099-12-31',
   '{"days": [0,1,2,3,4,5,6], "hourStart": 16, "hourEnd": 24}')
ON CONFLICT DO NOTHING;
