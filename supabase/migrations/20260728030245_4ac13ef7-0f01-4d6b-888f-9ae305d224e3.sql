CREATE TABLE public.proctor_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  attempt_id uuid,
  test_id uuid,
  image_path text NOT NULL,
  event text NOT NULL DEFAULT 'snapshot',
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX proctor_snapshots_candidate_idx ON public.proctor_snapshots (candidate_id, captured_at DESC);
CREATE INDEX proctor_snapshots_attempt_idx ON public.proctor_snapshots (attempt_id, captured_at DESC);

GRANT SELECT ON public.proctor_snapshots TO authenticated;
GRANT ALL ON public.proctor_snapshots TO service_role;

ALTER TABLE public.proctor_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view proctor snapshots"
ON public.proctor_snapshots FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));