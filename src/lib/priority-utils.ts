import { Flag, AlertTriangle, LucideIcon } from 'lucide-react'

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'

export interface PriorityOption {
  value: PriorityLevel
  label: string
  color: string // Tailwind bg class (solid)
  bgLight: string // Tailwind bg class (light)
  text: string  // Tailwind text class
  icon: LucideIcon
  animate?: string // Optional animation class
}

export const PRIORITY_OPTIONS: PriorityOption[] = [
  { 
    value: 'low', 
    label: 'Low', 
    color: 'bg-slate-300', 
    bgLight: 'bg-slate-100',
    text: 'text-slate-400', 
    icon: Flag 
  },
  { 
    value: 'medium', 
    label: 'Medium', 
    color: 'bg-amber-400', 
    bgLight: 'bg-amber-50',
    text: 'text-amber-500', 
    icon: Flag 
  },
  { 
    value: 'high', 
    label: 'High', 
    color: 'bg-fuchsia-500', 
    bgLight: 'bg-fuchsia-50',
    text: 'text-fuchsia-600', 
    icon: Flag 
  },
  { 
    value: 'critical', 
    label: 'Critical', 
    color: 'bg-red-600', 
    bgLight: 'bg-red-50',
    text: 'text-red-500', 
    icon: Flag,
  },
]

/**
 * Returns the priority configuration for a given level.
 * Defaults to 'low' if priority is unrecognized.
 */
export const getPriorityInfo = (priority: string | undefined | null): PriorityOption => {
  const p = priority?.toLowerCase()
  return PRIORITY_OPTIONS.find(opt => opt.value === p) || PRIORITY_OPTIONS[0]
}
