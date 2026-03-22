'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { format, subDays, startOfWeek, addDays, isFuture, isToday as isDateToday } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { Card } from "@/components/ui/card"
import { cn } from '@/lib/utils'
import { CARD_SOLID, LABEL_XS } from '@/constants/ui-tokens'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Task } from '@/hooks/use-tasks'
import { useSidebar } from '@/components/ui/sidebar'

interface TaskCompletionHeatmapProps {
  tasks: Task[]
  weeksBack?: number
  className?: string
}

export function TaskCompletionHeatmap({ tasks, weeksBack = 52, className }: TaskCompletionHeatmapProps) {
  const { state: sidebarState } = useSidebar()
  const [containerWidth, setContainerWidth] = useState(1000)
  const [rangeWeeks, setRangeWeeks] = useState(weeksBack)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Cell width = 12px + 3px gap = 15px. 
  // Labels/Card Padding: p-8 (32px left/right) + Day Labels (ml-8 = 32px + gap-2 = 8px) = ~120px safety area.
  const maxWidthForGrid = Math.max(containerWidth - 110, 0)
  const maxPossibleWeeks = Math.floor(maxWidthForGrid / 15)
  const effectiveWeeks = Math.max(Math.min(rangeWeeks, maxPossibleWeeks), 4)

  const { grid, maxCount, totalDone, monthLabels } = useMemo(() => {
    const doneTasks = tasks.filter(t => t.status === 'done' && t.updated_at)
    const tasksByDate: Record<string, Task[]> = {}
    
    doneTasks.forEach(t => {
      const day = format(new Date(t.updated_at), 'yyyy-MM-dd')
      if (!tasksByDate[day]) tasksByDate[day] = []
      tasksByDate[day].push(t)
    })

    const today = new Date()
    const endGrid = addDays(startOfWeek(today, { weekStartsOn: 1 }), 6)
    const startGrid = subDays(endGrid, (effectiveWeeks * 7) - 1)

    const grid: Array<{ date: Date; dateStr: string; count: number; dayOfWeek: number; tasks: Task[] }> = []
    const monthLabels: Array<{ label: string; offset: number }> = []
    let lastMonth = -1

    for (let i = 0; i < effectiveWeeks * 7; i++) {
      const date = addDays(startGrid, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayTasks = tasksByDate[dateStr] ?? []
      grid.push({ 
        date, 
        dateStr, 
        count: dayTasks.length,
        dayOfWeek: date.getDay(),
        tasks: dayTasks
      })

      // Month labels (at the start of each week if month changes)
      if (i % 7 === 0) {
        const month = date.getMonth()
        if (month !== lastMonth) {
          // If the last month label is too close (< 4 weeks gap), don't add this one
          const lastLabel = monthLabels[monthLabels.length - 1]
          if (!lastLabel || (Math.floor(i/7) - lastLabel.offset >= 4)) {
            monthLabels.push({ 
              label: format(date, 'MMM', { locale: vi }), 
              offset: Math.floor(i / 7) 
            })
            lastMonth = month
          }
        }
      }
    }

    const maxCount = Math.max(...Object.values(tasksByDate).map(t => t.length), 1)
    const totalDone = doneTasks.length

    return { grid, maxCount, totalDone, monthLabels }
  }, [tasks, effectiveWeeks])

  const getCellClass = (count: number): string => {
    if (count === 0) return 'bg-slate-100'
    if (count <= maxCount * 0.25) return 'bg-emerald-200'
    if (count <= maxCount * 0.50) return 'bg-emerald-400'
    if (count <= maxCount * 0.75) return 'bg-emerald-500'
    return 'bg-emerald-600'
  }

  if (totalDone === 0 && tasks.length === 0) return null

  return (
    <Card className={cn(CARD_SOLID, "p-8", className)}>
      <div ref={containerRef} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <h4 className="text-xl font-bold text-slate-800 whitespace-nowrap">Hoàn thành</h4>
            <div className="flex items-center gap-4">
              {[
                { label: '3M', weeks: 13 },
                { label: '6M', weeks: 26 },
                { label: '1Y', weeks: 52 }
              ].map((r) => (
                <button
                  key={r.weeks}
                  onClick={() => setRangeWeeks(r.weeks)}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative py-1",
                    rangeWeeks === r.weeks 
                      ? "text-primary" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {r.label}
                  {rangeWeeks === r.weeks && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full transition-all duration-300" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black text-emerald-500 leading-none">{totalDone}</p>
            <p className={LABEL_XS}>Tasks xong</p>
          </div>
        </div>

        <TooltipProvider delay={0}>
          <div className="relative">
            {/* Month Labels */}
            <div className="flex ml-8 mb-2 h-4 relative">
              {monthLabels.map((ml, idx) => (
                <span 
                  key={idx} 
                  className="absolute text-[9px] font-black text-slate-400 uppercase tracking-tighter"
                  style={{ left: `${ml.offset * 15}px` }}
                >
                  {ml.label}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              {/* Day Labels */}
              <div className="flex flex-col justify-between h-[105px] py-0.5">
                <span className="text-[9px] font-black text-slate-300 uppercase w-6">Mon</span>
                <span className="text-[9px] font-black text-slate-300 uppercase w-6">Wed</span>
                <span className="text-[9px] font-black text-slate-300 uppercase w-6">Fri</span>
              </div>

              {/* Grid */}
              <div 
                className="grid grid-rows-7 grid-flow-col gap-[3px]"
                style={{ gridTemplateColumns: `repeat(${effectiveWeeks}, 12px)` }}
              >
                {grid.map((cell, idx) => {
                  const isFutureDate = isFuture(cell.date) && !isDateToday(cell.date)
                  
                  return (
                    <Tooltip key={idx}>
                      <TooltipTrigger>
                        <div 
                          className={cn(
                            "w-3 h-3 rounded-[2px] transition-all duration-300 hover:scale-125",
                            isFutureDate ? "bg-slate-50 opacity-20" : getCellClass(cell.count)
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="rounded-2xl border-none glass-premium p-4 min-w-[180px] space-y-3">
                        <div className="flex items-center justify-between border-b border-white/20 pb-2">
                          <span className="text-[10px] font-black text-slate-400 capitalize">
                            {format(cell.date, 'EEEE, dd MMM', { locale: vi })}
                          </span>
                          <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {cell.count} done
                          </span>
                        </div>
                        {cell.tasks.length > 0 ? (
                          <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                            {cell.tasks.slice(0, 5).map(t => (
                              <div key={t.id} className="text-[10px] font-bold text-slate-700 truncate flex items-center gap-2">
                                <div className="h-1 w-1 rounded-full bg-emerald-400" />
                                {t.name}
                              </div>
                            ))}
                            {cell.tasks.length > 5 && (
                              <p className="text-[9px] font-bold text-slate-400 italic pl-3">
                                + {cell.tasks.length - 5} tasks khác
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] font-bold text-slate-400 italic text-center py-2">
                            Không có dữ liệu
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          </div>
        </TooltipProvider>

        <div className="flex items-center justify-end gap-2 mt-6">
          <span className="text-[10px] font-bold text-slate-400">Less</span>
          <div className="flex gap-[3px]">
            <div className="w-3 h-3 rounded-[2px] bg-slate-100" />
            <div className="w-3 h-3 rounded-[2px] bg-emerald-200" />
            <div className="w-3 h-3 rounded-[2px] bg-emerald-400" />
            <div className="w-3 h-3 rounded-[2px] bg-emerald-500" />
            <div className="w-3 h-3 rounded-[2px] bg-emerald-600" />
          </div>
          <span className="text-[10px] font-bold text-slate-400">More</span>
        </div>
      </div>
    </Card>
  )
}
