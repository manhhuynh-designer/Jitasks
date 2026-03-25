'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Task } from '@/hooks/use-tasks'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Circle,
  Plus,
  Flag,
  AlertTriangle,
  User,
  Clock,
  PlayCircle,
  CheckCircle2,
  ListTodo,
  X
} from 'lucide-react'
import { getPriorityInfo } from '@/lib/priority-utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { EditTaskDialog } from '@/components/tasks/edit-task-dialog'
import { NewTaskDialog } from '@/components/tasks/new-task-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from '@/components/ui/calendar'

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
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isToday,
  startOfDay,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const STATUS_COLOR_MAP: Record<string, string> = {
  todo: 'bg-slate-500/80 text-white border-transparent',
  inprogress: 'bg-sky-400 text-white border-transparent shadow-md shadow-sky-400/20',
  pending: 'bg-orange-400 text-white border-transparent shadow-md shadow-orange-400/20',
  done: 'bg-emerald-500 text-white border-transparent opacity-50',
}

const formatTaskTime = (minutes: any) => {
  if (typeof minutes !== 'number') return minutes;
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}


interface DayCellProps {
  day: Date
  view: 'month' | 'week'
  isToday: boolean
  isCurrentMonth: boolean
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onDayClick: (day: Date) => void
  className?: string
}

const DayCell = ({
  day,
  view,
  isToday,
  isCurrentMonth,
  tasks: dayTasks,
  onTaskClick,
  onDayClick,
  className
}: DayCellProps) => {
  const isWeekend = day.getDay() === 0 || day.getDay() === 6

  return (
    <div
      onClick={() => onDayClick(day)}
      className={cn(
        "group cursor-pointer flex flex-col",
        view === 'month' ? "flex-1 min-h-0" : "min-h-[600px]",
        !isCurrentMonth ? "bg-slate-50/10 opacity-30" : "bg-white",
        isWeekend && isCurrentMonth && "bg-slate-50/10",
        className
      )}
    >
      <div className="flex justify-between items-center mb-0.5 px-1.5 pt-1.5">
        <span className={cn(
          "text-[13px] font-black h-7 w-7 flex items-center justify-center rounded-lg transition-all duration-500",
          isToday ? "bg-primary text-white shadow-lg shadow-primary/30" :
            isWeekend ? "text-rose-500" : "text-slate-500"
        )}>
          {format(day, 'd')}
        </span>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className={cn("w-full h-full")}>
          <div className="space-y-2 px-2 pb-6">
            {dayTasks.map((task: Task) => (
              <div
                key={task.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onTaskClick(task)
                }}
                className={cn(
                  "group/task relative flex flex-col p-2.5 rounded-lg border cursor-pointer shadow-sm opacity-90",
                  view === 'month' ? "py-1.5 rounded-lg" : "gap-3",
                  view === 'month' ?
                    (task.status === 'todo' ? 'bg-slate-500/50 text-white border-transparent' :
                      task.status === 'inprogress' ? 'bg-sky-400/50 text-sky-900 border-transparent' :
                        task.status === 'pending' ? 'bg-orange-400/50 text-orange-950 border-transparent' :
                          task.status === 'done' ? 'bg-emerald-500/30 text-emerald-950 border-transparent' :
                            'bg-slate-100/50 text-slate-700 border-slate-200') :
                    (STATUS_COLOR_MAP[task.status] || 'bg-slate-100 text-slate-700 border-slate-200')
                )}
              >
                <div className="flex gap-3 h-full items-center">

                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 overflow-hidden mb-1">
                      {view === 'week' && task.task_time != null && (
                        <div className="flex items-center gap-1 text-[8px] font-bold shrink-0">
                          <Clock className="h-2.5 w-2.5" />
                          {formatTaskTime(task.task_time)}
                        </div>
                      )}
                    </div>


                    <div className="flex items-center gap-1.5 min-w-0">
                      <Flag className={cn(
                        "shrink-0",
                        view === 'month' ? "h-2.5 w-2.5" : "h-3.5 w-3.5",
                        getPriorityInfo(task.priority)?.text || 'text-slate-400'
                      )} fill="currentColor" />

                      <span className={cn(
                        "font-normal leading-tight",
                        view === 'month' ? "text-[10px] truncate" : "text-[13px]",
                        task.status === 'done' && 'opacity-50 line-through'
                      )}>
                        {task.name}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Gradient Scroll Indicator for Month View Removed */}


        {dayTasks.length === 0 && (
          <div className="h-20 flex flex-col items-center justify-center opacity-0">
            <Plus className="h-4 w-4 text-slate-400" />
          </div>
        )}
      </div>
    </div>
  )
}

interface CalendarViewProps {
  tasks: Task[]
  projectId?: string
  className?: string
  onRefreshTasks: () => void
}

export function CalendarView({ tasks, projectId, className, onRefreshTasks }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)

  let startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
  let endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  if (view === 'week') {
    startDate = startOfWeek(currentMonth, { weekStartsOn: 1 })
    endDate = endOfWeek(currentMonth, { weekStartsOn: 1 })
  }

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  })

  // Group days into weeks for the month view
  const weeks: Date[][] = []
  if (view === 'month') {
    let currentWeek: Date[] = []
    calendarDays.forEach((day: Date) => {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    })
  }

  const getTasksForDay = (day: Date) => {
    return tasks.filter(t => {
      const taskDate = new Date(t.deadline)
      return isSameDay(taskDate, day)
    }).sort((a: any, b: any) => {
      if ((a.order_index || 0) !== (b.order_index || 0)) return (a.order_index || 0) - (b.order_index || 0);
      return (a.task_time || 0) - (b.task_time || 0);
    })
  }

  const nextPeriod = () => {
    if (view === 'month') setCurrentMonth(addMonths(currentMonth, 1))
    else {
      const nextWeek = new Date(currentMonth)
      nextWeek.setDate(nextWeek.getDate() + 7)
      setCurrentMonth(nextWeek)
    }
  }

  const prevPeriod = () => {
    if (view === 'month') setCurrentMonth(subMonths(currentMonth, 1))
    else {
      const prevWeek = new Date(currentMonth)
      prevWeek.setDate(prevWeek.getDate() - 7)
      setCurrentMonth(prevWeek)
    }
  }

  const jumpToDate = (date: Date) => setCurrentMonth(date)

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Redesigned Calendar Header - Sticky */}
      <div className="sticky top-0 z-20 p-6 mb-6 -mx-6 -mt-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-slate-800 capitalize tracking-tight leading-none">
                  {format(currentMonth, view === 'month' ? 'MMMM yyyy' : "'Tuần' w - yyyy", { locale: vi })}
                </h2>

                {/* Quick Jump UI */}
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-primary">
                        <ChevronRight className="h-4 w-4 rotate-90" />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                    <Calendar
                      mode="single"
                      selected={currentMonth}
                      onSelect={(date) => date && jumpToDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Today Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
              className="h-9 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-black uppercase tracking-widest px-4 shadow-sm"
            >
              Hôm nay
            </Button>

            {/* Minimalist View Switcher */}
            <div className="flex items-center gap-1.5 px-3">
              <button
                onClick={() => setView('month')}
                className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                  view === 'month' ? "text-primary border-b-2 border-primary pb-0.5" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Tháng
              </button>
              <span className="text-slate-200 font-thin">|</span>
              <button
                onClick={() => setView('week')}
                className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                  view === 'week' ? "text-primary border-b-2 border-primary pb-0.5" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Tuần
              </button>
            </div>

            <div className="flex items-center gap-0.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevPeriod}
                className="rounded-lg h-8 w-8 hover:bg-slate-50 text-slate-500"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={nextPeriod}
                className="rounded-lg h-8 w-8 hover:bg-slate-50 text-slate-500"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 shrink-0">
          {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map(d => (
            <div key={d} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-100 last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        {view === 'month' ? (
          <div className="flex flex-col flex-1 min-h-0">
            {weeks.map((week: Date[], idx: number) => (
              <div key={idx} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0 divide-x divide-slate-100 flex-1 min-h-0">
                {week.map((day: Date, dIdx: number) => (
                  <DayCell
                    key={day.toString()}
                    day={day}
                    view={view}
                    isToday={isSameDay(day, new Date())}
                    isCurrentMonth={isSameMonth(day, monthStart)}
                    tasks={getTasksForDay(day)}
                    onTaskClick={setSelectedTask}
                    onDayClick={setSelectedDay}
                    className={cn(
                      idx === weeks.length - 1 && dIdx === 0 && "rounded-bl-[2rem]",
                      idx === weeks.length - 1 && dIdx === 6 && "rounded-br-[2rem]"
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 border-b border-slate-100 last:border-b-0 divide-x divide-slate-100 flex-1 min-h-0">
            {calendarDays.map((day: Date) => (
              <DayCell
                key={day.toString()}
                day={day}
                view={view}
                isToday={isSameDay(day, new Date())}
                isCurrentMonth={true}
                tasks={getTasksForDay(day)}
                onTaskClick={setSelectedTask}
                onDayClick={setSelectedDay}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Task Dialog */}
      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onTaskUpdated={() => {
            setSelectedTask(null)
            onRefreshTasks()
          }}
        />
      )}

      {/* Day Details Modal */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-[480px] rounded-[2.5rem] border-none glass-premium p-0 overflow-hidden shadow-none">
          <div className="p-8 pb-6 bg-white/50">
            <DialogHeader className="mb-0">
              <div className="flex items-center justify-between w-full mb-6">
                <div className="h-16 w-16 rounded-[1.5rem] bg-white text-primary flex items-center justify-center ring-8 ring-primary/[0.03]">
                  <CalendarIcon className="h-8 w-8" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="h-8 px-4 rounded-full bg-primary text-white font-black uppercase tracking-widest text-[10px]">
                    {selectedDay ? getTasksForDay(selectedDay).length : 0} Tasks
                  </Badge>
                  <NewTaskDialog 
                    projectId={projectId}
                    initialDeadline={selectedDay || undefined}
                    onTaskCreated={onRefreshTasks}
                    trigger={
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-3 rounded-full bg-slate-800 text-white text-[10px] font-black uppercase hover:bg-slate-700 flex items-center gap-1 border-none"
                      >
                        <Plus className="h-3 w-3" /> Add Task
                      </Button>
                    }
                  />
                </div>
              </div>
              <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">
                {selectedDay ? format(selectedDay, 'dd MMMM', { locale: vi }) : ''}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium leading-relaxed mt-1">
                {selectedDay ? format(selectedDay, 'eeee', { locale: vi }) : ''}
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="max-h-[60vh] px-8 pb-8">
            <div className="space-y-4">
              {selectedDay && getTasksForDay(selectedDay).length > 0 ? (
                getTasksForDay(selectedDay).map((task: Task) => (
                  <div
                    key={task.id}
                    onClick={() => {
                      setSelectedTask(task)
                      setSelectedDay(null)
                    }}
                    className="p-5 rounded-[2rem] bg-white/60 hover:bg-slate-50 border border-white hover:border-primary/20 transition-all duration-300 cursor-pointer group relative overflow-hidden"
                  >


                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 relative z-10 w-full">
                      <div className="flex flex-col pr-6 max-w-[70%]">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn("shrink-0",
                            getPriorityInfo(task.priority).text
                          )}>
                            {(() => {
                              const PInfo = getPriorityInfo(task.priority);
                              const Icon = PInfo.icon;
                              return <Icon className="h-4 w-4 fill-current" />
                            })()}
                          </div>
                          <h4 className={cn("font-bold group-hover:text-primary transition-colors text-base leading-tight truncate",
                            task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'
                          )}>
                            {task.name}
                          </h4>
                        </div>
                        {task.projects && (
                          <Link 
                            href={`/projects/${task.project_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-6 hover:text-primary hover:underline cursor-pointer transition-colors"
                          >
                            <Circle className="h-2 w-2 text-primary fill-primary" />
                            <span className="truncate">{task.projects.name}</span>
                          </Link>
                        )}
                        {task.task_groups && (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-6 mt-1.5">
                            <ListTodo className="h-2.5 w-2.5 text-slate-400" />
                            <span className="truncate">{task.task_groups.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border-none",
                          task.status === 'todo' ? 'bg-slate-200/50 text-slate-500' :
                            task.status === 'inprogress' ? 'bg-sky-500/10 text-sky-600' :
                              task.status === 'pending' ? 'bg-orange-500/10 text-orange-600' :
                                task.status === 'done' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-500'
                        )}>
                          {task.status === 'todo' ? 'To Do' : task.status === 'inprogress' ? 'Doing' : task.status === 'pending' ? 'Pending' : task.status === 'done' ? 'Done' : task.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-white/20 rounded-[2.5rem] border-2 border-dashed border-white/60 flex flex-col items-center justify-center space-y-4">
                  <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center">
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
