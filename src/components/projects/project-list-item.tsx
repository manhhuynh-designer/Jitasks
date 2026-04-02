'use client'

import { Project } from '@/hooks/use-projects'
import { Task } from '@/hooks/use-tasks'
import { Calendar, User, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn, getCategoryColorStyles } from '@/lib/utils'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { TaskStatusHeatmap } from '@/components/dashboard/task-status-heatmap'

interface ProjectListItemProps {
  project: Project
  tasks?: Task[]
  onEdit?: (project: Project) => void
  onDelete?: (projectId: string) => void
}

export function ProjectListItem({ 
  project, 
  tasks = [], 
  onEdit, 
  onDelete 
}: ProjectListItemProps) {
  const projectTasks = tasks.filter(t => t.project_id === project.id)
  const colorStyles = getCategoryColorStyles(project.color)

  return (
    <div className="group relative flex items-center gap-3 px-3 py-2.5 hover:bg-white/50 transition-colors duration-200 border-b border-slate-100 last:border-b-0">
      {/* Status Color Dot */}
      <div 
        className={cn("w-1.5 h-6 rounded-full shrink-0", colorStyles.className || 'bg-slate-400')}
        style={colorStyles.style}
      />
      
      {/* Name + Meta — clickable */}
      <Link href={`/projects/${project.id}`} className="flex-1 min-w-0 flex items-center gap-3">
        <h4 className="text-sm font-semibold text-slate-700 truncate group-hover:text-primary transition-colors min-w-[120px] max-w-[280px]">
          {project.name}
        </h4>
        
        <span className={cn(
          "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
          project.status === 'Active' ? "text-emerald-600 bg-emerald-50" :
          project.status === 'Sourcing' ? "text-blue-600 bg-blue-50" :
          project.status === 'On Hold' ? "text-amber-600 bg-amber-50" :
          project.status === 'Archive' ? "text-slate-500 bg-slate-100" :
          "text-slate-500 bg-slate-100"
        )}>
          {project.status}
        </span>

        <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 shrink-0">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(project.created_at), 'dd/MM/yy')}</span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-slate-400 truncate shrink-0">
          <User className="h-3 w-3" />
          <span className="truncate max-w-[100px]">{project.suppliers?.name || '—'}</span>
        </div>
      </Link>

      {/* Heatmap — compact */}
      <div className="hidden md:block shrink-0">
        <TaskStatusHeatmap tasks={projectTasks} maxCells={14} />
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-white/60 opacity-0 group-hover:opacity-100 transition-all shrink-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        } />
        <DropdownMenuContent align="end" className="rounded-2xl border-none glass-premium shadow-2xl p-2 w-44">
          <DropdownMenuItem 
            onClick={() => onEdit?.(project)}
            className="rounded-xl px-3 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary font-bold text-xs gap-2"
          >
            <Pencil className="h-3 w-3" /> Sửa
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onDelete?.(project.id)}
            className="rounded-xl px-3 py-2 cursor-pointer focus:bg-red-50 focus:text-red-500 font-bold text-xs gap-2 text-red-500"
          >
            <Trash2 className="h-3 w-3" /> Xoá
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
