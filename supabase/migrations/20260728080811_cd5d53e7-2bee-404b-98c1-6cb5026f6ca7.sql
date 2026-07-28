CREATE TABLE public.candidate_test_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  is_open boolean NOT NULL DEFAULT true,
  reason text,
  retake_count integer NOT NULL DEFAULT 0,
  last_reopened_at timestamp with time zone,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, test_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_test_access TO authenticated;
GRANT ALL ON public.candidate_test_access TO service_role;

ALTER TABLE public.candidate_test_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read test access" ON public.candidate_test_access
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Admins manage test access" ON public.candidate_test_access
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_candidate_test_access_updated_at
BEFORE UPDATE ON public.candidate_test_access
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();