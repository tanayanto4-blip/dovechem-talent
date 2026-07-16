
CREATE POLICY "Staff read candidate files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'candidate-files' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')));
CREATE POLICY "Staff write candidate files" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'candidate-files' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')))
WITH CHECK (bucket_id = 'candidate-files' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr')));
