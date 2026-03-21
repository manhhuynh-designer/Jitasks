# Jitasks Project Knowledge Base (Detailed)

This document provides a granular view of the Jitasks application, covering file-level responsibilities, feature implementations, and technical patterns.

## 🚀 Project Mission
High-performance project management with a premium UI, focusing on operational efficiency and task visualization.

## 🛠️ Tech Stack & Patterns
- **Next.js 15 (App Router)**: Uses server components for layouts and client components for interactive pages.
- **Supabase**: 
  - **Auth**: Redirects unauthenticated users to `/login`.
  - **Database**: PostgreSQL with RLS. Direct table queries for management pages; custom hooks for core data. Special attention is required for RLS policies during bulk data imports (e.g., inserting task groups).
- **State & Data**:
  - **Hooks**: `useProjects`, `useTasks` handle main data streams with caching (via `refresh` triggers).
  - **Real-time UI**: Status changes are handled optimistically or via callbacks (e.g., in the Calendar) to avoid full refetches where possible.
  - **Filtering**: Client-side filtering using `useMemo` for performance.
- **UI System**:
  - **Glassmorphism**: Custom class `glass-premium` for consistent translucent effects.
  - **Dialogs**: Unified components (e.g., `NewSupplierDialog`) handle both creation and editing. Project dialogs track core meta-data like start dates via integrated calendar components.

## 📂 Feature Deep Dive

### 1. Dashboard & Task Hotlist (`src/app/page.tsx`)
- **Main View**: Dashboard with project grid and a calendar toggle.
- **Hotlist (Sidebar)**: 
  - **Today's Tasks**: Filtered by `deadline === today` and `status !== 'done'`.
  - **Upcoming Tasks**: Filtered by range (7 days, 30 days, or All).
- **Search**: Global search across project names, supplier names, and task names.

### 2. Project Management (`src/app/projects/`)
- **Project List (`/page.tsx`)**: Filterable view of all projects.
- **Project Detail (`/[id]/page.tsx`)**:
  - **Stage Switcher**: Interactive bar representing `project_categories`. Updates the `projects.status` field.
  - **Task Lifecycle**: Tasks are associated with categories (stages). The UI emphasizes progress within the current stage.
  - **Summary**: Real-time progress calculation (`completedTasks / totalTasks`).

### 3. Specialized Task Calendar (`src/components/tasks/calendar-view.tsx`)
- **Month/Week Views**: Uses `date-fns` for interval calculation. The UI is a premium, artifact-free responsive grid with synchronized, rounded sticky headers.
- **Business Logic**: Tasks are only visible if `task.project_categories?.name === task.projects?.status` (this ensures tasks shown are relevant to the project's current operational stage).
- **Interactions**:
  - `Day Details Modal`: Aggregates all tasks for a specific date.
  - `Quick Jump`: Popover with a mini-calendar for rapid navigation.
  - **Task Cards**: Simplified in Weekly view; utilizes callbacks to instantly reflect data updates like status toggles.

### 4. Management Modules
- **Suppliers (`src/app/suppliers/`)**: Tracks external partners. Links to projects via `supplier_id`.
- **Assignees (`src/app/assignees/`)**: Manages staff. Tracks project participation by counting unique `project_id` across assigned tasks.
- **Local Data Importer (`src/app/debug/import/`)**: A local-only debug facility for uploading JSON payloads. It enables safe testing of imports, relational integrity validations (like nested task groups), and circumvents production data pollution.

## 🗄️ Core File Mapping

| File Path | Responsibility |
|-----------|----------------|
| `src/app/layout.tsx` | Auth guards, Sidebar initialization, Global Header |
| `src/app/page.tsx` | Main Dashboard, Hotlist logic, Global Filter |
| `src/app/projects/[id]/page.tsx` | Project Detail, Stage Switching, Task Management |
| `src/components/tasks/calendar-view.tsx` | Complex Calendar Logic (Month/Week) |
| `src/hooks/use-tasks.ts` | Centralized Task Fetching with Relational Joins |
| `src/hooks/use-projects.ts` | Project Fetching with Dynamic Status Colors |
| `src/lib/supabase.ts` | Supabase Client Config |
| `supabase/schema.sql` | SSOT for Database Modeling & RLS |
| `src/app/debug/import/page.tsx` | Local debug tool for uploading complex JSON data |

## 🔑 Key SQL Relations
- `projects.supplier_id` ➡️ `suppliers.id`
- `tasks.project_id` ➡️ `projects.id`
- `tasks.assignee_id` ➡️ `assignees.id`
- `projects.status` (text) matches `project_categories.name` (text) for UI color/logic matching.

---
*Last Updated: 2026-03-21*
