'use client'

import { Project } from '@/hooks/use-projects'
import { Task } from '@/hooks/use-tasks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { MoreHorizontal, Pencil, Copy, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'

interface ProjectCardProps {
  project: Project
  tasks: Task[]
  onEdit?: (project: Project) => void
  onDelete?: (projectId: string) => void
  onDuplicate?: (project: Project) => void
}

export function ProjectCard({ project, tasks, onEdit, onDelete, onDuplicate }: ProjectCardProps) {
  const upcomingTasks = tasks
    .filter(t => t.project_id === project.id && t.status !== 'done')
    .slice(0, 3)
  const remainingCount = tasks.filter(t => t.project_id === project.id && t.status !== 'done').length - upcomingTasks.length

  const statusDotColor = project.color || 'bg-slate-400'

  return (
    <div className="group relative">
      <Link href={`/projects/${project.id}`} className="block">
        <Card className="glass-premium rounded-3xl overflow-hidden border-none transition-all duration-500 group-hover:scale-[1.02] group-hover:soft-glow">
          <CardHeader className="pb-3 border-b border-white/20">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className={cn("h-2.5 w-2.5 rounded-full pulse", statusDotColor)} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{project.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/90 text-[10px] text-muted-foreground font-medium">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(project.created_at), 'dd MMM', { locale: vi })}
                </div>
              </div>
            </div>
            <CardTitle className="text-xl font-bold text-slate-800 leading-tight group-hover:text-primary transition-colors">
              {project.name}
            </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <User className="h-3.5 w-3.5 text-primary/60" />
            <span className="font-medium">{project.suppliers?.name || 'Chưa định danh'}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Công việc sắp tới</span>
               <Badge variant="ghost" className="h-5 px-2 text-[10px] bg-white/90 rounded-lg">{upcomingTasks.length}</Badge>
            </div>
            {upcomingTasks.length > 0 ? (
              <div className="space-y-2">
                {upcomingTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between bg-white/90 backdrop-blur-sm p-2.5 rounded-2xl border border-white/50">
                    <div className="flex items-center gap-2.5 truncate max-w-[60%]">
                      <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", 
                        task.priority === 'critical' ? 'bg-rose-500 animate-pulse' : 
                        task.priority === 'high' ? 'bg-amber-500' : 
                        task.priority === 'medium' ? 'bg-indigo-400' : 'bg-slate-300'
                      )} />
                      <span className="text-sm font-medium text-slate-700 truncate">{task.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                        task.status === 'todo' ? 'bg-slate-100 text-slate-500' :
                        task.status === 'inprogress' ? 'bg-sky-100 text-sky-600' :
                        task.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'
                      )}>
                        {task.status === 'todo' ? 'To Do' : task.status === 'inprogress' ? 'Doing' : task.status === 'pending' ? 'Pending' : ''}
                      </span>
                      <div className="text-[10px] text-muted-foreground font-bold bg-white/90 px-2 py-0.5 rounded-full">
                        {format(new Date(task.deadline), 'dd/MM')}
                      </div>
                    </div>
                  </div>
                ))}
                {remainingCount > 0 && (
                  <div className="flex items-center justify-center py-1 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400">+ {remainingCount} công việc khác</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-slate-300 italic">Mọi thứ đã hoàn tất ✨</p>
              </div>
            )}
          </div>
        </CardContent>
        </Card>
      </Link>
      
      {/* Absolute positioned actions menu to stay on top of the Link */}
      <div className="absolute top-4 right-4 z-20">
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
