import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { NewTaskDialog } from '@/components/tasks/new-task-dialog'
import { Task } from '@/hooks/use-tasks'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { format, addDays, eachDayOfInterval, isSameDay, differenceInCalendarDays, differenceInDays, startOfDay } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { LayoutGrid, Calendar as CalendarIcon, Clock, Flag, ChevronDown, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PRIORITY_OPTIONS, getPriorityInfo } from '@/lib/priority-utils'
import { STATUS_OPTIONS, getStatusInfo } from '@/lib/status-utils'

interface GroupTimelineModalProps {
  group: {
    id: string
    name: string
    start_date?: string | null
    deadline?: string | null
  }
  tasks: Task[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskClick?: (taskId: string) => void
  onTaskUpdated?: () => void
  projectId: string
  categoryId: string
}

export function GroupTimelineModal({ group, tasks: initialTasks, open, onOpenChange, onTaskClick, onTaskUpdated, projectId, categoryId }: GroupTimelineModalProps) {
  const [localTasks, setLocalTasks] = useState<Task[]>(initialTasks)
  const [resizingTaskId, setResizingTaskId] = useState<string | null>(null)
  const [dragType, setDragType] = useState<'move' | 'left' | 'right' | null>(null)
  const [isPendingSync, setIsPendingSync] = useState(false)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [snapPreview, setSnapPreview] = useState<{ taskId: string, left: number, width: number } | null>(null)
  const dragStartPos = useRef<{ x: number, start_date: Date, deadline: Date } | null>(null)
  const activeDragRef = useRef<{ id: string, type: 'move' | 'left' | 'right', startX: number, start: Date, deadline: Date, initialWidth: number } | null>(null)
  const lastSavedRef = useRef<{ id: string, start: string, end: string } | null>(null)
  const barRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const timelineGridRef = useRef<HTMLDivElement>(null)

  // Only accept parent data if we are NOT dragging AND NOT waiting for an API response
  useEffect(() => {
    if (!resizingTaskId && !isPendingSync) {
      setLocalTasks(initialTasks)
    }
  }, [initialTasks, resizingTaskId, isPendingSync])

  // Release the lock ONLY when the parent sends fresh data that MATCHES our last saved state
  useEffect(() => {
    if (!isPendingSync || !lastSavedRef.current) return

    const saved = lastSavedRef.current
    const incomingTask = initialTasks.find(t => t.id === saved.id)
    
    if (incomingTask && incomingTask.start_date && incomingTask.deadline) {
      const incomingStart = new Date(incomingTask.start_date).getTime()
      const incomingEnd = new Date(incomingTask.deadline).getTime()
      const savedStart = new Date(saved.start).getTime()
      const savedEnd = new Date(saved.end).getTime()

      // Use getTime() for flawless cross-environment timestamp comparison
      if (incomingStart === savedStart && incomingEnd === savedEnd) {
        setIsPendingSync(false)
        lastSavedRef.current = null
        setLocalTasks(initialTasks)
      }
    }
  }, [initialTasks, isPendingSync])

  // Safety timeout: don't stay locked forever if something fails
  useEffect(() => {
    if (isPendingSync) {
        const timeout = setTimeout(() => {
            setIsPendingSync(false)
            setLocalTasks(initialTasks)
        }, 3000)
        return () => clearTimeout(timeout)
    }
  }, [isPendingSync, initialTasks])

  // Calculate the actual visible range based on BOTH group range AND local task dates
  // This prevents bars from hitting a "wall" during drag because the container expands to fit them
  const validStarts = localTasks.map(t => t.start_date ? new Date(t.start_date).getTime() : NaN).filter(n => !isNaN(n))
  const validEnds = localTasks.map(t => t.deadline ? new Date(t.deadline).getTime() : NaN).filter(n => !isNaN(n))
  
  const minTaskTime = validStarts.length > 0 ? Math.min(...validStarts) : (group.start_date ? new Date(group.start_date).getTime() : Date.now())
  const maxTaskTime = validEnds.length > 0 ? Math.max(...validEnds) : (group.deadline ? new Date(group.deadline).getTime() : Date.now() + 86400000 * 14)

  const viewStart = startOfDay(new Date(Math.min(minTaskTime, group.start_date ? new Date(group.start_date).getTime() : Infinity)))
  const viewEnd = startOfDay(new Date(Math.max(maxTaskTime, group.deadline ? new Date(group.deadline).getTime() : -Infinity)))
  
  // Create an interval that covers the visible range
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd })

  const minutesToTime = (val: any) => {
    if (typeof val === 'number') {
      const h = Math.floor(val / 60).toString().padStart(2, '0')
      const m = (val % 60).toString().padStart(2, '0')
      return `${h}:${m}`
    }
    return typeof val === 'string' && val ? val : '09:00'
  }




  const updateTaskField = async (taskId: string, field: string, value: any) => {
    setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t))
    await supabase.from('tasks').update({ [field]: value }).eq('id', taskId)
    onTaskUpdated?.()
  }

  const DAY_WIDTH_PX = 96

  const dateToPixel = (date: Date): number => {
    const diffDays = differenceInDays(startOfDay(date), startOfDay(viewStart))
    return diffDays * DAY_WIDTH_PX
  }

  const getBarPixels = (start_date: string | null | undefined, deadline: string | null | undefined) => {
    if (!start_date || !deadline) return { left: 0, width: 0 }
    const s = new Date(start_date)
    const e = new Date(deadline)
    const leftPx = Math.max(0, dateToPixel(s))
    const widthPx = Math.max(60, (differenceInDays(startOfDay(e), startOfDay(s)) + 1) * DAY_WIDTH_PX)
    return { left: leftPx, width: widthPx }
  }

  const handleDragStart = (e: React.PointerEvent, task: Task, type: 'move' | 'left' | 'right') => {
    e.stopPropagation()
    e.preventDefault()
    setResizingTaskId(task.id)
    setDragType(type)
    
    // Ensure we have valid dates for the drag start
    const sDate = task.start_date ? new Date(task.start_date) : (task.deadline ? new Date(task.deadline) : new Date())
    const dDate = task.deadline ? new Date(task.deadline) : (task.start_date ? new Date(task.start_date) : new Date())
    
    // Phase 2: Capture initial pixel data for visual gliding
    const barEl = barRefs.current[task.id]
    const initialWidth = barEl ? barEl.offsetWidth : 0

    dragStartPos.current = { x: e.clientX, start_date: sDate, deadline: dDate }
    activeDragRef.current = { id: task.id, type, startX: e.clientX, start: sDate, deadline: dDate, initialWidth }
    
    // Task 3: Disable transition during active drag
    if (barEl) {
        barEl.style.transition = 'none'
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handlePointerMove = (e: PointerEvent) => {
    const dragData = activeDragRef.current
    if (!dragData) return

    const deltaX = e.clientX - dragData.startX
    const barEl = barRefs.current[dragData.id]
    
    // Task 2: dynamic day width measurement
    const dayWidth = timelineGridRef.current 
      ? timelineGridRef.current.scrollWidth / days.length 
      : 96

    // Phase 3: Direct Visual Gliding (Bypass React re-render)
    if (barEl) {
        if (dragData.type === 'move') {
            barEl.style.transform = `translateX(${deltaX}px)`
        } else if (dragData.type === 'right') {
            barEl.style.width = `${dragData.initialWidth + deltaX}px`
        } else if (dragData.type === 'left') {
            barEl.style.transform = `translateX(${deltaX}px)`
            barEl.style.width = `${dragData.initialWidth - deltaX}px`
        }
    }

    // Task 4: Snap preview ghost bar
    const snappedDayDelta = Math.round(deltaX / dayWidth)
    const previewStart = addDays(dragData.start, dragData.type === 'right' ? 0 : snappedDayDelta)
    const previewEnd = addDays(dragData.deadline, dragData.type === 'left' ? 0 : snappedDayDelta)
    
     const { left, width } = getBarPixels(previewStart.toISOString(), previewEnd.toISOString())
     setSnapPreview({ taskId: dragData.id, left, width })
  }

  const handlePointerUp = async (e: PointerEvent) => {
    const dragData = activeDragRef.current
    if (!dragData) return

    // Task 2: dynamic day width measurement
    const dayWidth = timelineGridRef.current 
      ? timelineGridRef.current.scrollWidth / days.length 
      : 96

    // 1. Calculate final delta directly from the pointer event
    const deltaX = e.clientX - dragData.startX
    const dayDelta = Math.round(deltaX / DAY_WIDTH_PX)

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

    // Task 1: Optimistic local update on drop
    setLocalTasks(prev => prev.map(t => 
        t.id === dragData.id 
          ? { ...t, start_date: newStartIso, deadline: newDeadlineIso } 
          : t
    ))

    // Task 3: Smooth snap animation & Anti-Shrink Fix
    const barEl = barRefs.current[dragData.id]
    if (barEl) {
        // Calculate the exact final pixels to perfectly match React's next virtual DOM render
        const { left: finalLeftPx, width: finalWidthPx } = getBarPixels(newStartIso, newDeadlineIso)
        
        barEl.style.transition = ''
        barEl.style.transform = ''
        
        // FIX: Force the real DOM to match the snapped position to prevent shrinking and flickering
        barEl.style.width = `${finalWidthPx}px`
        barEl.style.left = `${finalLeftPx}px`
        
        // Remove transition after animation completes so it doesn't interfere with the next drag
        setTimeout(() => {
          if (barEl) barEl.style.transition = ''
        }, 160)
    }

    // Save expectation
    lastSavedRef.current = { id: dragData.id, start: newStartIso, end: newDeadlineIso }
    
    // Clear all states
    setIsPendingSync(true)
    setResizingTaskId(null)
    setDragType(null)
    setSnapPreview(null) // Task 4: Clear preview
    dragStartPos.current = null
    activeDragRef.current = null

    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)

    // 4. Fire exact mutation
    const { error } = await supabase
        .from('tasks')
        .update({ 
            start_date: newStartIso,
            deadline: newDeadlineIso 
        })
        .eq('id', dragData.id)
    
    if (error) {
        console.error("Error updating task deadline:", error)
        setIsPendingSync(false)
        setLocalTasks(initialTasks)
    } else {
        onTaskUpdated?.()
    }
  }

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-[95vw] w-[1300px] sm:max-w-[95vw] sm:w-[1300px] max-h-[90dvh] rounded-[2.5rem] border-none glass-premium p-0 overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-500",
        isAddingTask && "opacity-0 scale-95 pointer-events-none translate-y-4"
      )}>
        <DialogHeader className="p-10 pb-6 bg-white/80 border-b border-slate-100/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <NewTaskDialog 
                projectId={projectId}
                initialCategoryId={categoryId}
                initialTaskGroupId={group.id}
                onTaskCreated={() => onTaskUpdated?.()}
                onOpenChange={setIsAddingTask}
                trigger={
                  <button className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all cursor-pointer group/addbtn relative overflow-hidden">
                    <Plus className="h-8 w-8 group-hover/addbtn:scale-110 transition-transform" />
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/addbtn:opacity-100 transition-opacity" />
                  </button>
                }
              />
              <div>
                <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">{group.name}</DialogTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(viewStart, 'dd MMM yyyy', { locale: vi })} — {format(viewEnd, 'dd MMM yyyy', { locale: vi })}
                  </div>
                  <div className="h-1 w-1 rounded-full bg-slate-200" />
                  <div className="flex items-center gap-2 text-[10px] font-black text-primary">
                    <Clock className="h-3.5 w-3.5" />
                    {localTasks.length} {localTasks.length === 1 ? 'Task' : 'Tasks'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden bg-slate-50/20">
          {/* Left Column: Task Names */}
          <div className="w-[320px] border-r border-slate-100 bg-white flex flex-col shrink-0 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.05)] z-10">
            <div className="h-14 border-b border-slate-50 flex items-center px-8 bg-slate-50/30">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Tasks Listing</span>
            </div>
            <ScrollArea className="flex-1">
              <div className="py-2">
              {localTasks.map((task, idx) => (
                <div
                  key={task.id}
                  className={cn(
                    "h-16 flex items-center px-4 gap-3 group transition-colors hover:bg-slate-50 border-b border-slate-50 last:border-none",
                    task.status === 'done' && "opacity-50"
                  )}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          className="shrink-0 h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-all group/prio cursor-pointer"
                        >
                          <Flag className={cn(
                            "h-4 w-4 transition-all fill-current",
                            getPriorityInfo(task.priority).text
                          )} />
                        </button>
                      }
                    />
                    <DropdownMenuContent align="start" className="rounded-xl border-none glass-premium shadow-2xl p-2 min-w-[150px]">
                        {PRIORITY_OPTIONS.map(p => (
                          <DropdownMenuItem 
                            key={p.value} 
                            onClick={() => updateTaskField(task.id, 'priority', p.value)}
                            className="rounded-lg px-3 py-1.5 cursor-pointer focus:bg-primary/10 flex items-center gap-2"
                          >
                            <Flag className={cn("h-3.5 w-3.5 fill-current", p.text)} />
                            <span className="text-[10px] font-bold">{p.label}</span>
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Status Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          className={cn(
                            "shrink-0 h-5 w-5 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform cursor-pointer",
                            getStatusInfo(task.status).color
                          )}
                        />
                      }
                    />
                    <DropdownMenuContent align="start" className="rounded-xl border-none glass-premium shadow-2xl p-2 min-w-[150px]">
                        {STATUS_OPTIONS.map(s => (
                          <DropdownMenuItem 
                            key={s.value} 
                            onClick={() => updateTaskField(task.id, 'status', s.value)}
                            className="rounded-lg px-3 py-1.5 cursor-pointer focus:bg-primary/10 flex items-center gap-2"
                          >
                            <div className={cn("h-3.5 w-3.5 rounded-full", s.color)} />
                            <span className="text-[10px] font-bold">{s.label}</span>
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Task name + date range */}
                  <div 
                    onClick={() => onTaskClick?.(task.id)}
                    className="flex flex-col min-w-0 flex-1 cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-700 truncate group-hover:text-primary transition-colors">
                      {task.name}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 mt-0.5 tabular-nums">
                      {task.start_date && task.deadline
                        ? `${format(new Date(task.start_date), 'dd/MM')} – ${format(new Date(task.deadline), 'dd/MM')}`
                        : task.start_date
                        ? `From ${format(new Date(task.start_date), 'dd/MM')}`
                        : task.deadline
                        ? `Due ${format(new Date(task.deadline), 'dd/MM')}`
                        : '—'
                      }
                    </span>
                  </div>
                </div>
              ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right Area: Timeline Scrollable */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
             <ScrollArea 
               className="flex-1 w-full"
               onWheel={(e) => {
                 // Redirect vertical scroll to horizontal
                 if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                   const viewport = e.currentTarget.querySelector('[data-slot="scroll-area-viewport"]')
                   if (viewport) {
                     viewport.scrollLeft += e.deltaY
                   }
                 }
               }}
             >
                <div ref={timelineGridRef} className="inline-block min-w-full">
                  {/* Timeline Header (Dates) */}
                  <div className="flex h-14 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md z-20">
                    {days.map(day => (
                      <div key={day.toISOString()} className="w-24 border-r border-slate-50/50 flex flex-col items-center justify-center shrink-0 group hover:bg-slate-50 transition-colors">
                        <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-primary">{format(day, 'EEE', { locale: vi })}</span>
                        <span className={cn(
                          "text-[11px] font-black mt-0.5 transition-all",
                          isSameDay(day, new Date()) ? "text-white h-6 w-6 flex items-center justify-center bg-primary rounded-lg shadow-lg shadow-primary/30" : "text-slate-600"
                        )}>
                          {format(day, 'd')}
                        </span>
                      </div>
                    ))}
                  </div>

                                   <div className="relative py-4">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                       {days.map(day => (
                         <div key={day.toISOString()} className={cn(
                             "w-24 border-r border-slate-100 h-full shrink-0",
                             isSameDay(day, new Date()) && "bg-primary/[0.02]"
                         )} />
                       ))}
                    </div>

                    {/* Task Bars Area */}
                    <div className="relative z-10">
                        {localTasks.map((task) => {
                          const { left: leftPx, width: widthPx } = getBarPixels(task.start_date, task.deadline)
                          
                          return (
                            <div key={task.id} className="h-16 flex items-center relative">
                               {/* Task 4: Snap preview ghost bar */}
                               {snapPreview?.taskId === task.id && (
                                   <div 
                                       className="absolute h-9 border-2 border-dashed border-white/40 rounded-2xl bg-white/5 pointer-events-none z-0"
                                       style={{
                                           left: `${snapPreview.left}px`,
                                           width: `${snapPreview.width}px`
                                       }}
                                   />
                               )}
                               <div 
                                 ref={el => { barRefs.current[task.id] = el }}
                                 className={cn(
                                   "absolute h-9 rounded-2xl shadow-xl flex items-center px-4 overflow-hidden group/bar",
                                   resizingTaskId === task.id ? "z-30 shadow-2xl ring-2 ring-white/50" : "duration-300 ease-in-out hover:z-20",
                                   getStatusInfo(task.status).color,
                                   task.status === 'done' && "opacity-60 grayscale-[0.3]"
                                 )}
                                 onPointerDown={(e) => handleDragStart(e, task, 'move')}
                                 style={{ 
                                   left: `${leftPx}px`, 
                                   width: `${widthPx}px`,
                                   minWidth: '60px'
                                 }}
                               >
                                {/* Left Resize Handle */}
                                <div 
                                    onPointerDown={(e) => {
                                        e.stopPropagation()
                                        handleDragStart(e, task, 'left')
                                    }}
                                    className="absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center cursor-ew-resize opacity-0 group-hover/bar:opacity-100 transition-opacity z-30 hover:bg-white/10"
                                >
                                    <div className="w-1 h-3 rounded-full bg-white/40" />
                                </div>

                                <div className="flex items-center gap-2 min-w-0 flex-1 select-none pointer-events-none">
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/20 shrink-0">
                                        <Clock className="h-3 w-3 text-white" />
                                        {task.task_time != null && task.task_time > 0 && widthPx >= 80 && (
                                            <span className="text-[11px] font-bold text-white uppercase translate-y-[0.5px]">
                                                {minutesToTime(task.task_time)}
                                            </span>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-[11px] uppercase font-bold text-white truncate",
                                        widthPx < 80 && "hidden"
                                    )}>
                                        {task.name}
                                    </span>
                                </div>
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/bar:opacity-100 transition-opacity" />
                                
                                {/* Right Resize Handle */}
                                <div 
                                    onPointerDown={(e) => {
                                        e.stopPropagation()
                                        handleDragStart(e, task, 'right')
                                    }}
                                    className="absolute right-0 top-0 bottom-0 w-4 flex items-center justify-center cursor-ew-resize opacity-0 group-hover/bar:opacity-100 transition-opacity z-30 hover:bg-white/10"
                                >
                                    <div className="w-1 h-3 rounded-full bg-white/40" />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </div>
                <ScrollBar 
                  orientation="horizontal" 
                  className="h-3 p-0.5 bg-slate-100/80 hover:bg-slate-200 transition-colors z-50 border-t border-slate-200" 
                />
                <ScrollBar orientation="vertical" className="w-3 p-0.5 bg-slate-100 hover:bg-slate-200 transition-colors z-50" />
             </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
