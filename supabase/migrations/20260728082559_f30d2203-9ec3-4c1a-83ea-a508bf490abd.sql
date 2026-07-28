CREATE TABLE public.candidate_retake_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid,
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_retake_requests_status_chk CHECK (status IN ('pending','approved','rejected'))
);

CREATE INDEX candidate_retake_requests_status_idx ON public.candidate_retake_requests(status, created_at DESC);
CREATE UNIQUE INDEX candidate_retake_requests_pending_uniq ON public.candidate_retake_requests(candidate_id, test_id) WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON public.candidate_retake_requests TO authenticated;
GRANT ALL ON public.candidate_retake_requests TO service_role;

ALTER TABLE public.candidate_retake_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read retake requests" ON public.candidate_retake_requests
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Staff create retake requests" ON public.candidate_retake_requests
FOR INSERT TO authenticated
WITH CHECK (requested_by = auth.uid() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role)));

CREATE POLICY "Admins decide retake requests" ON public.candidate_retake_requests
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_candidate_retake_requests_updated_at
BEFORE UPDATE ON public.candidate_retake_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();