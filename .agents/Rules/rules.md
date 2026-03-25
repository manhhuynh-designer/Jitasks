# Architectural Rules & Standards

## 1. Centralized Logic (src/lib)
- **NO HARDCODING**: Never hardcode colors, labels, or configurations for task/project statuses, priorities, or Gantt chart logic directly in components.
- **UTILITY FIRST**: Always use the centralized utilities from `src/lib`:
    - **`priority-utils.ts`**: For all task priority styling (`getPriorityInfo`).
    - **`status-utils.ts`**: For all task status styling and logic.
    - **`gantt-utils.ts`**: For timeline and scheduling calculations.
- **CONSISTENCY**: Ensure all views (Gantt, Task List, Project Dashboard) use the same source of truth for rendering to maintain a cohesive UI.

## 2. UI Aesthetics & Theming
- **GLASSMORPHISM**: All floating/overlay components (dialogs, toolbars) must follow the established light glassmorphism style (`bg-white/90`, `backdrop-blur-xl`, `shadow-2xl`).
- **PRIMARY THEME**: Use the `--primary` color (or `bg-primary`, `text-primary` classes) for major interactive elements like confirmation buttons.

## 3. Implementation Workflow
- **MODULAR**: Keep components focused on UI and delegate logic to hooks or `src/lib` utilities.
- **RESPONSIVE**: All UI changes must be verified for responsiveness across mobile and desktop.
