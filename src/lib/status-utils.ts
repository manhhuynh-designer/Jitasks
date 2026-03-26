import { Circle, PlayCircle, Clock, CheckCircle2, LucideIcon } from 'lucide-react'

export type TaskStatus = 'todo' | 'inprogress' | 'pending' | 'done'

export interface StatusOption {
  value: TaskStatus
  label: string
  color: string // Tailwind bg class
  textColor: string // Tailwind text class
  icon: LucideIcon
}

export const STATUS_OPTIONS: StatusOption[] = [
  { value: 'todo', label: 'To Do', color: 'bg-slate-500', textColor: 'text-slate-500', icon: Circle },
  { value: 'inprogress', label: 'In Progress', color: 'bg-sky-400', textColor: 'text-sky-400', icon: PlayCircle },
  { value: 'pending', label: 'Pending', color: 'bg-orange-400', textColor: 'text-orange-400', icon: Clock },
  { value: 'done', label: 'Done', color: 'bg-emerald-500', textColor: 'text-emerald-500', icon: CheckCircle2 },
]

export const getStatusInfo = (status: string | undefined | null): StatusOption => {
  const s = status?.toLowerCase()
  return STATUS_OPTIONS.find(opt => opt.value === s) || STATUS_OPTIONS[0]
}
