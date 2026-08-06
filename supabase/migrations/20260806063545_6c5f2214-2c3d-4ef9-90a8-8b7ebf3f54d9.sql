CREATE TABLE public.error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  area text NOT NULL DEFAULT 'public',
  route text,
  source text NOT NULL DEFAULT 'window.onerror',
  message text NOT NULL,
  stack text,
  actor_label text,
  user_agent text,
  ip text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text
);

CREATE INDEX idx_error_events_occurred_at ON public.error_events (occurred_at DESC);
CREATE INDEX idx_error_events_resolved ON public.error_events (resolved);

GRANT SELECT ON public.error_events TO authenticated;
GRANT ALL ON public.error_events TO service_role;

ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read error events"
ON public.error_events FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));