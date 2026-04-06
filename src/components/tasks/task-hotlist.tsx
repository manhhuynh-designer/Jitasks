'use client'

import { useState } from 'react'
import { 
  Check, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  MoreHorizontal, 
  User, 
  Sparkles, 
  Briefcase, 
  Flag,
  Circle,
  PlayCircle
} from 'lucide-react'
import { getPriorityInfo } from '@/lib/priority-utils'
import { cn } from '@/lib/utils'
import { EditTaskDialog } from '@/components/tasks/edit-task-dialog'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const STATUS_CONFIG: any = {
  todo: { label: 'To Do', color: 'bg-slate-500', ghost: 'bg-slate-100 text-slate-500', icon: Circle },
  inprogress: { label: 'In Progress', color: 'bg-sky-400', ghost: 'bg-sky-50 text-sky-600', icon: PlayCircle },
  pending: { label: 'Pending', color: 'bg-orange-400', ghost: 'bg-orange-50 text-orange-600', icon: Clock },
  done: { label: 'Done', color: 'bg-emerald-500', ghost: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
}

const formatTaskTime = (minutes: any) => {
  if (typeof minutes !== 'number') return minutes;
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function TaskHotlist({ 
  tasks, 
  title, 
  onStatusChange,
  filter = 'today',
  upcomingRange = 'all'
}: { 
  tasks: any[], 
  title?: string, 
  onStatusChange?: () => void,
  filter?: 'today' | 'upcoming',
  upcomingRange?: '7' | '30' | 'all'
}) {
  const [selectedTask, setSelectedTask] = useState<any>(null)

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    if (!error && onStatusChange) {
      onStatusChange()
    }
  }

  const sortedTasks = [...tasks]
    .filter(t => t.status !== 'done')
    .filter(t => t.projects?.status !== 'Archive')
    .filter(t => !t.projects?.deleted_at)
    .filter(t => {
      if (!t.deadline) return filter === 'upcoming' && upcomingRange === 'all'
      
      const today = new Date()
      today.setHours(0,0,0,0)
      const taskDate = new Date(t.deadline)
      taskDate.setHours(0,0,0,0)
      
      if (filter === 'today') {
        return taskDate.getTime() <= today.getTime()
      } else {
        if (taskDate.getTime() <= today.getTime()) return false
        
        if (upcomingRange === '7') {
          const nextWeek = new Date(today)
          nextWeek.setDate(today.getDate() + 7)
          return taskDate.getTime() <= nextWeek.getTime()
        }
        if (upcomingRange === '30') {
          const nextMonth = new Date(today)
          nextMonth.setDate(today.getDate() + 30)
          return taskDate.getTime() <= nextMonth.getTime()
        }
        return true
      }
    })
    .sort((a, b) => {
      const today = new Date()
      today.setHours(0,0,0,0)
      const dA = new Date(a.deadline || 0)
      dA.setHours(0,0,0,0)
      const dB = new Date(b.deadline || 0)
      dB.setHours(0,0,0,0)
      
      const isAOverdue = dA < today
      const isBOverdue = dB < today
      
      if (isAOverdue && !isBOverdue) return -1
      if (!isAOverdue && isBOverdue) return 1
      
      const priorityWeight: any = { critical: 3, high: 2, medium: 1, low: 0 }
      const pA = priorityWeight[a.priority] || 0
      const pB = priorityWeight[b.priority] || 0
      if (pA !== pB) return pB - pA
      
      if ((a.order_index || 0) !== (b.order_index || 0)) return (a.order_index || 0) - (b.order_index || 0);

      const dAOriginal = new Date(a.deadline || 0)
      const dBOriginal = new Date(b.deadline || 0)
      if (dAOriginal.getTime() !== dBOriginal.getTime()) return dAOriginal.getTime() - dBOriginal.getTime()

      return (a.task_time || 0) - (b.task_time || 0);
    })

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {sortedTasks.length > 0 ? (
          sortedTasks.map(task => (
            <div 
              key={task.id} 
              onClick={() => setSelectedTask(task)}
              className={cn(
                "group flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-white border border-rose-100 transition-all duration-300 cursor-pointer hover:scale-[1.01] xl:hover:scale-[1.02] hover:border-rose-300 shadow-sm",
                filter === 'today' ? "hover:shadow-lg hover:shadow-rose-100/50" : "hover:shadow-lg hover:shadow-primary/5"
              )}
            >
              <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button 
                        className={cn(
                          "h-8 w-8 rounded-xl flex items-center justify-center transition-all border-2 text-white shadow-sm",
                          STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG]?.color || 'bg-slate-400',
                          "border-transparent hover:scale-110 active:scale-95"
                        )}
                      >
                        {(() => {
                          const Icon = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG]?.icon || Circle
                          return <Icon className="h-4 w-4" />
                        })()}
                      </button>
                    }
                  />
                  <DropdownMenuContent className="rounded-2xl border-none glass-premium shadow-2xl p-2 w-44">
                    {Object.entries(STATUS_CONFIG).map(([key, config]: [string, any]) => (
                      <DropdownMenuItem 
                        key={key} 
                        onClick={() => updateTaskStatus(task.id, key)}
                        className="rounded-xl px-4 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary font-bold text-[10px] uppercase tracking-widest gap-2"
                      >
                        <div className={cn("h-2 w-2 rounded-full", config.color)} />
                        {config.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2 overflow-hidden">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] xl:tracking-widest truncate">
                    {task.projects?.name || "Dự án"}
                    <span className="opacity-40 mx-1">/</span>
                    <span className="text-slate-500">{task.project_categories?.name || task.task_groups?.name || "Chi tiết"}</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {task.task_time != null && (
                      <div className="flex items-center gap-1 text-[10px] font-black text-primary bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100/50">
                        <Clock className="h-3 w-3" />
                        {formatTaskTime(task.task_time)}
                      </div>
                    )}
                    {task.deadline && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500/80 bg-rose-50 px-2.5 py-0.5 rounded-full">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.deadline), 'dd/MM')}
                      </div>
                    )}
                  </div>
                </div>
                
                <h4 className={cn("text-sm font-bold leading-tight transition-all", 
                  task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800 group-hover:text-primary'
                )}>
                  {task.name}
                </h4>

                <div className="flex items-center flex-wrap gap-3">
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                    getPriorityInfo(task.priority).bgLight,
                    getPriorityInfo(task.priority).text
                  )}>
                    {(() => {
                      const pInfo = getPriorityInfo(task.priority)
                      const Icon = pInfo.icon
                      return <Icon className="h-3.5 w-3.5 fill-current" />
                    })()}
                    {task.priority}
                  </div>
                  
                  {task.assignees && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                      <div className="h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                        <User className="h-3 w-3 text-slate-400" />
                      </div>
                      <span className="truncate max-w-[100px]">{task.assignees.name || task.assignees.full_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-white/50 rounded-[2.5rem] border border-white/80 flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Sparkles className="h-8 w-8 text-primary/40" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-800 font-bold text-base">Mọi thứ đã gọn gàng</p>
              <p className="text-slate-400 text-xs font-medium italic">
                {filter === 'today' ? "Không có công việc cần xử lý trong hôm nay." : "Hiện chưa có kế hoạch cho những ngày sắp tới."}
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onTaskUpdated={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}
