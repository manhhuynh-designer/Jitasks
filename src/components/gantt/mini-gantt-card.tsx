'use client'

import { Task } from '@/hooks/use-tasks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GanttChartSquare, Calendar, Flag, Settings, Clock, Zap, CheckCircle2, GripVertical, AlertCircle, Trash2, MoreVertical } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { getDeadlineLevel, DEADLINE_LEVELS } from '@/constants/ui-tokens'
import { useDroppable } from '@dnd-kit/core'
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable 
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DeleteGroupDialog } from './delete-group-dialog'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

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
  onRefresh?: () => void
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

function DraggableTaskItem({ task, onTaskClick }: { task: Task, onTaskClick?: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: task.id,
    data: {
      type: 'Task',
      task
    }
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const taskDeadline = task.deadline ? new Date(task.deadline) : null
  const statusStyle = STATUS_STYLES[task.status] || STATUS_STYLES.todo
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "h-10 px-3 rounded-[1rem] flex items-center justify-between cursor-default transition-all border border-transparent group/task",
        statusStyle.bg,
        !isDragging && statusStyle.hover,
        !isDragging && "hover:border-slate-200 hover:scale-[1.02]",
        isDragging && "opacity-0 pointer-events-none"
      )}
    >
      <div 
        className="flex items-center gap-2 overflow-hidden flex-1" 
        onClick={(e) => {
          e.stopPropagation()
          onTaskClick?.(task.id)
        }}
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-primary transition-colors pr-1">
          <GripVertical className="h-3 w-3" />
        </div>
        <Flag className={cn("h-3 w-3 shrink-0 fill-current", priorityColor)} />
        <span className={cn("text-[11px] font-bold truncate transition-colors", statusStyle.text)}>
          {task.name}
        </span>
      </div>
      {taskDeadline && (
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0 ml-2 opacity-60 group-hover/task:opacity-100">
          {format(taskDeadline, 'dd/MM')}
        </span>
      )}
    </div>
  )
}

export function MiniGanttCard({ group, tasks, onExpand, onCardClick, onTaskClick, onEditGroup, onRefresh }: MiniGanttCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const isUngrouped = group.id === 'ungrouped'
  const { setNodeRef, isOver } = useDroppable({
    id: group.id,
    data: {
      type: 'Group',
      group
    }
  })
  const startDate = group.start_date ? new Date(group.start_date) : null
  const deadline = group.deadline ? new Date(group.deadline) : null
  
  const hasDates = !!(startDate && deadline)

  const health = (() => {
    const active   = tasks.filter(t => t.status !== 'done')
    const overdue  = active.filter(t => t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline))).length
    const critical = active.filter(t => t.priority === 'critical').length
    const dueToday = active.filter(t => t.deadline && isToday(new Date(t.deadline))).length
    const done     = tasks.filter(t => t.status === 'done').length
    const total    = tasks.length
    const pct      = total > 0 ? Math.round((done / total) * 100) : 0
    const nearest  = active
      .filter(t => t.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0]
      ?.deadline ?? null
    const level    = (overdue > 0 || critical > 0) ? 'alert'
      : dueToday > 0 ? 'warning'
      : pct === 100  ? 'done'
      : 'normal'
    return { level, overdue, critical, dueToday, done, total, pct, nearest }
  })()

  return (
    <Card 
      ref={setNodeRef}
      onClick={onCardClick}
      className={cn(
        "rounded-[2.5rem] border-none bg-white shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all group overflow-hidden h-full flex flex-col min-h-[180px]",
        onCardClick && "cursor-pointer active:scale-[0.98]",
        isOver && "ring-2 ring-primary ring-offset-4 ring-offset-slate-50 bg-primary/[0.02]"
      )}
    >
      <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0 relative z-10">
        <div 
          className={cn("space-y-1", onCardClick && "cursor-pointer")}
          onClick={(e) => {
            e.stopPropagation()
            onCardClick?.()
          }}
        >
          <CardTitle className="text-xs font-black text-slate-800 uppercase tracking-widest truncate max-w-[140px] hover:text-primary transition-colors">
            {group.name}
          </CardTitle>
          {health.level === 'alert' && (
            <div className="flex items-center gap-1 mt-1">
              {health.overdue > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-500 border border-rose-100">
                  <Clock className="h-2.5 w-2.5" />{health.overdue} trễ
                </span>
              )}
              {health.critical > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-md bg-red-50 text-red-500 border border-red-100">
                  <Zap className="h-2.5 w-2.5" />{health.critical}
                </span>
              )}
            </div>
          )}
          {health.level === 'warning' && (
            <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-500 border border-violet-100 mt-1">
              <Clock className="h-2.5 w-2.5" />Hôm nay
            </span>
          )}
          {health.level === 'done' && (
            <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 mt-1">
              <CheckCircle2 className="h-2.5 w-2.5" />Hoàn thành
            </span>
          )}
          {hasDates ? (
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              {format(startDate!, 'dd/MM/yyyy')} - {format(deadline!, 'dd/MM/yyyy')}
            </p>
          ) : (
            <p className="text-[9px] font-bold text-rose-400 italic uppercase">Set dates to view</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                }}
                className="h-8 w-8 rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            } />
            <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl glass-premium p-2 min-w-[160px]">
              {!isUngrouped && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditGroup?.(group.id)
                  }}
                  className="rounded-xl flex items-center gap-2 py-3 px-4 focus:bg-primary/5 focus:text-primary cursor-pointer font-bold text-xs uppercase tracking-widest text-slate-600"
                >
                  <Settings className="h-4 w-4" />
                  Sửa thông tin
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  setIsDeleteDialogOpen(true)
                }}
                className="rounded-xl flex items-center gap-2 py-3 px-4 focus:bg-rose-50 focus:text-rose-500 cursor-pointer font-bold text-xs uppercase tracking-widest text-slate-600"
              >
                <Trash2 className="h-4 w-4" />
                {isUngrouped ? 'Xoá tất cả task' : 'Xoá nhóm'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onExpand(group.id)
            }}
            className="h-8 w-8 rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
          >
            <GanttChartSquare className="h-4 w-4" />
          </Button>

          {isDeleteDialogOpen && (
            <div onClick={e => e.stopPropagation()}>
              <DeleteGroupDialog 
                group={group}
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onRefresh={onRefresh || (() => {})}
                isUngrouped={isUngrouped}
                taskIds={isUngrouped ? tasks.map(t => t.id) : undefined}
              />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="px-6 pb-6 pt-2 flex-1 flex flex-col bg-slate-50/10">
        <div className="space-y-2 mt-2 flex-1">
          {tasks.length > 0 ? (
            <SortableContext 
              id={group.id}
              items={tasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {/* Show up to 6 tasks in the mini view */}
              {tasks.slice(0, 6).map(task => (
                <DraggableTaskItem 
                  key={task.id} 
                  task={task} 
                  onTaskClick={onTaskClick} 
                />
              ))}
            </SortableContext>
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

          {tasks.length > 0 && (
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${health.pct}%` }} />
                </div>
                <span className="text-[9px] font-black text-slate-400 tabular-nums">
                  {health.done}/{health.total}
                </span>
              </div>
              {health.nearest ? (() => {
                const { level, label } = getDeadlineLevel(health.nearest)
                const s = DEADLINE_LEVELS[level as keyof typeof DEADLINE_LEVELS]
                return (
                  <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-md border', s.bg, s.text, s.border)}>
                    {label}
                  </span>
                )
              })() : (
                <span className="text-[9px] text-slate-200 italic">no deadline</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
