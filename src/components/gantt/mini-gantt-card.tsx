'use client'

import { Task } from '@/hooks/use-tasks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Maximize2, Calendar, Flag, Settings } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface MiniGanttCardProps {
  group: {
    id: string
    name: string
    start_date?: string | null
    deadline?: string | null
  }
  tasks: Task[]
  onExpand: (groupId: string) => void
  onCardClick?: () => void
  onTaskClick?: (taskId: string) => void
  onEditGroup?: (groupId: string) => void
}

const STATUS_STYLES: Record<string, { bg: string, hover: string, text: string, dot: string }> = {
  todo: { 
    bg: 'bg-slate-50', 
    hover: 'hover:bg-slate-100',
    text: 'text-slate-700', 
    dot: 'bg-slate-300' 
  },
  inprogress: { 
    bg: 'bg-sky-50', 
    hover: 'hover:bg-sky-100',
    text: 'text-sky-900', 
    dot: 'bg-sky-400' 
  },
  pending: { 
    bg: 'bg-orange-50', 
    hover: 'hover:bg-orange-100',
    text: 'text-orange-900', 
    dot: 'bg-orange-400' 
  },
  done: { 
    bg: 'bg-emerald-50', 
    hover: 'hover:bg-emerald-100',
    text: 'text-emerald-900', 
    dot: 'bg-emerald-500' 
  },
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-slate-400',
  medium: 'text-amber-500',
  high: 'text-rose-500',
}

export function MiniGanttCard({ group, tasks, onExpand, onCardClick, onTaskClick, onEditGroup }: MiniGanttCardProps) {
  const startDate = group.start_date ? new Date(group.start_date) : null
  const deadline = group.deadline ? new Date(group.deadline) : null
  
  const hasDates = !!(startDate && deadline)

  return (
    <Card 
      onClick={onCardClick}
      className={cn(
        "rounded-[2.5rem] border-none bg-white shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all group overflow-hidden h-full flex flex-col min-h-[180px]",
        onCardClick && "cursor-pointer active:scale-[0.98]"
      )}
    >
      <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0 relative z-10">
        <div className="space-y-1">
          <CardTitle className="text-xs font-black text-slate-800 uppercase tracking-widest truncate max-w-[140px]">
            {group.name}
          </CardTitle>
          {hasDates ? (
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
              {format(startDate!, 'dd MMM')} - {format(deadline!, 'dd MMM')}
            </p>
          ) : (
            <p className="text-[9px] font-bold text-rose-400 italic uppercase">Set dates to view</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation()
              onEditGroup?.(group.id)
            }}
            className="h-8 w-8 rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation()
              onExpand(group.id)
            }}
            className="h-8 w-8 rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="px-6 pb-6 pt-2 flex-1 flex flex-col bg-slate-50/10">
        <div className="space-y-2 mt-2 flex-1">
          {tasks.length > 0 ? (
            // Show up to 6 tasks in the mini view
            tasks.slice(0, 6).map(task => {
              const taskDeadline = task.deadline ? new Date(task.deadline) : null
              const style = STATUS_STYLES[task.status] || STATUS_STYLES.todo
              const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low

              return (
                <div 
                  key={task.id}
                  onClick={(e) => {
                      e.stopPropagation()
                      onTaskClick?.(task.id)
                  }}
                  className={cn(
                    "h-10 px-3 rounded-[1rem] flex items-center justify-between cursor-pointer transition-all border border-transparent hover:border-slate-200 group/task hover:scale-[1.02]",
                    style.bg,
                    style.hover
                  )}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Flag className={cn("h-3 w-3 shrink-0 fill-current", priorityColor)} />
                    <span className={cn("text-[11px] font-bold truncate transition-colors", style.text)}>
                      {task.name}
                    </span>
                  </div>
                  {taskDeadline && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0 ml-2 opacity-60 group-hover/task:opacity-100">
                      {format(taskDeadline, 'dd MMM')}
                    </span>
                  )}
                </div>
              )
            })
          ) : (
            <div className="h-16 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-[1.5rem] bg-white/50">
              <p className="text-[9px] font-black text-slate-200 uppercase tracking-widest">No tasks</p>
            </div>
          )}
          {tasks.length > 6 && (
            <p className="text-[8px] font-bold text-slate-300 text-center uppercase tracking-widest pt-2">
              + {tasks.length - 6} more tasks
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
