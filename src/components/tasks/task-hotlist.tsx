'use client'

import { useState } from 'react'
import { Check, CheckCircle2, Clock, Calendar, AlertTriangle, MoreHorizontal, User, Sparkles, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditTaskDialog } from '@/components/tasks/edit-task-dialog'

export function TaskHotlist({ tasks, title }: { tasks: any[], title?: string }) {
  const [selectedTask, setSelectedTask] = useState<any>(null)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-slate-800 tracking-tight">{title || "Tasks to Process"}</h3>
        <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-xs font-black uppercase tracking-widest">
          {tasks.filter(t => t.status !== 'done').length} Urgent
        </span>
      </div>

      <div className="space-y-4">
        {tasks.length > 0 ? (
          tasks.map(task => (
            <div 
              key={task.id} 
              onClick={() => setSelectedTask(task)}
              className="group flex items-start gap-4 p-4 rounded-2xl bg-white/90 border border-white/80 hover:border-primary/20 hover:bg-white/100 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
            >
              <div className="mt-0.5">
                {task.status === 'done' ? (
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                ) : (
                  <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors", 
                    task.priority === 'critical' ? 'border-rose-400 bg-rose-50' : 'border-slate-200 group-hover:border-primary/30'
                  )}>
                    {task.priority === 'critical' && <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className={cn("text-sm font-bold transition-all", 
                    task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800 group-hover:text-primary'
                  )}>
                    {task.name}
                  </h4>
                  <button className="text-slate-300 hover:text-slate-500 transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-slate-400 mt-2">
                  {task.projects && (
                    <div className="flex items-center gap-1.5 text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-lg border border-slate-200/60 max-w-[120px]">
                      <Briefcase className="h-3 w-3 shrink-0" />
                      <span className="truncate">{task.projects.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(task.deadline).toLocaleDateString('vi-VN')}</span>
                  </div>
                  {task.priority === 'critical' && (
                    <div className="flex items-center gap-1.5 text-rose-500 font-black uppercase tracking-tight">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Critical</span>
                    </div>
                  )}
                  {task.assignee_id && task.assignees && (
                    <div className="flex items-center gap-1.5">
                      <div className="h-4 w-4 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                        <User className="h-2.5 w-2.5 text-indigo-500" />
                      </div>
                      <span>{task.assignees.full_name}</span>
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
              <p className="text-slate-400 text-xs font-medium italic">Không có công việc khẩn cấp nào.</p>
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
