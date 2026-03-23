# Jitasks Project Knowledge Base (Detailed)

This document provides a granular view of the Jitasks application, covering file-level responsibilities, feature implementations, and technical patterns.

## 🚀 Project Mission
High-performance project management with a premium UI, focusing on operational efficiency and task visualization.

## 🛠️ Tech Stack & Patterns
- **Next.js 15 (App Router)**: Uses server components for layouts and client components for interactive pages.
- **Supabase**: 
  - **Auth**: Redirects unauthenticated users to `/login`.
  - **Database (v2.2)**: PostgreSQL with RLS. Direct table queries for management pages. 
    - **Security Pattern**: RLS policies are split into 4 distinct operations (SELECT, INSERT, UPDATE, DELETE) per table. This ensures accurate `deleted_at IS NULL` filtering for SELECT while allowing owners to UPDATE `deleted_at` for soft deletes.
    - **Audit Logs**: Protected via `audit_log_no_direct_write` policy. Client writes are blocked; all logging is handled server-side via `SECURITY DEFINER` triggers.
- **State & Data**:
  - **Hooks**: `useProjects`, `useTasks` handle main data streams with caching.
  - **Real-time UI**: Status changes utilize callbacks (e.g., in Calendar/Gantt) for instant feedback without full refetches.
  - **Filtering**: Centralized logic in `src/lib/` (e.g., `priority-utils.ts`). Project filtering aligns with database ENUMs.
- **UI System**:
  - **Glassmorphism**: `glass-premium` for consistent translucent surfaces.
  - **Dialog Design**: High-end consistency across `EditTaskDialog`, `NewTemplateDialog`, and `NewSupplierDialog`. 
    - **Responsiveness**: Dialogs use `max-h-[90vh]` and `overflow-y-auto` to ensure usability on smaller screens.
    - **Interaction Pattern**: Uses `@base-ui/react` style `render` props (e.g., in `PopoverTrigger`) to avoid nested `<button>` hydration errors.
  - **Bleed Effects**: Projects detail page uses a full-bleed cover image sitting behind the global header for a modern aesthetic.

## 📂 Feature Deep Dive

### 1. Dashboard & Task Hotlist (`src/app/page.tsx`)
- **Main View**: Dashboard with project grid and calendar toggle.
- **Hotlist**: Filtered view of tasks (Today, Upcoming, All).
- **Filtering**: Multi-dimensional filtering across Project Status (ENUM aligned) and Priority (proper background colors and logic).

### 2. Project Management (`src/app/projects/`)
- **Project Detail**: 
  - **Cover Image**: Managed via `cover_url`. Supports "Change Cover" via integrated upload/selection UI. Features a full-bleed layout.
  - **Stage Switcher**: Interactive bar representing Stages/Categories. Syncs with `projects.status`.
  - **Gantt Preview**: `MiniGanttCard` provides a high-level timeline of task groups within the project.

### 3. Specialized Visualization
- **Calendar (`src/components/tasks/calendar-view.tsx`)**: Artifact-free responsive grid with synchronized sticky headers. Monthly/Weekly views with instant status callbacks.
- **Gantt Layer**: 
  - **Data Structure**: `task_groups` support `start_date` and `end_date` for temporal plotting.
  - **Utilities**: `calculateGanttPercentages` handles millisecond-precision positioning and clamping.

### 4. Management & Templates
- **Task Templates**: Managed via `src/components/templates/new-template-dialog.tsx`. Fully consistent with premium dialog design system.
- **Email Templates (`src/app/email-templates/`)**: Centralized repository for reusable communication templates. Features bulk actions (delete), categorization (Supplier/Internal), and real-time synchronization.
- **Assignees & Suppliers**: Core relational entities linking personnel and partners to project workloads.

## 🗄️ Core File Mapping

| File Path | Responsibility |
|-----------|----------------|
| **Core & App Routes** | |
| `src/app/layout.tsx` | Auth guards, Sidebar initialization, Global Header |
| `src/app/page.tsx` | Dashboard (Projects, Calendar, Hotlist), Global Filter |
| `src/app/projects/page.tsx` | Project Management List |
| `src/app/projects/[id]/page.tsx` | Project Detail (Bleed Cover, Stage Switching, Tasks) |
| `src/app/suppliers/page.tsx` | Supplier Management Page |
| `src/app/assignees/page.tsx` | Assignee Management Page |
| `src/app/categories/page.tsx` | Stage/Category Management Page |
| `src/app/templates/page.tsx` | Task Template Management Page |
| `src/app/email-templates/page.tsx` | Email Template Management Page |
| **Gantt & Visualization** | |
| `src/components/gantt/mini-gantt-card.tsx` | Project timeline preview on Dashboard/Details |
| `src/components/gantt/group-timeline-modal.tsx` | Detailed Gantt Chart View |
| `src/components/gantt/edit-group-dialog.tsx` | Edit Task Groups (start/end dates) |
| `src/components/gantt/gantt-bar.tsx` | Individual Gantt Bar UI component |
| `src/components/tasks/calendar-view.tsx` | Complex Month/Week Calendar visualization |
| `src/lib/gantt-utils.ts` | Gantt position/width calculation logic |
| **Task & Project Management** | |
| `src/components/tasks/edit-task-dialog.tsx` | Comprehensive Task Editor |
| `src/components/tasks/new-task-dialog.tsx` | Task Creation Dialog |
| `src/components/projects/new-project-dialog.tsx` | Project Creation Flow |
| `src/components/projects/edit-project-dialog.tsx` | Project Metadata Editor |
| `src/components/templates/new-template-dialog.tsx` | Premium Template Management UI |
| **Data & Infrastructure** | |
| `src/hooks/use-tasks.ts` | Centralized Task Fetching with Relational Joins |
| `src/hooks/use-projects.ts` | Project Fetching with Dynamic Status Colors |
| `src/hooks/use-auth.ts` | Supabase Auth State Wrapper |
| `src/lib/priority-utils.ts` | Priority Icons & Color Definitions |
| `supabase/schema.sql` | SSOT for Database Modeling & RLS (v2.2) |

## 🔑 Key SQL Relations
- `projects.cover_url` ➡️ Public URL for project header backgrounds.
- `task_groups.start_date / end_date` ➡️ Temporal windows for Gantt plotting.
- `projects.status` (text) matches `project_categories.name` (text) for UI color/logic matching.

---
*Last Updated: 2026-03-23*
