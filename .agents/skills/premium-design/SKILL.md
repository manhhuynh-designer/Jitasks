# Skill: Premium Glassmorphism Design System

## Core Aesthetic
The application uses a "Premium Glassmorphism" aesthetic characterized by high transparency, multi-layered glass panels, vibrant primary accents, and bold typography.

## 🎨 Color Tokens
- **Background**: `bg-[#F8FAFC]` (Slate 50) with subtle mesh gradients.
- **Glass Panels**: 
    - Layer 1 (Main): `bg-white/40 backdrop-blur-md border border-white/60 shadow-sm`
    - Layer 2 (Floating): `bg-white/60 backdrop-blur-xl border border-white/80`
    - Premium Hover: `hover:bg-white hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300`
- **Primary Accent**: `bg-primary` (Blue/Indigo), `text-primary`.
- **Status Colors**:
    - Critical/Overdue: `rose-500` (Red)
    - High/Warning: `amber-500` (Orange/Gold)
    - In Progress: `sky-400` (Light Blue)
    - Done: `emerald-500` (Green)

## 📐 Layout & Spacing
- **Border Radius**: 
    - Large Panels: `rounded-[2.5rem]` or `rounded-[3rem]`
    - Cards: `rounded-[2rem]`
    - Buttons/Inputs: `rounded-2xl` or `rounded-xl`
- **Typography**: 
    - Headers: `font-black text-slate-900 tracking-tight` (Uppercase for subheaders + tracking-widest).
    - Labels: `text-[10px] font-black uppercase tracking-widest text-slate-400`.

## 🧩 Reusable UI Patterns
### 1. Header with Icon
```tsx
<div className="h-16 w-16 rounded-[1.8rem] bg-white text-primary flex items-center justify-center shadow-2xl shadow-primary/10 ring-8 ring-primary/[0.03]">
  <Icon className="h-8 w-8" />
</div>
```

### 2. Premium Status Tab
Found in Project Detail. Uses a segmented control style with custom colors per stage.
- Active: Background color with white text.
- Inactive: Faded version of the stage color.

### 3. Glass Popover/Dropdown
- Always use `rounded-[2rem]` or `rounded-[2.5rem]`.
- Background should be `glass-premium` or `bg-white/80 backdrop-blur-xl`.
- Shadows should be heavy but soft: `shadow-2xl`.

### 4. Interactive Toggle/Switch
- Use smooth transitions (`duration-300`).
- Use the Project Detail style for binary choices.
