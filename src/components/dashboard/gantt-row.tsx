'use client'

import { cn } from '@/lib/utils'
import { ChevronRight, ChevronDown, Circle, FolderKanban, ListTodo, CheckCircle2 } from 'lucide-react'
import { GanttBar } from '../gantt/gantt-bar'
import { getStatusInfo } from '@/lib/status-utils'

interface GanttRowProps {
  id: string
  name: string
  type: 'project' | 'group' | 'task'
  level: number
  status: string
  start: Date | null
  end: Date | null
  expanded?: boolean
  hasChildren?: boolean
  onToggle?: () => void
  timelineLeft: number
  timelineWidth: number
  className?: string
}

export function GanttRow({
  name,
  type,
  level,
  status,
  expanded,
  hasChildren,
  onToggle,
  timelineLeft,
  timelineWidth,
  className
}: GanttRowProps) {
  const Icon = type === 'project' ? FolderKanban : type === 'group' ? ListTodo : Circle
  
  return (
    <div className={cn(
      "group flex items-center border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors h-12 min-w-fit",
      className
    )}>
      {/* Left side: Tree Label */}
      <div 
        className="sticky left-0 z-10 w-64 md:w-80 shrink-0 flex items-center bg-white/80 backdrop-blur-sm border-r border-slate-100 pr-4"
        style={{ paddingLeft: `${level * 1.5 + 1}rem` }}
      >
        <div className="flex items-center gap-2 min-w-0 w-full">
          {hasChildren ? (
            <button 
              onClick={onToggle}
              className="h-5 w-5 rounded hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <div className="w-5" />
          )}
          
          <Icon className={cn(
            "h-4 w-4 shrink-0",
            type === 'project' ? "text-primary" : type === 'group' ? "text-amber-500" : "text-slate-400"
          )} />
          
          <span className={cn(
            "text-xs truncate transition-all duration-300",
            type === 'project' ? "font-black text-slate-800 uppercase tracking-tight" : 
            type === 'group' ? "font-bold text-slate-600" : 
            "text-slate-500 font-medium",
            status === 'done' && type === 'task' && "line-through opacity-50"
          )}>
            {name}
          </span>
          
          {type === 'task' && status === 'done' && (
            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 ml-1" />
          )}
        </div>
      </div>

      {/* Right side: Timeline Bar */}
      <div className="flex-1 px-8 relative h-full flex items-center min-w-[800px]">
        {timelineWidth > 0 && (
          <GanttBar 
            left={timelineLeft}
            width={timelineWidth}
            status={status}
            name={name}
            className={cn(
              "h-2.5",
              type === 'project' ? "h-3" : type === 'group' ? "h-2.5" : "h-1.5"
            )}
          />
        )}
      </div>
    </div>
  )
}
