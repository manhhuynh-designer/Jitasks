'use client'

import { useMemo } from 'react'
import { isBefore, addDays } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getDeadlineLevel, DEADLINE_LEVELS } from '@/constants/ui-tokens'
import { getPriorityInfo } from '@/lib/priority-utils'

interface UpcomingTasksStripProps {
  tasks: Array<{
    id: string
    name: string
    status: string
    priority: string
    deadline: string | null
    assignees?: { id: string, full_name: string } | null
    task_groups?: { id: string; name: string } | null
  }>
  onTaskClick: (taskId: string) => void
}

export function UpcomingTasksStrip({ tasks, onTaskClick }: UpcomingTasksStripProps) {
  const { relevant, overflowCount } = useMemo(() => {
    const cutoff = addDays(new Date(), 15)
    const filtered = tasks
      .filter(t => t.status !== 'done' && t.deadline && isBefore(new Date(t.deadline), cutoff))
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    return { relevant: filtered.slice(0, 7), overflowCount: Math.max(0, filtered.length - 7) }
  }, [tasks])

  if (tasks.length === 0) return null

  return (
    <Card className="rounded-[2.5rem] border-none bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deadline gần nhất</p>
          {relevant.length > 0 && (
            <Badge className="text-[9px] font-black bg-slate-100 text-slate-500 rounded-lg px-2 border-none">
              {relevant.length} tasks
            </Badge>
          )}
        </div>

        {relevant.length === 0 ? (
          <p className="px-6 pb-6 text-[11px] text-slate-300 font-medium italic text-center">
            Không có task nào sắp đến hạn
          </p>
        ) : (
          <div className="px-3 pb-4 space-y-0.5">
            {relevant.map(task => {
              const { level, label } = getDeadlineLevel(task.deadline!)
              const dlStyle    = DEADLINE_LEVELS[level]
              const priorityInfo = getPriorityInfo(task.priority)
              return (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-2xl transition-all hover:bg-slate-50 active:scale-[0.99]",
                    dlStyle.rowBg
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Priority dot — dùng getPriorityInfo từ priority-utils */}
                      <div className={cn("h-2 w-2 rounded-full shrink-0", priorityInfo.color)} />
                      <span className="text-sm font-semibold text-slate-700 truncate">{task.name}</span>
                    </div>
                    <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0", dlStyle.bg, dlStyle.text)}>
                      {label}
                    </span>
                  </div>
                  {(task.task_groups?.name || task.assignees?.full_name) && (
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 ml-4 truncate">
                      {[task.task_groups?.name, task.assignees?.full_name].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {overflowCount > 0 && (
          <p className="px-6 pb-5 text-[10px] text-slate-400 font-bold text-center">
            +{overflowCount} tasks khác có deadline sắp tới
          </p>
        )}
      </CardContent>
    </Card>
  )
}
