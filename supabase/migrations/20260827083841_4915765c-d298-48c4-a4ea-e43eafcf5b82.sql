DROP POLICY IF EXISTS "Admins decide retake requests" ON public.candidate_retake_requests;
CREATE POLICY "Staff decide retake requests"
ON public.candidate_retake_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'hr'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'hr'::public.app_role)
);