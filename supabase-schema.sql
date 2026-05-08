-- ============================================
-- Project Tracker - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- Safe to re-run on an existing database.
-- ============================================

-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  contact_no TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  submission_date DATE NOT NULL,
  submission_time TIME NOT NULL,
  completion_date DATE NOT NULL,
  application_number TEXT NOT NULL,
  cable_return BOOLEAN DEFAULT FALSE,
  cable_return_date DATE,
  photos TEXT[] DEFAULT '{}',
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Team settings (invitation codes)
CREATE TABLE IF NOT EXISTS team_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_code TEXT NOT NULL,
  member_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO team_settings (admin_code, member_code)
SELECT 'PT26ADMIN', 'PT26TEAM'
WHERE NOT EXISTS (SELECT 1 FROM team_settings);

-- 4. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;

-- 5. Profiles policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- 6. Submissions policies
DROP POLICY IF EXISTS "Anyone can view submissions" ON submissions;
CREATE POLICY "Anyone can view submissions"
  ON submissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert submissions" ON submissions;
CREATE POLICY "Authenticated users can insert submissions"
  ON submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own submissions" ON submissions;
CREATE POLICY "Users can update own submissions"
  ON submissions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only admins can delete submissions" ON submissions;
CREATE POLICY "Only admins can delete submissions"
  ON submissions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- 7. Team settings policies — admin-only read & write
-- Codes are NOT exposed to anon/members directly. Validation happens via RPC below.
DROP POLICY IF EXISTS "Anyone can read team settings" ON team_settings;
DROP POLICY IF EXISTS "Admins can read team settings" ON team_settings;
CREATE POLICY "Admins can read team settings"
  ON team_settings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "Only admins can update team settings" ON team_settings;
CREATE POLICY "Only admins can update team settings"
  ON team_settings FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- 7b. Members can read ONLY the member_code via RPC (admins can call too)
CREATE OR REPLACE FUNCTION get_member_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT member_code INTO code FROM team_settings LIMIT 1;
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_member_invite_code() TO authenticated;

-- 7c. Public RPC to validate an invite code at signup time.
-- Returns the role granted by the code, or NULL if invalid.
-- This is the ONLY way unauthenticated users can interact with codes.
CREATE OR REPLACE FUNCTION validate_invite_code(code TEXT)
RETURNS TEXT AS $$
DECLARE
  s team_settings%ROWTYPE;
BEGIN
  SELECT * INTO s FROM team_settings LIMIT 1;
  IF s IS NULL THEN RETURN NULL; END IF;
  IF code = s.admin_code THEN RETURN 'admin'; END IF;
  IF code = s.member_code THEN RETURN 'member'; END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT) TO anon, authenticated;

-- 8. Storage bucket for photos
-- Public-read for simple <img> rendering; uploads/deletes still gated by RLS below.
-- Filenames include a random token + per-user folder, so URLs are not enumerable.
INSERT INTO storage.buckets (id, name, public)
VALUES ('submission-photos', 'submission-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 9. Storage policies — folder per user, 5MB cap, image/* only
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
CREATE POLICY "Authenticated can view photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'submission-photos');

DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'submission-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
CREATE POLICY "Users delete own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'submission-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    )
  );

-- 10. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;

-- 11. Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_date ON submissions(submission_date);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_cable ON submissions(cable_return);

-- 12. Auto-create profile on signup
-- Role is derived ONLY from the invite code submitted at signup (passed in metadata
-- as 'invite_code'); ignores any client-supplied 'role' field.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  s team_settings%ROWTYPE;
  derived_role TEXT := 'member';
  submitted_code TEXT;
BEGIN
  SELECT * INTO s FROM team_settings LIMIT 1;
  submitted_code := NEW.raw_user_meta_data->>'invite_code';
  IF s IS NOT NULL AND submitted_code IS NOT NULL THEN
    IF submitted_code = s.admin_code THEN
      derived_role := 'admin';
    ELSIF submitted_code = s.member_code THEN
      derived_role := 'member';
    ELSE
      RAISE EXCEPTION 'Invalid invitation code';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invitation code required';
  END IF;

  INSERT INTO profiles (id, name, email, contact_no, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'contact_no', ''),
    derived_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
