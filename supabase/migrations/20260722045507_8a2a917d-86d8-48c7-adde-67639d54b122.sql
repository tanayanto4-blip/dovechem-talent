ALTER TABLE public.audit_logs ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_type text NOT NULL DEFAULT 'staff';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_label text;
CREATE INDEX IF NOT EXISTS audit_logs_actor_type_idx ON public.audit_logs(actor_type);