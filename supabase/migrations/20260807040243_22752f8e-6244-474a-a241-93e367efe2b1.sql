ALTER TABLE public.candidate_codes
  ADD COLUMN IF NOT EXISTS active_device_token text,
  ADD COLUMN IF NOT EXISTS active_device_at timestamptz;