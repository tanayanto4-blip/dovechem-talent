DROP POLICY IF EXISTS "Admins manage test access" ON public.candidate_test_access;
CREATE POLICY "Staff manage test access"
ON public.candidate_test_access
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'hr'::app_role));