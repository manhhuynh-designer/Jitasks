'use client'

import { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils'
import { getStatusInfo } from '@/lib/status-utils'

interface TaskStatusHeatmapProps {
  tasks: Array<{
    id: string
    status: 'todo' | 'inprogress' | 'pending' | 'done'
  }>
  maxCells?: number
}

const STATUS_ORDER = { inprogress: 0, todo: 1, pending: 2, done: 3 }

export function TaskStatusHeatmap({ tasks, maxCells = 40 }: TaskStatusHeatmapProps) {
  const { displayed, overflow, summary } = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    })

    const displayed = sorted.slice(0, maxCells)
    const overflow = tasks.length - displayed.length

    const summary = {
      inprogress: 0,
      todo:       0,
      pending:    0,
      done:       0,
    }

    tasks.forEach(t => {
      summary[t.status]++
    })

    return { displayed, overflow, summary }
  }, [tasks, maxCells])

  if (tasks.length === 0) return null

  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex flex-wrap gap-1 mt-3 cursor-help">
            {displayed.map((task) => (
              <div 
                key={task.id}
                className={cn(
                  "w-3 h-3 rounded-sm transition-all hover:scale-110",
                  getStatusInfo(task.status).color,
                  task.status === 'done' && "opacity-50"
                )}
              />
            ))}
            {overflow > 0 && (
              <span className="text-[9px] font-black text-slate-400 flex items-center ml-0.5">
                +{overflow}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="rounded-2xl border-none glass-premium p-4 shadow-xl pointer-events-none min-w-[140px]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 border-b border-slate-100 pb-2 mb-2">
             Trạng thái công việc
            </div>
            <div className="flex items-center justify-between gap-6 text-[11px] text-slate-800">
              <span className="flex items-center gap-1.5">
                <div className={cn("h-2 w-2 rounded-full", getStatusInfo('inprogress').color)} /> 
                Doing
              </span>
              <span className="text-slate-500">{summary.inprogress}</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-[11px] text-slate-800">
              <span className="flex items-center gap-1.5">
                <div className={cn("h-2 w-2 rounded-full", getStatusInfo('todo').color)} /> 
                To Do
              </span>
              <span className="text-slate-500">{summary.todo}</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-[11px] text-slate-800">
              <span className="flex items-center gap-1.5">
                <div className={cn("h-2 w-2 rounded-full", getStatusInfo('pending').color)} /> 
                Pending
              </span>
              <span className="text-slate-500">{summary.pending}</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-[11px] text-slate-800">
              <span className="flex items-center gap-1.5">
                <div className={cn("h-2 w-2 rounded-full", getStatusInfo('done').color, "opacity-50")} /> 
                Done
              </span>
              <span className="text-slate-500">{summary.done}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
