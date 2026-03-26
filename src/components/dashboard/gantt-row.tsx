import { cn, getCategoryColorStyles } from '@/lib/utils'
import { ChevronRight, ChevronDown, CheckCircle2, MoreHorizontal, Circle, CircleDot } from 'lucide-react'
import { GanttBar } from '../gantt/gantt-bar'
import { GanttPriorityDropdown } from './gantt-priority-dropdown'
import { getStatusInfo, STATUS_OPTIONS } from '@/lib/status-utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from 'date-fns'

interface GanttRowProps {
  id: string
  name: string
  type: 'project' | 'group' | 'task'
  level: number
  status: string
  priority?: string
  start: Date | null
  end: Date | null
  expanded?: boolean
  hasChildren?: boolean
  onToggle?: () => void
  onNameClick?: () => void
  onPriorityChange?: (priority: string) => void
  onStatusChange?: (status: string) => void
  onDragStart?: (e: React.PointerEvent, type: 'move' | 'left' | 'right') => void
  onFocusClick?: () => void
  onProjectFilter?: () => void
  isProjectActive?: boolean
  onDoubleClick?: () => void
  timelineLeft: number
  timelineWidth: number
  barColor?: string // For project stage color
  segments?: { status: string, width: number }[] // For group segmented bar
  projectStats?: {
    total: number
    completed: number
    inprogress: number
    todo: number
    pending: number
  }
  className?: string
  projectInfo?: string // For tooltip: "Project > Group"
  barRef?: React.Ref<HTMLDivElement>
}

export function GanttRow({
  id,
  name,
  type,
  level,
  status,
  priority,
  start,
  end,
  expanded,
  hasChildren,
  onToggle,
  onNameClick,
  onPriorityChange,
  onStatusChange,
  onDragStart,
  onFocusClick,
  onDoubleClick,
  onProjectFilter,
  isProjectActive,
  timelineLeft,
  timelineWidth,
  barColor,
  segments,
  className,
  projectInfo,
  projectStats,
  barRef
}: GanttRowProps) {
  
  const statusInfo = getStatusInfo(status);

  return (
    <div className={cn("flex border-b border-slate-50 relative group/row transition-colors hover:bg-slate-50/30 h-12 items-stretch", className)}>
      {/* Left side: Task Info */}
      <div className="w-64 flex-none sticky left-0 z-20 bg-white/80 backdrop-blur-md border-r border-slate-100 flex items-center px-4 shadow-[4px_0_15px_-5px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-3 min-w-0 flex-1 relative">
          {/* Focus Button at far left for tasks */}
          {type === 'task' && onFocusClick && start && (
            <button
              onClick={(e) => { e.stopPropagation(); onFocusClick(); }}
              className="h-5 w-5 rounded flex items-center justify-center hover:bg-primary/10 text-slate-300 hover:text-primary transition-all group/focus shrink-0 ml-[-4px]"
              title="Đi đến ngày thực hiện"
            >
              <MoreHorizontal className="h-3.5 w-3.5 hidden group-hover/focus:block" />
              <div className="h-1 w-1 rounded-full bg-slate-300 group-hover/focus:hidden" />
            </button>
          )}

          <div style={{ marginLeft: `${level * 16}px` }} className="flex items-center gap-2 shrink-0">
            {hasChildren && (
              <button
                onClick={onToggle}
                className="h-5 w-5 rounded-md hover:bg-slate-100 flex items-center justify-center transition-transform duration-300"
                style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
              >
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}
            {!hasChildren && <div className="w-5" />}
            
            {type === 'task' && onPriorityChange && (
              <GanttPriorityDropdown 
                priority={priority || 'medium'} 
                onPriorityChange={onPriorityChange} 
              />
            )}
            

            {type === 'task' && onStatusChange && (
              <DropdownMenu>
                <DropdownMenuTrigger 
                  render={
                    <button className="h-5 w-5 rounded flex items-center justify-center hover:bg-slate-100 transition-colors outline-none focus:ring-0">
                      <statusInfo.icon className={cn("h-3.5 w-3.5", statusInfo.textColor)} />
                    </button>
                  }
                />
                <DropdownMenuContent align="start" className="rounded-xl border-none glass-premium shadow-2xl p-2 min-w-[150px] z-[100]">
                  {STATUS_OPTIONS.map(s => (
                    <DropdownMenuItem 
                      key={s.value} 
                      onClick={() => onStatusChange(s.value)}
                      className="rounded-lg px-3 py-1.5 cursor-pointer focus:bg-primary/10 flex items-center gap-2"
                    >
                      <s.icon className={cn("h-3.5 w-3.5", s.textColor)} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {type === 'project' && onProjectFilter && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onProjectFilter();
              }}
              className="h-5 w-5 rounded-md hover:bg-slate-200 flex items-center justify-center transition-colors group/filter"
              title={isProjectActive ? "Remove from filter" : "Add to filter"}
            >
              {isProjectActive ? (
                <CircleDot className="h-3 w-3 text-primary animate-in zoom-in-50 duration-300" />
              ) : (
                <Circle className="h-3 w-3 text-slate-400 group-hover/filter:text-primary" />
              )}
            </button>
          )}

          <span 
            onClick={onNameClick}
            className={cn(
              "text-[11px] truncate transition-all duration-300 flex-1 min-w-0",
              onNameClick && "cursor-pointer hover:text-primary hover:underline",
              type === 'project' ? "font-black text-slate-800 uppercase tracking-tight" : 
              type === 'group' ? "font-bold text-slate-600" : 
              "text-slate-500 font-medium",
              status === 'done' && type === 'task' && "line-through opacity-50"
            )}>
            {name}
          </span>
        </div>
      </div>

      {/* Right side: Timeline Bar */}
      <div className="flex-1 px-8 relative h-full flex items-center min-w-[800px] overflow-visible">
        {timelineWidth > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger 
                render={
                  <div 
                    className={cn(
                      "relative w-full bg-slate-100/30 rounded-full",
                      type === 'project' ? "h-6" : type === 'group' ? "h-5" : "h-4"
                    )}
                    onDoubleClick={onDoubleClick}
                  >
                    {type === 'group' && segments && segments.length > 0 ? (
                      <div 
                        ref={barRef}
                        className="absolute top-0 h-full flex rounded-full overflow-hidden transition-all duration-700 ease-out"
                        style={{ left: `${timelineLeft}%`, width: `${timelineWidth}%` }}
                      >
                        {segments.map((segment, i) => (
                          <div 
                            key={i}
                            className={cn("h-full", getStatusInfo(segment.status).color)}
                            style={{ width: `${segment.width}%` }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div 
                        ref={barRef}
                        className={cn(
                          "absolute top-0 h-full rounded-full flex items-center justify-between shadow-[0_2px_4px_rgba(0,0,0,0.1)] group/bar transition-all duration-300 ease-out",
                          type === 'project' ? (getCategoryColorStyles(barColor).className || 'bg-emerald-500') : statusInfo.color,
                          type === 'task' && "cursor-move"
                        )}
                        style={{ 
                          left: `${timelineLeft}%`, 
                          width: `${timelineWidth}%`,
                          ...(type === 'project' ? getCategoryColorStyles(barColor).style : {}) 
                        }}
                        onPointerDown={type === 'task' && onDragStart ? (e) => onDragStart(e, 'move') : undefined}
                      >
                        {/* Resize Handles */}
                        {type === 'task' && onDragStart && (
                          <>
                            <div 
                              className="absolute left-0 top-0 w-2 h-full cursor-ew-resize opacity-0 group-hover/bar:opacity-100 transition-opacity bg-black/10 rounded-l-full"
                              onPointerDown={(e) => { e.stopPropagation(); onDragStart(e, 'left'); }}
                            />
                            <div 
                              className="absolute right-0 top-0 w-2 h-full cursor-ew-resize opacity-0 group-hover/bar:opacity-100 transition-opacity bg-black/10 rounded-r-full"
                              onPointerDown={(e) => { e.stopPropagation(); onDragStart(e, 'right'); }}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                }
              />
              <TooltipContent className="glass-premium border-none p-3 shadow-2xl rounded-2xl flex flex-col gap-1 min-w-[220px] z-[160]">
                {projectInfo && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {projectInfo}
                  </span>
                )}
                <span className="text-sm font-black text-slate-800 tracking-tight">
                  {name}
                </span>
                
                {(type === 'project' || type === 'group') && projectStats && (
                  <div className="mt-3 pt-3 border-t border-slate-100/50 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                      <span className="text-slate-400">{type === 'project' ? 'Tiến độ dự án' : 'Tiến độ nhóm'}</span>
                      <span className="text-emerald-500">{Math.round((projectStats.completed / projectStats.total) * 100) || 0}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" style={{ width: `${(projectStats.completed / projectStats.total) * 100}%` }} />
                      <div className="h-full bg-sky-400 transition-all duration-500" style={{ width: `${(projectStats.inprogress / projectStats.total) * 100}%` }} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Xong: {projectStats.completed}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Làm: {projectStats.inprogress}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Chờ: {projectStats.todo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                        <span className="text-[9px] font-bold text-slate-300 uppercase">Tổng: {projectStats.total}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                  <div className={cn("h-2 w-2 rounded-full", statusInfo.color)} />
                  <span className="text-[10px] font-bold text-slate-500">
                    {start && end ? `${format(start, 'dd/MM')} - ${format(end, 'dd/MM')}` : 'Chưa set ngày'}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}
