'use client'

import { useState, useMemo } from 'react'
import { Task } from '@/hooks/use-tasks'
import { 
  format, 
  addDays, 
  startOfDay, 
  endOfDay, 
  eachDayOfInterval, 
  isSameDay, 
  differenceInDays,
  startOfWeek
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { GanttRow } from './gantt-row'
import { calculateGanttPercentages, calculateDateRange } from '@/lib/gantt-utils'
import { cn } from '@/lib/utils'
import { Calendar, ChevronLeft, ChevronRight, FilterX } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardGanttProps {
  tasks: Task[]
  onRefreshTasks: () => void
}

export function DashboardGantt({ tasks }: DashboardGanttProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [timelineStart, setTimelineStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const daysToShow = 21 // 3 weeks view

  const timelineEnd = useMemo(() => addDays(timelineStart, daysToShow - 1), [timelineStart, daysToShow])
  
  const days = useMemo(() => eachDayOfInterval({
    start: timelineStart,
    end: timelineEnd
  }), [timelineStart, timelineEnd])

  const toggleNode = (id: string) => {
    const next = new Set(expandedNodes)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedNodes(next)
  }

  const hierarchy = useMemo(() => {
    // 1. Group by Project
    const projectsMap = new Map<string, { id: string, name: string, status: string, tasks: Task[] }>()
    
    tasks.forEach(task => {
      const pId = task.project_id
      if (!projectsMap.has(pId)) {
        projectsMap.set(pId, { 
          id: pId, 
          name: task.projects?.name || 'Unknown Project', 
          status: task.projects?.status || 'Active',
          tasks: [] 
        })
      }
      projectsMap.get(pId)!.tasks.push(task)
    })

    // 2. Build Hierarchy: Project -> Group -> Task
    return Array.from(projectsMap.values()).map(project => {
      const groupsMap = new Map<string, { id: string, name: string, tasks: Task[] }>()
      const ungroupedTasks: Task[] = []

      project.tasks.forEach(task => {
        if (task.task_group_id && task.task_groups) {
          if (!groupsMap.has(task.task_group_id)) {
            groupsMap.set(task.task_group_id, { 
              id: task.task_group_id, 
              name: task.task_groups.name, 
              tasks: [] 
            })
          }
          groupsMap.get(task.task_group_id)!.tasks.push(task)
        } else {
          ungroupedTasks.push(task)
        }
      })

      const groups = Array.from(groupsMap.values()).map(group => {
        const { start, end } = calculateDateRange(group.tasks)
        return {
          id: group.id,
          name: group.name,
          type: 'group' as const,
          status: group.tasks.every(t => t.status === 'done') ? 'done' : 'inprogress',
          start,
          end,
          children: group.tasks.map(t => ({
            id: t.id,
            name: t.name,
            type: 'task' as const,
            status: t.status,
            start: t.start_date ? new Date(t.start_date) : (t.deadline ? new Date(t.deadline) : null),
            end: t.deadline ? new Date(t.deadline) : null,
          }))
        }
      })

      // Add "Ungrouped" if there are any
      if (ungroupedTasks.length > 0) {
        const { start, end } = calculateDateRange(ungroupedTasks)
        groups.push({
          id: `${project.id}-ungrouped`,
          name: 'Chưa phân nhóm',
          type: 'group' as const,
          status: ungroupedTasks.every(t => t.status === 'done') ? 'done' : 'inprogress',
          start,
          end,
          children: ungroupedTasks.map(t => ({
            id: t.id,
            name: t.name,
            type: 'task' as const,
            status: t.status,
            start: t.start_date ? new Date(t.start_date) : (t.deadline ? new Date(t.deadline) : null),
            end: t.deadline ? new Date(t.deadline) : null,
          }))
        })
      }

      const { start, end } = calculateDateRange(project.tasks)
      return {
        id: project.id,
        name: project.name,
        type: 'project' as const,
        status: project.status,
        start,
        end,
        children: groups
      }
    })
  }, [tasks])

  const renderHierarchy = (items: any[], level = 0) => {
    return items.map(item => {
      const isExpanded = expandedNodes.has(item.id)
      const hasChildren = item.children && item.children.length > 0
      
      const { left, width } = calculateGanttPercentages(
        item.start,
        item.end,
        timelineStart,
        daysToShow
      )

      return (
        <div key={item.id} className="flex flex-col">
          <GanttRow 
            id={item.id}
            name={item.name}
            type={item.type}
            level={level}
            status={item.status}
            start={item.start}
            end={item.end}
            expanded={isExpanded}
            hasChildren={hasChildren}
            onToggle={() => toggleNode(item.id)}
            timelineLeft={left}
            timelineWidth={width}
          />
          {isExpanded && hasChildren && (
            <div className="flex flex-col">
              {renderHierarchy(item.children, level + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  const shiftTimeline = (days: number) => {
    setTimelineStart(prev => addDays(prev, days))
  }

  return (
    <div className="flex flex-col h-full bg-white/50 glass-premium rounded-3xl border border-white/20 overflow-hidden shadow-sm">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white/40 sticky top-0 z-30">
        <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">Timeline Dự án</h4>
              <p className="text-[10px] font-bold text-slate-400">
                {format(timelineStart, 'dd/MM/yyyy')} - {format(timelineEnd, 'dd/MM/yyyy')}
              </p>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setTimelineStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white border-slate-200"
          >
            Hôm nay
          </Button>
          <div className="flex items-center bg-white/80 p-1 rounded-lg border border-slate-100 shadow-sm">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => shiftTimeline(-7)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="w-px h-3 bg-slate-100 mx-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => shiftTimeline(7)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 w-full">
        <div className="min-w-fit">
          {/* Header Dates */}
          <div className="flex border-b border-slate-100 bg-slate-50/30 sticky top-0 z-20">
            <div className="sticky left-0 z-10 w-64 md:w-80 shrink-0 bg-slate-50 border-r border-slate-100" />
            <div className="flex px-8 min-w-[800px] w-full">
              {days.map((day, i) => (
                <div 
                  key={day.toISOString()} 
                  className={cn(
                    "flex flex-col items-center justify-center h-12 border-r border-slate-100/50 last:border-r-0",
                    isSameDay(day, new Date()) ? "bg-primary/5" : ""
                  )}
                  style={{ width: `${100 / daysToShow}%` }}
                >
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-tighter",
                    isSameDay(day, new Date()) ? "text-primary" : "text-slate-400"
                  )}>
                    {format(day, 'EEE', { locale: vi })}
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold",
                    isSameDay(day, new Date()) ? "text-primary" : "text-slate-600"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Hierarchy Rows */}
          <div className="flex flex-col pb-10">
            {hierarchy.length > 0 ? renderHierarchy(hierarchy) : (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center space-y-4">
                 <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                    <FilterX className="h-8 w-8 text-slate-300" />
                 </div>
                 <div className="space-y-1">
                    <p className="text-slate-800 font-black tracking-tight uppercase text-sm">Không có dữ liệu</p>
                    <p className="text-slate-400 text-[10px] font-bold">Hãy thử thay đổi bộ lọc hoặc thêm task mới.</p>
                 </div>
              </div>
            )}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
