
CREATE TABLE public.candidate_file_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  file_type text NOT NULL,
  version integer NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  uploader_kind text NOT NULL CHECK (uploader_kind IN ('candidate','staff','system')),
  uploader_id uuid,
  uploader_label text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX candidate_file_versions_cand_type_idx ON public.candidate_file_versions (candidate_id, file_type, version DESC);

GRANT SELECT, INSERT ON public.candidate_file_versions TO authenticated;
GRANT ALL ON public.candidate_file_versions TO service_role;

ALTER TABLE public.candidate_file_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read file versions"
  ON public.candidate_file_versions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "Staff insert file versions"
  ON public.candidate_file_versions FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));
