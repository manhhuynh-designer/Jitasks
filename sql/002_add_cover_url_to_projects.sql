-- e:\FREELANCE\linkweb\Jitasks\sql\002_add_cover_url_to_projects.sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cover_url TEXT;
