'use client'

import { useState } from 'react'
import { Task } from '@/hooks/use-tasks'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Circle,
  MoreVertical,
  Plus
} from 'lucide-react'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EditTaskDialog } from '@/components/tasks/edit-task-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval 
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface CalendarViewProps {
  tasks: Task[]
}

export function CalendarView({ tasks }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  })

  const getTasksForDay = (day: Date) => {
    return tasks.filter(t => isSameDay(new Date(t.deadline), day))
  }

  return (
    <div className="w-full">
      {/* Redesigned Calendar Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 px-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 capitalize tracking-tight leading-none mb-1">
              {format(currentMonth, 'MMMM yyyy', { locale: vi })}
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lịch biểu công việc</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/60 p-1.5 rounded-2xl border border-white/80 shadow-sm backdrop-blur-sm">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={prevMonth} 
            className="rounded-xl h-9 w-9 hover:bg-white text-slate-500"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={nextMonth} 
            className="rounded-xl h-9 w-9 hover:bg-white text-slate-500"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Redesigned Calendar Grid */}
      <div className="bg-white/40 p-1 rounded-[2.5rem] border border-white/60 glass-premium shadow-lg min-w-[700px]">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-white/60 mb-1">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
            <div key={d} className="py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const dayTasks = getTasksForDay(day)
            const isToday = isSameDay(day, new Date())
            const isCurrentMonth = isSameMonth(day, monthStart)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6

            return (
              <div 
                key={day.toString()} 
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "min-h-[140px] p-3 transition-all duration-300 rounded-[1.8rem] group cursor-pointer border-2 border-transparent hover:border-white/80 hover:bg-white/60 hover:shadow-xl hover:shadow-primary/5",
                  !isCurrentMonth ? "opacity-20 bg-slate-100/10 grayscale-[0.5]" : "bg-white/30",
                  isWeekend && isCurrentMonth && "bg-slate-50/40"
                )}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className={cn(
                    "text-xs font-black h-8 w-8 flex items-center justify-center rounded-xl transition-all duration-500 group-hover:scale-110",
                    isToday ? "bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-primary/5" : 
                    isWeekend ? "text-rose-400 bg-white/60" : "text-slate-500 bg-white/60"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                     <div className="h-1.5 w-1.5 rounded-full bg-primary/20 animate-pulse" />
                  )}
                </div>

                <div className="space-y-1.5 overflow-hidden">
                  {dayTasks.slice(0, 2).map(task => (
                    <div 
                      key={task.id} 
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTask(task)
                      }}
                      className={cn(
                        "group/task text-[9px] font-black uppercase tracking-tight px-2.5 py-1.5 rounded-xl border-l-[3px] transition-all hover:translate-x-1 hover:shadow-md truncate backdrop-blur-sm",
                        task.priority === 'critical' ? "bg-rose-50/80 text-rose-600 border-rose-500" :
                        task.priority === 'high' ? "bg-amber-50/80 text-amber-600 border-amber-500" :
                        task.priority === 'medium' ? "bg-sky-50/80 text-sky-600 border-sky-500" :
                        "bg-slate-100/80 text-slate-600 border-slate-400"
                      )}
                    >
                      {task.name}
                    </div>
                  ))}
                  
                  {dayTasks.length > 2 && (
                    <div className="flex items-center justify-between px-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] font-black text-primary uppercase tracking-tighter">
                        + {dayTasks.length - 2} việc khác
                      </span>
                      <Plus className="h-2.5 w-2.5 text-primary" />
                    </div>
                  )}
                  
                  {dayTasks.length === 0 && isCurrentMonth && (
                     <div className="h-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-20 transition-opacity pt-4">
                        <Plus className="h-4 w-4 text-slate-400" />
                     </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Edit Task Dialog */}
      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onTaskUpdated={() => setSelectedTask(null)}
        />
      )}

      {/* Day Details Modal - Redesigned to be MORE Premium */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-[480px] rounded-[3rem] border-none glass-premium p-0 overflow-hidden shadow-2xl">
          <div className="p-10 pb-6 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
            <DialogHeader className="mb-0">
               <div className="flex items-center justify-between w-full mb-6">
                  <div className="h-16 w-16 rounded-[1.8rem] bg-white text-primary flex items-center justify-center shadow-2xl shadow-primary/10 ring-8 ring-primary/[0.03]">
                    <CalendarIcon className="h-8 w-8" />
                  </div>
                  <Badge variant="default" className="h-8 px-4 rounded-full bg-primary text-white font-black uppercase tracking-widest text-[10px]">
                    {selectedDay ? getTasksForDay(selectedDay).length : 0} Tasks
                  </Badge>
               </div>
              <DialogTitle className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                {selectedDay ? format(selectedDay, 'dd MMMM', { locale: vi }) : ''}
              </DialogTitle>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">
                 {selectedDay ? format(selectedDay, 'eeee', { locale: vi }) : ''}
              </p>
            </DialogHeader>
          </div>
          
          <ScrollArea className="max-h-[60vh] px-10 pb-10">
            <div className="space-y-4">
              {selectedDay && getTasksForDay(selectedDay).length > 0 ? (
                getTasksForDay(selectedDay).map(task => (
                  <div 
                    key={task.id}
                    onClick={() => {
                      setSelectedTask(task)
                      setSelectedDay(null)
                    }}
                    className="p-5 rounded-[2rem] bg-white/60 hover:bg-white border border-white hover:border-primary/20 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-primary/5 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 h-16 w-16 bg-primary/5 rounded-bl-[3rem] translate-x-12 -translate-y-12 group-hover:translate-x-4 group-hover:-translate-y-4 transition-transform duration-500" />
                    
                    <div className="flex justify-between items-start gap-3 relative z-10">
                      <div className="space-y-1 pr-6">
                        <h4 className="font-black text-slate-800 group-hover:text-primary transition-colors text-base leading-tight">
                          {task.name}
                        </h4>
                        {task.projects && (
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <Circle className="h-2 w-2 text-primary fill-primary" />
                            {task.projects.name}
                          </div>
                        )}
                      </div>
                      <Badge className={cn(
                        "shrink-0 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-none",
                        task.priority === 'critical' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' :
                        task.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      )}>
                        {task.priority || 'Normal'}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-white/20 rounded-[2.5rem] border-2 border-dashed border-white/60 flex flex-col items-center justify-center space-y-4">
                  <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center shadow-lg">
                     <span className="text-3xl">✨</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-800 font-black text-lg">Trống lịch</p>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Không có kế hoạch cho ngày này.</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
