import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Task } from '@/hooks/use-tasks'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { format, addDays, eachDayOfInterval, isSameDay, differenceInDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { calculateGanttPercentages } from '@/lib/gantt-utils'
import { LayoutGrid, Calendar as CalendarIcon, Clock } from 'lucide-react'

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
}

export function GroupTimelineModal({ group, tasks: initialTasks, open, onOpenChange, onTaskClick, onTaskUpdated }: GroupTimelineModalProps) {
  const [localTasks, setLocalTasks] = useState<Task[]>(initialTasks)
  const [resizingTaskId, setResizingTaskId] = useState<string | null>(null)
  const [dragType, setDragType] = useState<'move' | 'left' | 'right' | null>(null)
  const [isPendingSync, setIsPendingSync] = useState(false)
  const dragStartPos = useRef<{ x: number, start_date: Date, deadline: Date } | null>(null)
  const lastSavedRef = useRef<{ id: string, start: string, end: string } | null>(null)

  // Only accept parent data if we are NOT dragging AND NOT waiting for an API response
  useEffect(() => {
    if (!resizingTaskId && !isPendingSync) {
      setLocalTasks(initialTasks)
    }
  }, [initialTasks, resizingTaskId, isPendingSync])

  // Release the lock ONLY when the parent sends fresh data that MATCHES our last saved state
  // This prevents premature "snapbacks" caused by parent re-renders before DB sync is complete
  useEffect(() => {
    if (!isPendingSync || !lastSavedRef.current) return

    const saved = lastSavedRef.current
    const incomingTask = initialTasks.find(t => t.id === saved.id)
    
    // Only release if the task in the incoming props has the data we just saved
    if (incomingTask && incomingTask.start_date === saved.start && incomingTask.deadline === saved.end) {
      setIsPendingSync(false)
      lastSavedRef.current = null // Clear the expectation
      setLocalTasks(initialTasks)
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

  const viewStart = new Date(Math.min(minTaskTime, group.start_date ? new Date(group.start_date).getTime() : Infinity))
  const viewEnd = new Date(Math.max(maxTaskTime, group.deadline ? new Date(group.deadline).getTime() : -Infinity))
  
  // Create an interval that covers the visible range
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd })

  const STATUS_COLORS: Record<string, string> = {
    todo: 'bg-slate-500',
    inprogress: 'bg-sky-400',
    pending: 'bg-orange-400',
    done: 'bg-emerald-500',
  }

  const handleDragStart = (e: React.PointerEvent, task: Task, type: 'move' | 'left' | 'right') => {
    e.stopPropagation()
    e.preventDefault()
    setResizingTaskId(task.id)
    setDragType(type)
    
    // Ensure we have valid dates for the drag start
    const sDate = task.start_date ? new Date(task.start_date) : (task.deadline ? new Date(task.deadline) : new Date())
    const dDate = task.deadline ? new Date(task.deadline) : (task.start_date ? new Date(task.start_date) : new Date())
    
    dragStartPos.current = { 
        x: e.clientX, 
        start_date: sDate,
        deadline: dDate
    }
    
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handlePointerMove = (e: PointerEvent) => {
    // 1. Capture the ref value locally at the START to prevent mid-execution nulls
    const startPos = dragStartPos.current
    if (!resizingTaskId || !startPos || !dragType) return

    const deltaX = e.clientX - startPos.x
    const dayDelta = Math.round(deltaX / 96)
    
    if (dayDelta !== 0) {
        setLocalTasks(prev => prev.map(t => {
            if (t.id !== resizingTaskId) return t
            
            // 2. Extra safety: re-check the local capture inside the updater
            const baseStart = startPos.start_date
            const baseDeadline = startPos.deadline
            
            if (dragType === 'move') {
                return { 
                    ...t, 
                    start_date: addDays(baseStart, dayDelta).toISOString(),
                    deadline: addDays(baseDeadline, dayDelta).toISOString() 
                }
            } else if (dragType === 'left') {
                const newStart = addDays(baseStart, dayDelta)
                if (newStart > baseDeadline) return t
                return { ...t, start_date: newStart.toISOString() }
            } else if (dragType === 'right') {
                const newDeadline = addDays(baseDeadline, dayDelta)
                if (newDeadline < baseStart) return t
                return { ...t, deadline: newDeadline.toISOString() }
            }
            return t
        }))
    }
  }

  const handlePointerUp = async (e: PointerEvent) => {
    if (!resizingTaskId) return

    const currentTaskId = resizingTaskId
    const finalTask = localTasks.find(t => t.id === currentTaskId)
    
    if (finalTask) {
      // Record what we expect the parent to show eventually
      lastSavedRef.current = {
        id: currentTaskId,
        start: finalTask.start_date!,
        end: finalTask.deadline!
      }
      
      setIsPendingSync(true)
      setResizingTaskId(null)
      setDragType(null)
      dragStartPos.current = null
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)

      const { error } = await supabase
        .from('tasks')
        .update({ 
            start_date: finalTask.start_date,
            deadline: finalTask.deadline 
        })
        .eq('id', currentTaskId)
      
      if (error) {
        console.error("Error updating task deadline:", error)
        setIsPendingSync(false) // Unlock on error
        setLocalTasks(initialTasks) // Rollback
      } else {
        // 4. Trigger parent refetch
        onTaskUpdated?.()
      }
    } else {
      setIsPendingSync(false)
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
      <DialogContent className="max-w-[95vw] w-[1300px] sm:max-w-[95vw] sm:w-[1300px] h-[85vh] rounded-[3.5rem] border-none glass-premium p-0 overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-500">
        <DialogHeader className="p-10 pb-6 bg-white/80 border-b border-slate-100/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 rounded-[1.8rem] bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-200">
                 <LayoutGrid className="h-8 w-8" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">{group.name}</DialogTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(viewStart, 'dd MMM yyyy', { locale: vi })} — {format(viewEnd, 'dd MMM yyyy', { locale: vi })}
                  </div>
                  <div className="h-1 w-1 rounded-full bg-slate-200" />
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary">
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
                    onClick={() => onTaskClick?.(task.id)}
                    className={cn(
                        "h-16 flex items-center px-8 group transition-colors hover:bg-slate-50 border-b border-slate-50 last:border-none cursor-pointer",
                        task.status === 'done' && "opacity-50"
                    )}
                  >
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-slate-700 truncate group-hover:text-primary transition-colors">
                        {task.name}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                            {task.status}
                        </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right Area: Timeline Scrollable */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
             <ScrollArea className="flex-1 w-full">
                <div className="inline-block min-w-full">
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

                  {/* Gantt Grid Content */}
                  <div className="relative py-4">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                       {days.map(day => (
                         <div key={day.toISOString()} className={cn(
                             "w-24 border-r border-slate-100/40 h-full shrink-0",
                             isSameDay(day, new Date()) && "bg-primary/[0.02]"
                         )} />
                       ))}
                    </div>

                    {/* Task Bars Area */}
                    <div className="relative z-10">
                       {localTasks.map((task, idx) => {
                         const { left, width } = calculateGanttPercentages(
                           task.start_date,
                           task.deadline,
                           viewStart,
                           viewEnd
                         )
                         
                         return (
                           <div key={task.id} className="h-16 flex items-center relative px-[1px]">
                              <div 
                                onClick={() => !resizingTaskId && onTaskClick?.(task.id)}
                                className={cn(
                                  "absolute h-9 rounded-2xl shadow-xl flex items-center px-4 overflow-hidden group/bar transition-all hover:scale-[1.01] hover:shadow-2xl hover:z-20 cursor-pointer",
                                  resizingTaskId === task.id ? "ring-2 ring-white z-30 scale-[1.02] shadow-2xl" : "active:scale-95",
                                  STATUS_COLORS[task.status] || 'bg-slate-300',
                                  task.status === 'done' && "opacity-60 grayscale-[0.3]"
                                )}
                                onPointerDown={(e) => handleDragStart(e, task, 'move')}
                                style={{ 
                                  left: `${left}%`, 
                                  width: `${width}%`,
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
                                    <div className="h-5 w-5 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                                        <Clock className="h-3 w-3 text-white" />
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest text-white truncate",
                                        width < 12 && "hidden"
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
                <ScrollBar orientation="horizontal" className="h-3 p-0.5 bg-slate-100 hover:bg-slate-200 transition-colors z-50" />
                <ScrollBar orientation="vertical" className="w-3 p-0.5 bg-slate-100 hover:bg-slate-200 transition-colors z-50" />
             </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
