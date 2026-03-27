'use client'

import { useState } from 'react'
import { Project } from '@/hooks/use-projects'
import { Task } from '@/hooks/use-tasks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, Flag } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn, getCategoryColorStyles } from '@/lib/utils'
import Link from 'next/link'
import { MoreHorizontal, Pencil, Copy, Trash2, FileJson } from 'lucide-react'
import { getPriorityInfo } from '@/lib/priority-utils'
import { exportProjectsToJSON } from '@/lib/export-utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { EditTaskDialog } from '@/components/tasks/edit-task-dialog'
import { TaskStatusHeatmap } from '@/components/dashboard/task-status-heatmap'

interface ProjectCardProps {
  project: Project
  tasks: Task[]
  categories?: { id: string, name: string }[]
  onEdit?: (project: Project) => void
  onDelete?: (projectId: string) => void
  onDuplicate?: (project: Project) => void
  onTaskUpdate?: () => void
}

export function ProjectCard({ 
  project, 
  tasks, 
  categories = [], 
  onEdit, 
  onDelete, 
  onDuplicate,
  onTaskUpdate 
}: ProjectCardProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const currentCategory = categories.find(c => c.name.toLowerCase() === project.status.toLowerCase())
  const isFirstCategory = categories.length > 0 && currentCategory?.id === categories[0]?.id
  
  const upcomingTasks = tasks
    .filter(t => 
      t.project_id === project.id && 
      t.status !== 'done' && 
      (
        !currentCategory || 
        t.category_id === currentCategory.id || 
        (!t.category_id && isFirstCategory)
      )
    )
    .slice(0, 3)
    
  const remainingCount = tasks.filter(t => 
    t.project_id === project.id && 
    t.status !== 'done' && 
    (
      !currentCategory || 
      t.category_id === currentCategory.id || 
      (!t.category_id && isFirstCategory)
    )
  ).length - upcomingTasks.length

  const projectTasks = tasks.filter(t => t.project_id === project.id)
  const completedTasksCount = projectTasks.filter(t => t.status === 'done').length
  const progress = projectTasks.length > 0 ? Math.round((completedTasksCount / projectTasks.length) * 100) : 0

  const colorStyles = getCategoryColorStyles(project.color)

  return (
    <div className="group relative">
      <Card className="glass-premium rounded-3xl overflow-hidden border-none transition-all duration-500 group-hover:scale-[1.01] group-hover:soft-glow gap-0 py-0 relative">
        <Link href={`/projects/${project.id}`} className="block">
          <CardHeader className="p-6 pb-4 border-b border-white/20 bg-white/40 hover:bg-white/60 transition-colors">
            <div className="flex justify-between items-center mb-1 overflow-visible">
              <div className="flex items-center gap-2">
                <div 
                  className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white shadow-sm", colorStyles.className || 'bg-slate-400')}
                  style={colorStyles.style}
                >
                  {project.status}
                </div>
              </div>
            </div>
            
            <CardTitle className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-primary transition-colors mb-2">
              {project.name}
            </CardTitle>

            <div className="flex items-center gap-4 text-[11px] font-medium text-slate-400/80 uppercase tracking-widest mt-0.5">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary/40" />
                <span>{format(new Date(project.created_at), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                <User className="h-3.5 w-3.5 text-primary/40" />
                <span>{project.suppliers?.name || 'Chưa định danh'}</span>
              </div>
            </div>

          </CardHeader>
        </Link>
        <CardContent className="p-6 pt-5 bg-white/20">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Việc sắp tới</span>
                 <Badge variant="ghost" className="h-5 px-2 text-[10px] font-medium bg-white/80 rounded-lg text-primary">{upcomingTasks.length}</Badge>
              </div>
              
              {upcomingTasks.length > 0 ? (
                <div className="divide-y divide-slate-100/60">
                  {upcomingTasks.map((task, index) => (
                    <div 
                      key={task.id} 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setSelectedTask(task)
                      }}
                      className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 transition-all hover:bg-white/40 cursor-pointer rounded-xl px-2 -mx-2"
                    >
                      <div className="flex items-center gap-3 truncate max-w-[65%]">
                        <div className={cn("shrink-0", 
                          getPriorityInfo(task.priority).text,
                          getPriorityInfo(task.priority).animate
                        )}>
                          {(() => {
                            const info = getPriorityInfo(task.priority)
                            const Icon = info.icon
                            return <Icon className="h-3.5 w-3.5 fill-current" strokeWidth={2.5} />
                          })()}
                        </div>
                        <span className="text-sm font-normal text-slate-700 truncate tracking-tight">{task.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-md",
                          task.status === 'todo' ? 'bg-slate-100 text-slate-400' :
                          task.status === 'inprogress' ? 'bg-sky-50 text-sky-600' :
                          task.status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'
                        )}>
                          {task.status === 'todo' ? 'To Do' : task.status === 'inprogress' ? 'Doing' : task.status === 'pending' ? 'Pending' : ''}
                        </span>
                        <div className="text-[10px] text-slate-400 font-medium bg-white/60 px-2 py-0.5 rounded-full border border-slate-50">
                          {format(new Date(task.deadline), 'dd/MM')}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {remainingCount > 0 && (
                    <div className="flex items-center justify-center pt-3 mt-1">
                      <span className="text-[10px] font-medium text-slate-300 uppercase tracking-widest">+ {remainingCount} công việc khác</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center bg-white/30 rounded-2xl border border-dashed border-white/60">
                  <p className="text-[11px] font-medium text-slate-400 italic">Mọi thứ đã hoàn tất ✨</p>
                </div>
              )}
            </div>

            {/* ✅ NEW: Task Status Heatmap */}
            <TaskStatusHeatmap tasks={projectTasks} />
          </CardContent>
        </Card>

        {selectedTask && (
          <EditTaskDialog
            task={selectedTask}
            open={!!selectedTask}
            onOpenChange={(v) => !v && setSelectedTask(null)}
            onTaskUpdated={() => {
              setSelectedTask(null)
              onTaskUpdate?.()
            }}
          />
        )}
      
      {/* Absolute positioned actions menu to stay on top of the Link */}
      <div className="absolute top-3 right-3 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white/50 backdrop-blur-sm hover:bg-white text-slate-400 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          } />
          <DropdownMenuContent align="end" className="rounded-2xl border-none glass-premium shadow-2xl p-2 w-48">
            <DropdownMenuItem 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit?.(project); }}
              className="rounded-xl px-4 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary font-bold text-xs gap-3"
            >
              <Pencil className="h-3.5 w-3.5" /> Sửa Project
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); exportProjectsToJSON([project.id]); }}
              className="rounded-xl px-4 py-2 cursor-pointer focus:bg-emerald-50 focus:text-emerald-500 font-bold text-xs gap-3"
            >
              <FileJson className="h-3.5 w-3.5" /> Xuất JSON cho AI
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDuplicate?.(project); }}
              className="rounded-xl px-4 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary font-bold text-xs gap-3"
            >
              <Copy className="h-3.5 w-3.5" /> Nhân bản Project
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(project.id); }}
              className="rounded-xl px-4 py-2 cursor-pointer focus:bg-red-50 focus:text-red-500 font-bold text-xs gap-3 text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" /> Xoá Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
