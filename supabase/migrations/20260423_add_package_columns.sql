-- Rename travel_start/travel_end to start_date/end_date and add missing columns

ALTER TABLE public.packages
RENAME COLUMN IF EXISTS travel_start TO start_date;

ALTER TABLE public.packages
RENAME COLUMN IF EXISTS travel_end TO end_date;

ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS flights jsonb DEFAULT '{"airline":"","departure":"","return":"","notes":""}'::jsonb,
ADD COLUMN IF NOT EXISTS accommodations jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS transportation jsonb DEFAULT '{"type":"","description":""}'::jsonb,
ADD COLUMN IF NOT EXISTS mina_arafat jsonb DEFAULT '{"minaTentType":"","tentFeatures":"","arafatDetails":""}'::jsonb,
ADD COLUMN IF NOT EXISTS meals jsonb DEFAULT '{"makkah":"","madinah":"","mina":""}'::jsonb,
ADD COLUMN IF NOT EXISTS lectures jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS includes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cover_image text;