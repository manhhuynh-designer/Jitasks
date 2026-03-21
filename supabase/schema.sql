-- SUPABASE SCHEMA v2.2: Production-Ready, Robust, Scalable
-- (JITasks Core Infrastructure - Production Grade)
-- Changelog v2.2:
--   [FIX] RLS policies tách theo operation (SELECT/INSERT/UPDATE/DELETE)
--         để soft delete hoạt động đúng trên projects, tasks, task_comments
--   [FIX] audit_log: thêm policy chặn direct INSERT từ client
--   [FIX] task_attachments: thêm deleted_at cho nhất quán với các bảng khác

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

-- ==========================================
-- 3. AUDIT LOG TABLE & FUNCTION
-- (Defined before other tables so triggers can reference it)
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
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Assignees
CREATE TABLE public.assignees (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name  TEXT NOT NULL,
  role       TEXT,
  email      TEXT,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  order_index INTEGER DEFAULT 0,
  created_by  UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
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
  task_time     INTEGER DEFAULT 0,        -- Stored in minutes
  order_index   INTEGER DEFAULT 0,        -- For drag-and-drop ordering
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
  updated_at       TIMESTAMPTZ DEFAULT NOW()
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
-- [FIX v2.2] Thêm deleted_at để nhất quán với task_comments
CREATE TABLE public.task_attachments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name  TEXT NOT NULL,
  file_url   TEXT NOT NULL,
  file_type  TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL    -- [FIX v2.2]
);

-- ==========================================
-- 7. PERFORMANCE INDEXES
-- ==========================================

-- Tasks
CREATE INDEX idx_tasks_project_id   ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee_id  ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_task_group_id ON public.tasks(task_group_id);
CREATE INDEX idx_tasks_status       ON public.tasks(status);
CREATE INDEX idx_tasks_deadline     ON public.tasks(deadline);
CREATE INDEX idx_tasks_active       ON public.tasks(deleted_at) WHERE deleted_at IS NULL;

-- Projects
CREATE INDEX idx_projects_supplier_id ON public.projects(supplier_id);
CREATE INDEX idx_projects_status      ON public.projects(status);
CREATE INDEX idx_projects_active      ON public.projects(deleted_at) WHERE deleted_at IS NULL;

-- Metadata
CREATE INDEX idx_task_groups_category_id      ON public.task_groups(category_id);
CREATE INDEX idx_task_comments_task_id        ON public.task_comments(task_id);
CREATE INDEX idx_task_attachments_task_id     ON public.task_attachments(task_id);

-- ==========================================
-- 8. ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log         ENABLE ROW LEVEL SECURITY;

-- ---- Shared read (categories & groups) ----
CREATE POLICY "categories_read_all"   ON public.project_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_groups_read_all"  ON public.task_groups         FOR SELECT TO authenticated USING (true);

-- ---- Simple isolation (no soft delete) ----
CREATE POLICY "profiles_isolation"   ON public.profiles        FOR ALL TO authenticated USING (id = auth.uid())             WITH CHECK (id = auth.uid());
CREATE POLICY "suppliers_isolation"  ON public.suppliers       FOR ALL TO authenticated USING (created_by = auth.uid())     WITH CHECK (created_by = auth.uid());
CREATE POLICY "assignees_isolation"  ON public.assignees       FOR ALL TO authenticated USING (created_by = auth.uid())     WITH CHECK (created_by = auth.uid());
CREATE POLICY "templates_isolation"  ON public.task_templates  FOR ALL TO authenticated USING (created_by = auth.uid())     WITH CHECK (created_by = auth.uid());
CREATE POLICY "categories_manage_own" ON public.project_categories FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "task_groups_manage_own" ON public.task_groups   FOR ALL TO authenticated USING (created_by = auth.uid())     WITH CHECK (created_by = auth.uid());

-- ---- audit_log ----
-- SELECT: chỉ xem log của chính mình
CREATE POLICY "audit_log_select"        ON public.audit_log FOR SELECT TO authenticated USING (changed_by = auth.uid());
-- [FIX v2.2] INSERT: chặn hoàn toàn direct write từ client — chỉ trigger (SECURITY DEFINER) mới được ghi
CREATE POLICY "audit_log_no_direct_write" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (false);

-- ---- Projects (has soft delete) ----
-- [FIX v2.2] Tách thành 4 policy riêng để soft delete hoạt động đúng
-- SELECT: ẩn deleted rows
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL);
-- INSERT: chỉ cần owner check
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
-- UPDATE: cho phép cập nhật kể cả set deleted_at (soft delete)
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
  USING  (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
-- DELETE: hard delete nếu cần
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ---- Tasks (has soft delete) ----
-- [FIX v2.2] Tách thành 4 policy riêng
-- SELECT: ẩn deleted rows, kiểm tra qua project owner
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = tasks.project_id
        AND projects.created_by = auth.uid()
    )
  );
-- INSERT
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = tasks.project_id
        AND projects.created_by = auth.uid()
    )
  );
-- UPDATE: cho phép soft delete
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = tasks.project_id
        AND projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = tasks.project_id
        AND projects.created_by = auth.uid()
    )
  );
-- DELETE
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = tasks.project_id
        AND projects.created_by = auth.uid()
    )
  );

-- ---- Task Comments (has soft delete) ----
-- [FIX v2.2] Tách thành 4 policy riêng
CREATE POLICY "comments_select" ON public.task_comments FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND p.created_by = auth.uid()
    )
  );
CREATE POLICY "comments_insert" ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND p.created_by = auth.uid()
    )
  );
CREATE POLICY "comments_update" ON public.task_comments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND p.created_by = auth.uid()
    )
  );
CREATE POLICY "comments_delete" ON public.task_comments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE t.id = task_comments.task_id
        AND p.created_by = auth.uid()
    )
  );

-- ---- Task Attachments ----
-- [FIX v2.2] Thêm soft delete filter ở SELECT
CREATE POLICY "attachments_select" ON public.task_attachments FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE t.id = task_attachments.task_id
        AND p.created_by = auth.uid()
    )
  );
CREATE POLICY "attachments_insert" ON public.task_attachments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE t.id = task_attachments.task_id
        AND p.created_by = auth.uid()
    )
  );
CREATE POLICY "attachments_update" ON public.task_attachments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE t.id = task_attachments.task_id
        AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE t.id = task_attachments.task_id
        AND p.created_by = auth.uid()
    )
  );
CREATE POLICY "attachments_delete" ON public.task_attachments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE t.id = task_attachments.task_id
        AND p.created_by = auth.uid()
    )
  );

-- ==========================================
-- 9. AUTOMATION TRIGGERS
-- ==========================================

-- Drop existing triggers to allow idempotent re-run
DROP TRIGGER IF EXISTS tr_projects_updated_at         ON public.projects;
DROP TRIGGER IF EXISTS tr_tasks_updated_at            ON public.tasks;
DROP TRIGGER IF EXISTS tr_suppliers_updated_at        ON public.suppliers;
DROP TRIGGER IF EXISTS tr_assignees_updated_at        ON public.assignees;
DROP TRIGGER IF EXISTS tr_task_comments_updated_at    ON public.task_comments;
DROP TRIGGER IF EXISTS tr_task_templates_updated_at   ON public.task_templates;
DROP TRIGGER IF EXISTS tr_task_attachments_updated_at ON public.task_attachments;
DROP TRIGGER IF EXISTS tr_projects_audit              ON public.projects;
DROP TRIGGER IF EXISTS tr_tasks_audit                 ON public.tasks;

-- Timestamp triggers
CREATE TRIGGER tr_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER tr_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER tr_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER tr_assignees_updated_at
  BEFORE UPDATE ON public.assignees
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER tr_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER tr_task_templates_updated_at
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER tr_task_attachments_updated_at
  BEFORE UPDATE ON public.task_attachments
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Audit triggers
CREATE TRIGGER tr_projects_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.log_audit_event();

CREATE TRIGGER tr_tasks_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE PROCEDURE public.log_audit_event();

-- Profile auto-creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- 10. ESSENTIAL PERMISSIONS (Production Fix)
-- ==========================================
-- Ensure roles have standard access to public schema objects
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;