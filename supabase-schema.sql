-- ============================================
-- Project Tracker - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  contact_no TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create submissions table
CREATE TABLE submissions (
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

-- 3. Create team_settings table (invitation codes)
CREATE TABLE team_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_code TEXT NOT NULL,
  member_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default codes (change these after first login!)
INSERT INTO team_settings (admin_code, member_code)
VALUES ('PT26ADMIN', 'STOKTEAM');

-- 4. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;

-- 5. Profiles policies
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 6. Submissions policies
CREATE POLICY "Anyone can view submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert submissions"
  ON submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions"
  ON submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can delete submissions"
  ON submissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 7. Team settings policies
-- Anyone can read codes during signup (needed for code validation)
CREATE POLICY "Anyone can read team settings"
  ON team_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can update codes
CREATE POLICY "Only admins can update team settings"
  ON team_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 8. Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('submission-photos', 'submission-photos', true);

-- 9. Storage policies
CREATE POLICY "Anyone can view photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'submission-photos');

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'submission-photos');

CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'submission-photos');

-- 10. Enable realtime for submissions table
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;

-- 11. Create indexes for performance
CREATE INDEX idx_submissions_date ON submissions(submission_date);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_cable ON submissions(cable_return);

-- 12. Auto-create profile on signup (trigger)
-- Role is passed from the signup form via user metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email, contact_no, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'contact_no', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
