'use client'

import { Flag } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PRIORITY_OPTIONS, getPriorityInfo } from '@/lib/priority-utils'
import { cn } from '@/lib/utils'

interface GanttPriorityDropdownProps {
  priority: string
  onPriorityChange: (priority: string) => void
  disabled?: boolean
}

export function GanttPriorityDropdown({ priority, onPriorityChange, disabled }: GanttPriorityDropdownProps) {
  const info = getPriorityInfo(priority)
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            disabled={disabled}
            className="shrink-0 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center transition-all group/prio cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Flag className={cn(
              "h-3.5 w-3.5 transition-all fill-current",
              info.text
            )} />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="rounded-xl border-none glass-premium shadow-2xl p-2 min-w-[150px] z-[100]">
        {PRIORITY_OPTIONS.map(p => (
          <DropdownMenuItem 
            key={p.value} 
            onClick={() => onPriorityChange(p.value)}
            className="rounded-lg px-3 py-1.5 cursor-pointer focus:bg-primary/10 flex items-center gap-2"
          >
            <Flag className={cn("h-3.5 w-3.5 fill-current", p.text)} />
            <span className="text-[10px] font-bold">{p.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
