'use client'

import { cn } from '@/lib/utils'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface GanttBarProps {
  left: number
  width: number
  status: string
  name: string
  className?: string
}

const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-slate-400',
  inprogress: 'bg-sky-400',
  pending: 'bg-orange-400',
  done: 'bg-emerald-500',
}

export function GanttBar({ left, width, status, name, className }: GanttBarProps) {
  // If width is 0, don't render the bar indicator, just the background
  const hasBar = width > 0

  return (
    <TooltipProvider delay={100}>
      <Tooltip>
        <TooltipTrigger
          render={(
            <div className={cn("relative h-2 w-full bg-slate-100/30 rounded-full overflow-hidden", className)}>
              {hasBar && (
                <div 
                  className={cn(
                    "absolute top-0 h-full rounded-full transition-all duration-700 ease-out shadow-[0_1px_2px_rgba(0,0,0,0.1)]",
                    STATUS_COLORS[status] || 'bg-slate-300'
                  )}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              )}
            </div>
          )}
        />
        <TooltipContent side="top" className="rounded-xl border-none glass-premium shadow-2xl p-3 z-[100]">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 leading-tight">{name}</p>
            <div className="flex items-center gap-2">
               <div className={cn("h-1.5 w-1.5 rounded-full", STATUS_COLORS[status] || 'bg-slate-300')} />
               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{status}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
