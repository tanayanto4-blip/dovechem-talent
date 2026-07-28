
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS voice_audio_path text,
  ADD COLUMN IF NOT EXISTS voice_audio_name text,
  ADD COLUMN IF NOT EXISTS voice_audio_mime text,
  ADD COLUMN IF NOT EXISTS voice_mode text NOT NULL DEFAULT 'tts';

CREATE POLICY "Staff read voice instruction audio"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'voice-instructions' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')));

CREATE POLICY "Staff upload voice instruction audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice-instructions' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')));

CREATE POLICY "Staff update voice instruction audio"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'voice-instructions' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')))
WITH CHECK (bucket_id = 'voice-instructions' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')));

CREATE POLICY "Staff delete voice instruction audio"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'voice-instructions' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')));
