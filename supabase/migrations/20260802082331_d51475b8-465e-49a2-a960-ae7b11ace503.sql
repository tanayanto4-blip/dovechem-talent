CREATE OR REPLACE FUNCTION public.guard_tests_hr_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.duration_minutes IS NULL OR NEW.duration_minutes < 1 OR NEW.duration_minutes > 600 THEN
    RAISE EXCEPTION 'Durasi test harus antara 1 dan 600 menit';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.code IS DISTINCT FROM OLD.code
       OR NEW.name IS DISTINCT FROM OLD.name
       OR NEW.test_type IS DISTINCT FROM OLD.test_type
       OR NEW.description IS DISTINCT FROM OLD.description THEN
      RAISE EXCEPTION 'HR hanya dapat mengubah durasi, status publish, dan instruksi suara test';
    END IF;
  END IF;

  RETURN NEW;
END $function$;