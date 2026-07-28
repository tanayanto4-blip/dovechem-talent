ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS voice_instruction text,
  ADD COLUMN IF NOT EXISTS voice_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS voice_lang text NOT NULL DEFAULT 'id-ID',
  ADD COLUMN IF NOT EXISTS voice_rate numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS voice_autoplay boolean NOT NULL DEFAULT true;