-- SUPABASE SCHEMA FOR PROJECT TASK MANAGER

-- 1. Create Profiles Table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Suppliers Table
CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Projects Table
CREATE TYPE project_status AS ENUM ('Sourcing', 'Listing', 'Tracking', 'Archived');

CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  supplier_id UUID REFERENCES suppliers(id),
  status project_status DEFAULT 'Sourcing',
  color_code TEXT,
  description TEXT
);

-- 4. Create Tasks Table
CREATE TYPE task_status AS ENUM ('todo', 'inprogress', 'pending', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE,
  status task_status DEFAULT 'todo',
  priority task_priority DEFAULT 'medium',
  assignee_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Task Templates Table
CREATE TABLE task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_status project_status NOT NULL,
  task_name TEXT NOT NULL,
  default_priority task_priority DEFAULT 'medium'
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Allow authenticated users access)
CREATE POLICY "Allow authenticated full access to profiles" ON profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to suppliers" ON suppliers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to projects" ON projects FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to tasks" ON tasks FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to task_templates" ON task_templates FOR ALL TO authenticated USING (true);

-- Functions and Triggers
-- Create a profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
