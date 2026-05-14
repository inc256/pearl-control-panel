-- Add media_type column to gallery table for image/video differentiation

ALTER TABLE IF EXISTS public.gallery
ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video'));
