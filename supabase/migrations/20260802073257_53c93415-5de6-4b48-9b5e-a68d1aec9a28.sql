-- keep updated_at accurate whenever a candidate edits their biodata
DROP TRIGGER IF EXISTS candidates_set_updated_at ON public.candidates;
CREATE TRIGGER candidates_set_updated_at
BEFORE UPDATE ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- realtime streaming of candidate rows to staff dashboards
ALTER TABLE public.candidates REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'candidates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
  END IF;
END $$;