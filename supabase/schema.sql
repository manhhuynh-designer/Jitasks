-- SUPABASE SCHEMA v2.3: Production-Ready, Robust, Scalable
-- (JITasks Core Infrastructure - Production Grade)
-- Changelog v2.3:
--   [FEAT] Thêm hệ thống provisioning default data cho user mới
--   [FIX] Cập nhật RLS policies cho task_groups và categories để hỗ trợ copy-on-create
--   [FIX] Đồng nhất tên cột deadline trong task_groups

-- ==========================================
-- 0. CLEAN SLATE (Run this block first on a fresh DB)
-- ==========================================
DROP TYPE IF EXISTS public.project_status CASCADE;
DROP TYPE IF EXISTS public.task_status    CASCADE;
DROP TYPE IF EXISTS public.task_priority  CASCADE;

-- ==========================================
-- 1. EXTENSIONS & ESSENTIAL TYPES
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Project Status ENUM
CREATE TYPE public.project_status AS ENUM ('Sourcing', 'Active', 'On Hold', 'Archive');

-- Task ENUMS
CREATE TYPE public.task_status   AS ENUM ('todo', 'inprogress', 'pending', 'done');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- ==========================================
-- 2. UTILITY FUNCTIONS
-- ==========================================

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Provision default data for new users
CREATE OR REPLACE FUNCTION public.provision_user_defaults(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_cat_sourcing_id UUID;
    v_cat_active_id   UUID;
    v_cat_onhold_id   UUID;
    v_cat_archive_id  UUID;
    v_group_id        UUID;
BEGIN
    -- Only provision if the user has no categories yet
    IF EXISTS (SELECT 1 FROM public.project_categories WHERE created_by = p_user_id) THEN
        RETURN;
    END IF;

    -- A. Insert Default Categories (Stages)
    INSERT INTO public.project_categories (name, color, order_index, created_by)
    VALUES ('Sourcing', 'bg-blue-500', 0, p_user_id) RETURNING id INTO v_cat_sourcing_id;
    
    INSERT INTO public.project_categories (name, color, order_index, created_by)
    VALUES ('Active', 'bg-emerald-500', 1, p_user_id) RETURNING id INTO v_cat_active_id;
    
    INSERT INTO public.project_categories (name, color, order_index, created_by)
    VALUES ('On Hold', 'bg-amber-500', 2, p_user_id) RETURNING id INTO v_cat_onhold_id;
    
    INSERT INTO public.project_categories (name, color, order_index, created_by)
    VALUES ('Archive', 'bg-slate-500', 3, p_user_id) RETURNING id INTO v_cat_archive_id;

    -- B. Sourcing Groups & Templates
    INSERT INTO public.task_groups (name, category_id, order_index, created_by) 
    VALUES ('Tiềm năng', v_cat_sourcing_id, 0, p_user_id) RETURNING id INTO v_group_id;
    INSERT INTO public.task_templates (project_status, task_name, category_id, task_group_id, default_priority, created_by)
    VALUES ('Sourcing', 'Đàm phán điều khoản hợp đồng', v_cat_sourcing_id, v_group_id, 'critical', p_user_id);

    INSERT INTO public.task_groups (name, category_id, order_index, created_by) 
    VALUES ('Đang liên hệ', v_cat_sourcing_id, 1, p_user_id) RETURNING id INTO v_group_id;
    INSERT INTO public.task_templates (project_status, task_name, category_id, task_group_id, default_priority, created_by)
    VALUES ('Sourcing', 'Liên hệ báo giá NCC mới', v_cat_sourcing_id, v_group_id, 'high', p_user_id);

    INSERT INTO public.task_groups (name, category_id, order_index, created_by) 
    VALUES ('Đã chốt', v_cat_sourcing_id, 2, p_user_id) RETURNING id INTO v_group_id;
    INSERT INTO public.task_templates (project_status, task_name, category_id, task_group_id, default_priority, created_by)
    VALUES ('Sourcing', 'Kiểm tra mẫu sản phẩm', v_cat_sourcing_id, v_group_id, 'medium', p_user_id);

    -- C. Active Groups & Templates
    INSERT INTO public.task_groups (name, category_id, order_index, created_by) 
    VALUES ('Đang đăng', v_cat_active_id, 0, p_user_id) RETURNING id INTO v_group_id;
    INSERT INTO public.task_templates (project_status, task_name, category_id, task_group_id, default_priority, created_by)
    VALUES ('Active', 'Viết nội dung mô tả sản phẩm (SEO)', v_cat_active_id, v_group_id, 'medium', p_user_id);

    -- D. On Hold / Archive Groups
    INSERT INTO public.task_groups (name, category_id, order_index, created_by) VALUES
    ('Đang giao', v_cat_onhold_id, 0, p_user_id),
    ('Đã nhận', v_cat_onhold_id, 1, p_user_id),
    ('Hoàn tất', v_cat_archive_id, 0, p_user_id),
    ('Hủy bỏ', v_cat_archive_id, 1, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 3. AUDIT LOG TABLE & FUNCTION
-- ==========================================

CREATE TABLE public.audit_log (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name  TEXT    NOT NULL,
  record_id   UUID    NOT NULL,
  action_type TEXT    NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB   DEFAULT NULL,
  new_data    JSONB   DEFAULT NULL,
  changed_by  UUID    REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by UUID;
BEGIN
  v_changed_by := auth.uid();

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_log (table_name, record_id, action_type, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), v_changed_by);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_log (table_name, record_id, action_type, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_changed_by);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_log (table_name, record_id, action_type, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), v_changed_by);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. CORE IDENTITY & MASTER DATA
-- ==========================================

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id         UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name  TEXT,
  role       TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers
CREATE TABLE public.suppliers (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  contact_info TEXT,
  address      TEXT,
  tax_code     TEXT,
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ DEFAULT NULL
);

-- Assignees
CREATE TABLE public.assignees (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name  TEXT NOT NULL,
  role       TEXT,
  email      TEXT,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Project Categories (Stages)
CREATE TABLE public.project_categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT,
  order_index INTEGER DEFAULT 0,
  created_by  UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Task Groups
CREATE TABLE public.task_groups (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  category_id UUID REFERENCES public.project_categories(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  start_date  TIMESTAMPTZ,
  deadline    TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0,
  created_by  UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Email Templates
CREATE TABLE public.email_templates (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title          TEXT NOT NULL,
  subject        TEXT NOT NULL,
  body           TEXT NOT NULL,
  recipient_type TEXT CHECK (recipient_type IN ('supplier', 'internal', 'both')),
  tags           TEXT[] DEFAULT '{}',
  use_count      INTEGER DEFAULT 0,
  stage          TEXT,
  created_by     UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ DEFAULT NULL
);

-- ==========================================
-- 5. PRIMARY PROJECT ENTITIES
-- ==========================================

-- Projects
CREATE TABLE public.projects (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  status      public.project_status DEFAULT 'Sourcing',
  cover_url   TEXT,
  color_code  TEXT,
  supplier_id UUID REFERENCES public.suppliers(id),
  created_by  UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

-- Tasks
CREATE TABLE public.tasks (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES public.project_categories(id) ON DELETE SET NULL,
  task_group_id UUID REFERENCES public.task_groups(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  start_date    TIMESTAMPTZ,
  deadline      TIMESTAMPTZ,
  task_time     INTEGER DEFAULT 0,
  order_index   INTEGER DEFAULT 0,
  status        public.task_status   DEFAULT 'todo',
  priority      public.task_priority DEFAULT 'medium',
  assignee_id   UUID REFERENCES public.assignees(id),
  created_by    UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ DEFAULT NULL
);

-- Task Templates
CREATE TABLE public.task_templates (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_status   public.project_status NOT NULL,
  task_name        TEXT NOT NULL,
  category_id      UUID REFERENCES public.project_categories(id) ON DELETE SET NULL,
  task_group_id    UUID REFERENCES public.task_groups(id) ON DELETE SET NULL,
  default_priority public.task_priority DEFAULT 'medium',
  created_by       UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ DEFAULT NULL
);

-- Project Documents
CREATE TABLE public.project_documents (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id   UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  type         TEXT CHECK (type IN ('note', 'link', 'file', 'image')),
  content      TEXT,
  url          TEXT,
  file_name    TEXT,
  file_size    BIGINT,
  mime_type    TEXT,
  created_by   UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ DEFAULT NULL
);

-- ==========================================
-- 6. EXPANSION TABLES
-- ==========================================

-- Task Comments
CREATE TABLE public.task_comments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Task Attachments
CREATE TABLE public.task_attachments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name  TEXT NOT NULL,
  file_url   TEXT NOT NULL,
  file_type  TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- ==========================================
-- 7. PERFORMANCE INDEXES
-- ==========================================

CREATE INDEX idx_tasks_project_id      ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee_id     ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_task_group_id  ON public.tasks(task_group_id);
CREATE INDEX idx_tasks_status          ON public.tasks(status);
CREATE INDEX idx_tasks_active          ON public.tasks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_active       ON public.projects(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_task_groups_project_id ON public.task_groups(project_id);

-- ==========================================
-- 8. ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents  ENABLE ROW LEVEL SECURITY;

-- Profiles: Own isolation
CREATE POLICY "profiles_isolation" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Categories: Own only
CREATE POLICY "categories_select" ON public.project_categories FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "categories_insert" ON public.project_categories FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "categories_update" ON public.project_categories FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "categories_delete" ON public.project_categories FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Suppliers
CREATE POLICY "suppliers_isolation" ON public.suppliers FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Assignees
CREATE POLICY "assignees_isolation" ON public.assignees FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Task Groups: Own or Project Owner
CREATE POLICY "task_groups_select" ON public.task_groups FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())));
CREATE POLICY "task_groups_insert" ON public.task_groups FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())));
CREATE POLICY "task_groups_update" ON public.task_groups FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())))
  WITH CHECK (created_by = auth.uid() OR (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())));
CREATE POLICY "task_groups_delete" ON public.task_groups FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid())));

-- Projects: Creator based
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Tasks: Project owner based
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE id = tasks.project_id AND created_by = auth.uid()));
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = tasks.project_id AND created_by = auth.uid()));
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE id = tasks.project_id AND created_by = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = tasks.project_id AND created_by = auth.uid()));
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE id = tasks.project_id AND created_by = auth.uid()));

-- Project Documents
CREATE POLICY "documents_isolation" ON public.project_documents FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND created_by = auth.uid()));

-- Task Comments
CREATE POLICY "task_comments_isolation" ON public.task_comments FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.tasks t JOIN public.projects p ON t.project_id = p.id WHERE t.id = task_comments.task_id AND p.created_by = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t JOIN public.projects p ON t.project_id = p.id WHERE t.id = task_comments.task_id AND p.created_by = auth.uid()));

-- Task Attachments
CREATE POLICY "task_attachments_isolation" ON public.task_attachments FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.tasks t JOIN public.projects p ON t.project_id = p.id WHERE t.id = task_attachments.task_id AND p.created_by = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t JOIN public.projects p ON t.project_id = p.id WHERE t.id = task_attachments.task_id AND p.created_by = auth.uid()));

-- Task Templates: Own isolation
CREATE POLICY "task_templates_select" ON public.task_templates FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "task_templates_manage" ON public.task_templates FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Audit Log
CREATE POLICY "audit_log_select"        ON public.audit_log FOR SELECT TO authenticated USING (changed_by = auth.uid());
CREATE POLICY "audit_log_no_direct_write" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (false);

-- ==========================================
-- 9. AUTOMATION TRIGGERS
-- ==========================================

-- Timestamp triggers
CREATE TRIGGER tr_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER tr_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER tr_task_comments_updated_at BEFORE UPDATE ON public.task_comments FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Audit triggers
CREATE TRIGGER tr_projects_audit AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE PROCEDURE public.log_audit_event();
CREATE TRIGGER tr_tasks_audit AFTER INSERT OR UPDATE OR DELETE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE public.log_audit_event();

-- Profile & Data auto-creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, avatar_url = EXCLUDED.avatar_url;
  
  PERFORM public.provision_user_defaults(new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 10. PERMISSIONS
-- ==========================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;