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

// ─────────────────────────────────────────────────────────────
// DEADLINE URGENCY — màu riêng, không trùng status/priority
// ─────────────────────────────────────────────────────────────
export const DEADLINE_LEVELS = {
  overdue:  { bg: 'bg-rose-50',   text: 'text-rose-500',   border: 'border-rose-100',   rowBg: 'bg-rose-50/30'   },
  today:    { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', rowBg: 'bg-violet-50/20' },
  tomorrow: { bg: 'bg-teal-50',   text: 'text-teal-600',   border: 'border-teal-100',   rowBg: ''                },
  soon:     { bg: 'bg-teal-50',   text: 'text-teal-500',   border: 'border-teal-100',   rowBg: ''                },
  normal:   { bg: 'bg-slate-50',  text: 'text-slate-400',  border: 'border-slate-100',  rowBg: ''                },
}

// Không dùng date-fns ở đây để tránh import trong constants file
export function getDeadlineLevel(deadline: string): {
  level: keyof typeof DEADLINE_LEVELS
  label: string
} {
  const d      = new Date(deadline)
  const now    = new Date()
  const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff   = Math.round((target.getTime() - today.getTime()) / 86_400_000)

  if (diff < 0)   return { level: 'overdue',  label: `${Math.abs(diff)}n trước` }
  if (diff === 0) return { level: 'today',    label: 'Hôm nay'                  }
  if (diff === 1) return { level: 'tomorrow', label: 'Ngày mai'                 }
  if (diff <= 7)  return { level: 'soon',     label: `${diff} ngày`             }
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return { level: 'normal', label: `${dd}/${mm}` }
}
