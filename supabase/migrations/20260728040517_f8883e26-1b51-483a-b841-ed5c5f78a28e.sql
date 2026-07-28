ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS code_snapshot text;

UPDATE public.candidates c
SET code_snapshot = cc.code
FROM public.candidate_codes cc
WHERE cc.id = c.code_id AND c.code_snapshot IS NULL;

ALTER TABLE public.candidates ALTER COLUMN code_id DROP NOT NULL;

ALTER TABLE public.candidates DROP CONSTRAINT candidates_code_id_fkey;
ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_code_id_fkey
  FOREIGN KEY (code_id) REFERENCES public.candidate_codes(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.snapshot_candidate_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.candidates
  SET code_snapshot = COALESCE(code_snapshot, OLD.code),
      full_name = COALESCE(full_name, OLD.candidate_name),
      position_applied = COALESCE(position_applied, OLD.position_applied)
  WHERE code_id = OLD.id;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_snapshot_candidate_code ON public.candidate_codes;
CREATE TRIGGER trg_snapshot_candidate_code
BEFORE DELETE ON public.candidate_codes
FOR EACH ROW EXECUTE FUNCTION public.snapshot_candidate_code();