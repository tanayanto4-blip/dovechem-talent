
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
CREATE POLICY "Own profile select" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

DROP POLICY IF EXISTS "Staff read tests" ON public.tests;
CREATE POLICY "Staff read tests" ON public.tests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));

DROP POLICY IF EXISTS "Staff read questions" ON public.test_questions;
CREATE POLICY "Staff read questions" ON public.test_questions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr'::app_role));
