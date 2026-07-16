
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'hr');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles (admin/HR users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  username text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Candidate access codes
CREATE TABLE public.candidate_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  candidate_name text NOT NULL,
  candidate_email text,
  position_applied text,
  active boolean NOT NULL DEFAULT true,
  used_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_codes TO authenticated;
GRANT ALL ON public.candidate_codes TO service_role;
ALTER TABLE public.candidate_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage codes" ON public.candidate_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'));

-- Candidates
CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL UNIQUE REFERENCES public.candidate_codes(id) ON DELETE CASCADE,
  full_name text,
  nik text,
  birth_place text,
  birth_date date,
  gender text,
  address text,
  phone text,
  email text,
  position_applied text,
  education text,
  marital_status text,
  data_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read candidates" ON public.candidates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));
CREATE POLICY "Staff manage candidates" ON public.candidates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

-- Candidate files
CREATE TABLE public.candidate_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  file_type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, file_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_files TO authenticated;
GRANT ALL ON public.candidate_files TO service_role;
ALTER TABLE public.candidate_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage files" ON public.candidate_files FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

-- Tests
CREATE TABLE public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  test_type text NOT NULL, -- 'mcq' | 'disc' | 'kraepelin'
  duration_minutes int NOT NULL DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read tests" ON public.tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage tests" ON public.tests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_number int NOT NULL,
  question_text text NOT NULL,
  options jsonb, -- [{"key":"A","label":"..."}]
  correct_answer text,
  dimension text, -- D, I, S, C for DISC
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(test_id, question_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_questions TO authenticated;
GRANT ALL ON public.test_questions TO service_role;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read questions" ON public.test_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage questions" ON public.test_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Test attempts
CREATE TABLE public.test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress', -- in_progress | finished
  score numeric,
  result jsonb,
  UNIQUE(candidate_id, test_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_attempts TO authenticated;
GRANT ALL ON public.test_attempts TO service_role;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage attempts" ON public.test_attempts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

CREATE TABLE public.test_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.test_questions(id) ON DELETE CASCADE,
  answer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_answers TO authenticated;
GRANT ALL ON public.test_answers TO service_role;
ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage answers" ON public.test_answers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'hr'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER candidates_updated_at BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed sample tests + questions
INSERT INTO public.tests (code, name, description, test_type, duration_minutes) VALUES
 ('IQ-LOGIC','Test Logika & Penalaran','Soal pilihan ganda untuk mengukur kemampuan logika dan penalaran umum.','mcq',30),
 ('DISC','Personality DISC','Kuesioner kepribadian gaya DISC (Dominance, Influence, Steadiness, Compliance).','disc',20),
 ('KRAEPELIN','Kraepelin Sederhana','Deret penjumlahan angka untuk mengukur ketelitian & konsistensi kerja.','kraepelin',15);

-- MCQ sample questions
WITH t AS (SELECT id FROM public.tests WHERE code='IQ-LOGIC')
INSERT INTO public.test_questions (test_id, question_number, question_text, options, correct_answer) VALUES
 ((SELECT id FROM t),1,'Lanjutan deret: 2, 4, 8, 16, ...','[{"key":"A","label":"20"},{"key":"B","label":"24"},{"key":"C","label":"32"},{"key":"D","label":"64"}]','C'),
 ((SELECT id FROM t),2,'Semua mawar adalah bunga. Sebagian bunga adalah merah. Kesimpulan?','[{"key":"A","label":"Semua mawar merah"},{"key":"B","label":"Sebagian mawar mungkin merah"},{"key":"C","label":"Tidak ada mawar merah"},{"key":"D","label":"Semua bunga adalah mawar"}]','B'),
 ((SELECT id FROM t),3,'Jika A>B dan B>C, maka:','[{"key":"A","label":"A<C"},{"key":"B","label":"A=C"},{"key":"C","label":"A>C"},{"key":"D","label":"Tidak dapat disimpulkan"}]','C'),
 ((SELECT id FROM t),4,'PENA : MENULIS = PISAU : ...','[{"key":"A","label":"Tajam"},{"key":"B","label":"Memotong"},{"key":"C","label":"Dapur"},{"key":"D","label":"Besi"}]','B'),
 ((SELECT id FROM t),5,'Lanjutan: 1, 1, 2, 3, 5, 8, ...','[{"key":"A","label":"11"},{"key":"B","label":"12"},{"key":"C","label":"13"},{"key":"D","label":"15"}]','C');

-- DISC sample (dimension per question, key = D/I/S/C option)
WITH t AS (SELECT id FROM public.tests WHERE code='DISC')
INSERT INTO public.test_questions (test_id, question_number, question_text, options, dimension) VALUES
 ((SELECT id FROM t),1,'Yang paling menggambarkan Anda:', '[{"key":"D","label":"Tegas & berorientasi hasil"},{"key":"I","label":"Antusias & suka bergaul"},{"key":"S","label":"Sabar & mendukung"},{"key":"C","label":"Teliti & analitis"}]','MIX'),
 ((SELECT id FROM t),2,'Dalam tim saya cenderung:', '[{"key":"D","label":"Memimpin & mengambil keputusan"},{"key":"I","label":"Memotivasi & menginspirasi"},{"key":"S","label":"Menjaga harmoni"},{"key":"C","label":"Memastikan detail benar"}]','MIX'),
 ((SELECT id FROM t),3,'Saya bekerja paling baik saat:', '[{"key":"D","label":"Ada tantangan & target"},{"key":"I","label":"Berkolaborasi dengan orang"},{"key":"S","label":"Suasana stabil"},{"key":"C","label":"Aturan & prosedur jelas"}]','MIX'),
 ((SELECT id FROM t),4,'Menghadapi konflik saya:', '[{"key":"D","label":"Langsung berhadapan"},{"key":"I","label":"Mencari kompromi lewat komunikasi"},{"key":"S","label":"Menenangkan situasi"},{"key":"C","label":"Menganalisis fakta"}]','MIX'),
 ((SELECT id FROM t),5,'Prioritas utama saya:', '[{"key":"D","label":"Pencapaian"},{"key":"I","label":"Pengakuan"},{"key":"S","label":"Keamanan"},{"key":"C","label":"Kualitas"}]','MIX');
