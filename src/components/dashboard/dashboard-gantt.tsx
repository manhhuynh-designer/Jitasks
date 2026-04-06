'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
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
import { calculateGanttPercentages, calculateDateRange, calculateStatusSegments } from '@/lib/gantt-utils'
import { cn, getCategoryColorStyles } from '@/lib/utils'
import { Calendar, ChevronLeft, ChevronRight, FilterX, ListFilter, Layers, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { GroupTimelineModal } from '../gantt/group-timeline-modal'
import { EditTaskDialog } from '@/components/tasks/edit-task-dialog'
import { supabase } from '@/lib/supabase'
import { TaskDateRangeDialog } from '@/components/tasks/task-date-range-dialog'

interface DashboardGanttProps {
  tasks: Task[]
  onRefreshTasks: () => void
}

export function DashboardGantt({ tasks: initialTasks, onRefreshTasks }: DashboardGanttProps) {
  const router = useRouter()
  const ganttRef = useRef<HTMLDivElement>(null)
  const timelineGridRef = useRef<HTMLDivElement>(null)
  
  const [viewMode, setViewMode] = useState<'hierarchy' | 'flat'>('hierarchy')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedGroup, setSelectedGroup] = useState<{ group: any, tasks: Task[], projectId: string, categoryId: string } | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [editingDateTask, setEditingDateTask] = useState<Task | null>(null)
  
  const [timelineStart, setTimelineStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const daysToShow = 21 // 3 weeks view

  const [localTasks, setLocalTasks] = useState<Task[]>(initialTasks)
  const [resizingTaskId, setResizingTaskId] = useState<string | null>(null)
  const [dragType, setDragType] = useState<'move' | 'left' | 'right' | null>(null)
  
  const activeDragRef = useRef<{ 
    id: string, 
    type: 'move' | 'left' | 'right', 
    startX: number, 
    start: Date, 
    deadline: Date, 
    initialLeft: number,
    initialWidth: number 
  } | null>(null)

  const handlePointerMoveRef = useRef<((e: PointerEvent) => void) | null>(null)
  const handlePointerUpRef = useRef<((e: PointerEvent) => void) | null>(null)

  const barRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (!resizingTaskId) {
      setLocalTasks(initialTasks)
    }
  }, [initialTasks, resizingTaskId])

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

  // --- Pointer Event Handlers ---
  const handleDragStart = (e: React.PointerEvent, task: Task, type: 'move' | 'left' | 'right') => {
    e.stopPropagation()
    e.preventDefault()
    
    setResizingTaskId(task.id)
    setDragType(type)
    
    const sDate = task.start_date ? new Date(task.start_date) : (task.deadline ? new Date(task.deadline) : new Date())
    const dDate = task.deadline ? new Date(task.deadline) : (task.start_date ? new Date(task.start_date) : new Date())
    
    const { left, width } = calculateGanttPercentages(sDate, dDate, timelineStart, daysToShow)
    
    activeDragRef.current = { 
      id: task.id, 
      type, 
      startX: e.clientX, 
      start: sDate, 
      deadline: dDate,
      initialLeft: left,
      initialWidth: width
    }

    const barEl = barRefs.current[task.id]
    if (barEl) {
      barEl.style.transition = 'none'
      barEl.style.zIndex = '15' // ABOVE row lines but BELOW sticky column (z-20)
    }

    handlePointerMoveRef.current = handlePointerMove
    handlePointerUpRef.current = handlePointerUp
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handlePointerMove = (e: PointerEvent) => {
    const dragData = activeDragRef.current
    if (!dragData || !timelineGridRef.current) return

    const deltaX = e.clientX - dragData.startX
    const containerWidth = timelineGridRef.current.offsetWidth
    const contentWidth = containerWidth - 64 // Subtract px-8 from both sides (32px * 2)
    const pixelsPerPercent = contentWidth / 100
    const percentPerDay = 100 / daysToShow
    const pixelsPerDay = pixelsPerPercent * percentPerDay
    
    const dayDelta = Math.round(deltaX / pixelsPerDay)
    
    // Preview Logic
    let previewStart = dragData.start
    let previewEnd = dragData.deadline

    if (dragData.type === 'move') {
      previewStart = addDays(dragData.start, dayDelta)
      previewEnd = addDays(dragData.deadline, dayDelta)
    } else if (dragData.type === 'left') {
      previewStart = addDays(dragData.start, dayDelta)
      if (previewStart > dragData.deadline) previewStart = dragData.deadline
    } else if (dragData.type === 'right') {
      previewEnd = addDays(dragData.deadline, dayDelta)
      if (previewEnd < dragData.start) previewEnd = dragData.start
    }

    const { left, width } = calculateGanttPercentages(previewStart, previewEnd, timelineStart, daysToShow)
    
    // Direct DOM manipulation for performance
    const barEl = barRefs.current[dragData.id]
    if (barEl) {
      barEl.style.width = `${width}%`
    }
  }

  const handlePointerUp = async (e: PointerEvent) => {
    const dragData = activeDragRef.current
    if (!dragData || !timelineGridRef.current) return

    const deltaX = e.clientX - dragData.startX
    const containerWidth = timelineGridRef.current.offsetWidth
    const contentWidth = containerWidth - 64
    const pixelsPerPercent = contentWidth / 100
    const pixelsPerDay = pixelsPerPercent * (100 / daysToShow)
    const dayDelta = Math.round(deltaX / pixelsPerDay)

    let finalStart = dragData.start
    let finalDeadline = dragData.deadline

    if (dragData.type === 'move') {
      finalStart = addDays(dragData.start, dayDelta)
      finalDeadline = addDays(dragData.deadline, dayDelta)
    } else if (dragData.type === 'left') {
      finalStart = addDays(dragData.start, dayDelta)
      if (finalStart > dragData.deadline) finalStart = dragData.deadline
    } else if (dragData.type === 'right') {
      finalDeadline = addDays(dragData.deadline, dayDelta)
      if (finalDeadline < dragData.start) finalDeadline = dragData.start
    }

    const newStartIso = finalStart.toISOString()
    const newDeadlineIso = finalDeadline.toISOString()

    // Optimistic Update
    setLocalTasks(prev => prev.map(t => 
      t.id === dragData.id 
        ? { ...t, start_date: newStartIso, deadline: newDeadlineIso } 
        : t
    ))

    const barEl = barRefs.current[dragData.id]
    if (barEl) {
      // Manual Snap: Force the DOM to the final percentage position immediately
      const { left: finalLeft, width: finalWidth } = calculateGanttPercentages(finalStart, finalDeadline, timelineStart, daysToShow)
      barEl.style.left = `${finalLeft}%`
      barEl.style.width = `${finalWidth}%`
      barEl.style.zIndex = ''
      
      // Delay restoring transition to prevent the "jump back" effect
      setTimeout(() => {
        if (barRefs.current[dragData.id]) {
          barRefs.current[dragData.id]!.style.transition = ''
        }
      }, 100)
    }

    // 2. Clear state
    activeDragRef.current = null
    window.removeEventListener('pointermove', handlePointerMoveRef.current || handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUpRef.current || handlePointerUp)
    handlePointerMoveRef.current = null
    handlePointerUpRef.current = null

    // Sync to DB
    const { error } = await supabase
      .from('tasks')
      .update({ 
        start_date: newStartIso,
        deadline: newDeadlineIso 
      })
      .eq('id', dragData.id)
    
    if (error) {
      console.error("Error updating task timeline:", error)
      setLocalTasks(initialTasks)
    } else {
      // Sync local state
      setLocalTasks(prev => prev.map(t => 
        t.id === dragData.id 
          ? { ...t, start_date: newStartIso, deadline: newDeadlineIso } 
          : t
      ))
      onRefreshTasks()
    }
  }

  useEffect(() => {
    return () => {
      if (handlePointerMoveRef.current) window.removeEventListener('pointermove', handlePointerMoveRef.current)
      if (handlePointerUpRef.current) window.removeEventListener('pointerup', handlePointerUpRef.current)
    }
  }, [])

  const handleStatusChange = async (taskId: string, status: string) => {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId)
    if (!error) onRefreshTasks()
  }

  // --- End Pointer Handlers ---

  useEffect(() => {
    const gantt = ganttRef.current
    if (!gantt) return

    const handleWheel = (e: WheelEvent) => {
      const viewport = gantt.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement
      if (!viewport) return

      e.stopPropagation()
      const leftWidth = 256 + 40
      const isOverTimeline = e.clientX > (gantt.getBoundingClientRect().left + leftWidth)

      const mouseX = e.clientX - gantt.getBoundingClientRect().left
      const isLeftColumn = mouseX <= leftWidth || (e.target as HTMLElement).closest('.gantt-left-column')

      if (isLeftColumn) {
        viewport.scrollTop += e.deltaY
      } else {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          viewport.scrollLeft += e.deltaY
        } else {
          viewport.scrollLeft += e.deltaX
        }
      }

      if (e.cancelable) e.preventDefault()
    }

    gantt.addEventListener('wheel', handleWheel, { passive: false })
    return () => gantt.removeEventListener('wheel', handleWheel)
  }, [])

  const normalizeVn = (str: string) => {
    if (!str) return ''
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim()
  }

  // Move filteredTasks to top level so it's shared by all views
  const filteredTasks = useMemo(() => {
    if (!searchQuery) return localTasks
    const terms = searchQuery.split(',').map(t => normalizeVn(t.trim())).filter(t => t !== '')
    if (terms.length === 0) return localTasks
    
    return localTasks.filter(task => {
      const taskName = normalizeVn(task.name)
      const projectName = normalizeVn(task.projects?.name || '')
      const groupName = normalizeVn(task.task_groups?.name || '')
      
      return terms.some(term => 
        taskName.includes(term) || 
        projectName.includes(term) || 
        groupName.includes(term)
      )
    })
  }, [localTasks, searchQuery])

  const handleToggleProjectSearch = (projectName: string) => {
    const terms = searchQuery.split(',').map(t => t.trim()).filter(t => t !== '')
    const exists = terms.some(t => t.toLowerCase() === projectName.toLowerCase())
    
    if (exists) {
      setSearchQuery(terms.filter(t => t.toLowerCase() !== projectName.toLowerCase()).join(', '))
    } else {
      setSearchQuery(terms.length > 0 ? [...terms, projectName].join(', ') : projectName)
    }
  }

  const hierarchy = useMemo(() => {
    const projectsMap = new Map<string, { id: string, name: string, status: string, color?: string, tasks: Task[] }>()
    
    filteredTasks.forEach(task => {
      const pId = task.project_id
      if (!projectsMap.has(pId)) {
        projectsMap.set(pId, { 
          id: pId, 
          name: task.projects?.name || 'Unknown Project', 
          status: task.projects?.status || 'Active',
          color: task.projects?.color,
          tasks: [] 
        })
      }
      projectsMap.get(pId)!.tasks.push(task)
    })

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
          tasks: group.tasks,
          stats: {
            total: group.tasks.length,
            completed: group.tasks.filter(t => t.status === 'done').length,
            inprogress: group.tasks.filter(t => t.status === 'inprogress').length,
            todo: group.tasks.filter(t => t.status === 'todo').length,
            pending: group.tasks.filter(t => t.status === 'pending').length,
          },
          children: group.tasks.map(t => ({
            id: t.id,
            name: t.name,
            type: 'task' as const,
            status: t.status,
            priority: t.priority,
            start: t.start_date ? new Date(t.start_date) : (t.deadline ? new Date(t.deadline) : null),
            end: t.deadline ? new Date(t.deadline) : null,
            task: t // Keep full task ref
          }))
        }
      })

      if (ungroupedTasks.length > 0) {
        const { start, end } = calculateDateRange(ungroupedTasks)
        groups.push({
          id: `${project.id}-ungrouped`,
          name: 'Chưa phân nhóm',
          type: 'group' as const,
          status: ungroupedTasks.every(t => t.status === 'done') ? 'done' : 'inprogress',
          start,
          end,
          tasks: ungroupedTasks,
          stats: {
            total: ungroupedTasks.length,
            completed: ungroupedTasks.filter(t => t.status === 'done').length,
            inprogress: ungroupedTasks.filter(t => t.status === 'inprogress').length,
            todo: ungroupedTasks.filter(t => t.status === 'todo').length,
            pending: ungroupedTasks.filter(t => t.status === 'pending').length,
          },
          children: ungroupedTasks.map(t => ({
            id: t.id,
            name: t.name,
            type: 'task' as const,
            status: t.status,
            priority: t.priority,
            start: t.start_date ? new Date(t.start_date) : (t.deadline ? new Date(t.deadline) : null),
            end: t.deadline ? new Date(t.deadline) : null,
            task: t
          }))
        })
      }

      const { start, end } = calculateDateRange(project.tasks)
      const stats = {
        total: project.tasks.length,
        completed: project.tasks.filter(t => t.status === 'done').length,
        inprogress: project.tasks.filter(t => t.status === 'inprogress').length,
        todo: project.tasks.filter(t => t.status === 'todo').length,
        pending: project.tasks.filter(t => t.status === 'pending').length,
      }

      return {
        id: project.id,
        name: project.name,
        type: 'project' as const,
        status: project.status,
        color: project.color,
        start,
        end,
        stats,
        children: groups
      }
    })
  }, [localTasks, searchQuery])

  const handlePriorityChange = async (taskId: string, priority: string) => {
    const { error } = await supabase.from('tasks').update({ priority }).eq('id', taskId)
    if (!error) onRefreshTasks()
  }

  const renderHierarchy = (items: any[], level = 0, projectPath = "") => {
    return items.map(item => {
      const isExpanded = searchQuery ? true : expandedNodes.has(item.id)
      const hasChildren = item.children && item.children.length > 0
      
      const { left, width } = calculateGanttPercentages(
        item.start,
        item.end,
        timelineStart,
        daysToShow
      )

      const segments = item.type === 'group' ? calculateStatusSegments(item.tasks) : undefined
      const projectColor = item.type === 'project' ? item.color : undefined
      
      // Hierarchy path for tooltip
      const currentPath = item.type === 'project' ? item.name : 
                         item.type === 'group' ? `${projectPath} > ${item.name}` :
                         projectPath

      return (
        <div key={item.id} className="flex flex-col">
          <GanttRow 
            id={item.id}
            name={item.name}
            type={item.type}
            level={level}
            status={item.status}
            priority={item.type === 'task' ? item.priority : undefined}
            start={item.start}
            end={item.end}
            expanded={isExpanded}
            hasChildren={hasChildren}
            onToggle={() => toggleNode(item.id)}
            onPriorityChange={item.type === 'task' ? (p) => handlePriorityChange(item.id, p) : undefined}
            onStatusChange={item.type === 'task' ? (s) => handleStatusChange(item.id, s) : undefined}
            onFocusClick={item.start ? () => setTimelineStart(startOfWeek(item.start, { weekStartsOn: 1 })) : undefined}
            onDragStart={item.type === 'task' ? (e, type) => handleDragStart(e, item.task, type) : undefined}
            onDoubleClick={item.type === 'task' ? () => setEditingDateTask(item.task) : undefined}
            onNameClick={() => {
              if (item.type === 'project') router.push(`/projects/${item.id}`)
              else if (item.type === 'group') setSelectedGroup({ 
                group: item, 
                tasks: item.tasks, 
                projectId: localTasks.find(t => t.task_group_id === item.id || `${t.project_id}-ungrouped` === item.id)?.project_id || '',
                categoryId: localTasks.find(t => t.task_group_id === item.id || `${t.project_id}-ungrouped` === item.id)?.category_id || ''
              })
              else if (item.type === 'task') {
                const fullTask = localTasks.find(t => t.id === item.id)
                if (fullTask) setSelectedTask(fullTask)
              }
            }}
            timelineLeft={left}
            timelineWidth={width}
            barColor={projectColor}
            segments={segments}
            projectInfo={item.type === 'task' ? currentPath : undefined}
            projectStats={(item.type === 'project' || item.type === 'group') ? item.stats : undefined}
            onProjectFilter={item.type === 'project' ? () => handleToggleProjectSearch(item.name) : undefined}
            isProjectActive={item.type === 'project' && searchQuery.split(',').map(t => normalizeVn(t.trim())).includes(normalizeVn(item.name))}
            barRef={(el) => { barRefs.current[item.id] = el }}
          />
          {isExpanded && hasChildren && (
            <div className="flex flex-col">
              {renderHierarchy(item.children, level + 1, currentPath)}
            </div>
          )}
        </div>
      )
    })
  }

  const renderFlatView = () => {
    return filteredTasks.map(task => {
      const start = task.start_date ? new Date(task.start_date) : (task.deadline ? new Date(task.deadline) : null)
      const { left, width } = calculateGanttPercentages(
        start,
        task.deadline ? new Date(task.deadline) : null,
        timelineStart,
        daysToShow
      )

      const path = `${task.projects?.name || 'No Project'} ${task.task_groups ? ` > ${task.task_groups.name}` : ''}`

      return (
        <GanttRow 
          key={task.id}
          id={task.id}
          name={task.name}
          type="task"
          level={0}
          status={task.status}
          priority={task.priority}
          start={task.start_date ? new Date(task.start_date) : null}
          end={task.deadline ? new Date(task.deadline) : null}
          timelineLeft={left}
          timelineWidth={width}
          onNameClick={() => setSelectedTask(task)}
          onPriorityChange={(p) => handlePriorityChange(task.id, p)}
          onStatusChange={(s) => handleStatusChange(task.id, s)}
          onFocusClick={start ? () => setTimelineStart(startOfWeek(start, { weekStartsOn: 1 })) : undefined}
          onDragStart={(e, type) => handleDragStart(e, task, type)}
          onDoubleClick={() => setEditingDateTask(task)}
          projectInfo={path}
          barRef={(el) => { barRefs.current[task.id] = el }}
        />
      )
    })
  }

  const shiftTimeline = (days: number) => {
    setTimelineStart(prev => addDays(prev, days))
  }

  return (
    <div ref={ganttRef} className="flex flex-col h-full bg-white/50 glass-premium rounded-3xl border border-white/20 overflow-hidden shadow-sm">
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
          <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200 mr-2">
            <Button 
              variant={viewMode === 'hierarchy' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('hierarchy')}
              className={cn("h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest", viewMode === 'hierarchy' && "bg-white shadow-sm")}
            >
              <Layers className="h-3 w-3 mr-1.5" />
              Cây thư mục
            </Button>
            <Button 
              variant={viewMode === 'flat' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('flat')}
              className={cn("h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest", viewMode === 'flat' && "bg-white shadow-sm")}
            >
              <ListFilter className="h-3 w-3 mr-1.5" />
              Gantt Task
            </Button>
          </div>

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

      <ScrollArea className="flex-1 w-full" style={{ height: '100%' }}>
        <div className="min-w-fit min-h-full">
          <div className="flex border-b border-slate-100 sticky top-0 z-10 shadow-sm bg-white/95 backdrop-blur-md">
            <div className="gantt-left-column sticky left-0 z-20 w-64 shrink-0 bg-white/80 backdrop-blur-md border-r border-slate-100 shadow-[4px_0_15px_-5px_rgba(0,0,0,0.1)] flex items-center px-4">
              <div className="relative w-full group">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text"
                  placeholder="Tìm kiếm dự án, task..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100/50 border border-transparent focus:border-primary/20 focus:bg-white rounded-lg py-1.5 pl-9 pr-8 text-[10px] font-bold text-slate-700 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full flex items-center justify-center hover:bg-slate-200 text-slate-400 transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            </div>
            <div ref={timelineGridRef} className="flex px-8 min-w-[800px] w-full relative">
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

              {/* Snap Preview Ghost Bar Removed - Replaced by direct DOM updates */}
            </div>
          </div>

          <div className="flex flex-col pb-10">
            {hierarchy.length > 0 ? (
              viewMode === 'hierarchy' ? renderHierarchy(hierarchy) : renderFlatView()
            ) : (
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
        <ScrollBar orientation="horizontal" className="h-2.5 p-0.5 z-50" />
        <ScrollBar orientation="vertical" className="w-2.5 p-0.5 z-50" />
      </ScrollArea>

      {selectedGroup && (
        <GroupTimelineModal 
          group={selectedGroup.group}
          tasks={selectedGroup.tasks}
          projectId={selectedGroup.projectId}
          categoryId={selectedGroup.categoryId}
          open={!!selectedGroup}
          onOpenChange={(v) => !v && setSelectedGroup(null)}
          onTaskUpdated={onRefreshTasks}
        />
      )}

      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(v) => !v && setSelectedTask(null)}
          onTaskUpdated={onRefreshTasks}
        />
      )}

      {editingDateTask && (
        <TaskDateRangeDialog 
          task={editingDateTask}
          open={!!editingDateTask}
          onOpenChange={(v) => !v && setEditingDateTask(null)}
          onTaskUpdated={onRefreshTasks}
        />
      )}
    </div>
  )
}
