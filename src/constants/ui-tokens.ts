// src/constants/ui-tokens.ts
export const STATUS_CONFIG = {
  todo:       { label: 'To Do',       bg: 'bg-slate-100',   text: 'text-slate-600',  hex: '#64748b' },
  inprogress: { label: 'In Progress', bg: 'bg-blue-100',    text: 'text-blue-600',   hex: '#0ea5e9' },
  pending:    { label: 'Pending',     bg: 'bg-amber-100',   text: 'text-amber-600',  hex: '#f59e0b' },
  done:       { label: 'Done',        bg: 'bg-emerald-100', text: 'text-emerald-600',hex: '#10b981' },
}

// ⚠️ PRIORITY configuration is primary handled in src/lib/priority-utils.ts
// Use getPriorityInfo(priority) to get bgLight, text, and color (dot) classes.

export const CARD_GLASS = 'rounded-[2.5rem] border-none glass-premium relative isolate'
export const CARD_SOLID = 'rounded-[2.5rem] border-none bg-white shadow-xl shadow-slate-200/50'
export const LABEL_XS   = 'text-[10px] font-black uppercase tracking-widest text-slate-400'
