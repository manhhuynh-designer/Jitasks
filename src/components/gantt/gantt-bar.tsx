'use client'

import { cn } from '@/lib/utils'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getStatusInfo } from '@/lib/status-utils'

interface GanttBarProps {
  left: number
  width: number
  status: string
  name: string
  className?: string
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
                    getStatusInfo(status).color
                  )}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              )}
            </div>
          )}
        />
        <TooltipContent side="top" className="rounded-xl border-none glass-premium shadow-2xl p-3 z-[100]">
          <div className="space-y-1">
            <p className="text-[10px]tracking-widest text-slate-800 leading-tight">{name}</p>
            <div className="flex items-center gap-2">
                <div className={cn("h-1.5 w-1.5 rounded-full", getStatusInfo(status).color)} />
               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{status}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
