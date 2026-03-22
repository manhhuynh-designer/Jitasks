'use client'

import { useMemo } from 'react'
import { Card } from "@/components/ui/card"
import { cn } from '@/lib/utils'
import { CARD_SOLID, STATUS_CONFIG } from '@/constants/ui-tokens'
import { getStatusInfo, TaskStatus } from '@/lib/status-utils'
import { Task } from '@/hooks/use-tasks'

interface TaskStatusDonutProps {
  tasks: Task[]
  className?: string
  variant?: 'default' | 'compact'
}

export function TaskStatusDonut({ tasks, className, variant = 'default' }: TaskStatusDonutProps) {
  const { stats, total } = useMemo(() => {
    const counts = {
      todo: 0,
      inprogress: 0,
      pending: 0,
      done: 0
    }
    
    tasks.forEach(t => {
      if (counts.hasOwnProperty(t.status)) {
        counts[t.status as keyof typeof counts]++
      }
    })
    
    const total = tasks.length
    
    // Status in specific order for the chart
    const order: TaskStatus[] = ['inprogress', 'todo', 'pending', 'done']
    
    let currentOffset = 0
    const stats = order.map(status => {
      const count = counts[status as keyof typeof counts]
      const percentage = total > 0 ? (count / total) * 100 : 0
      const offset = currentOffset
      currentOffset += percentage
      
      return {
        status,
        count,
        percentage,
        offset,
        info: getStatusInfo(status)
      }
    })
    
    return { stats, total }
  }, [tasks])

  // Donut SVG parameters
  const radius = 35
  const circumference = 2 * Math.PI * radius

  if (tasks.length === 0) return null

  const isCompact = variant === 'compact'

  return (
    <Card className={cn(CARD_SOLID, isCompact ? "p-4" : "p-8", className)}>
      <div className="flex flex-col h-full">
        {!isCompact && (
          <div className="mb-8">
            <h4 className="text-xl font-bold text-slate-800 tracking-tight">Phân bổ công việc</h4>
            <p className="text-xs font-bold text-slate-400 uppercase ">Theo trạng thái</p>
          </div>
        )}

        <div className={cn(
          "flex-1 flex flex-row items-center",
          isCompact ? "justify-between gap-4 px-1" : "justify-around gap-6 px-4"
        )}>
          {/* Donut Chart */}
          <div className={cn("relative shrink-0", isCompact ? "w-28 h-28" : "w-48 h-48")}>
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth="12"
              />
              
              {/* Segments */}
              {total > 0 && stats.map((stat, idx) => (
                <circle
                  key={stat.status}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={STATUS_CONFIG[stat.status as keyof typeof STATUS_CONFIG]?.hex || '#64748b'}
                  strokeWidth="12"
                  strokeDasharray={`${(stat.percentage * circumference) / 100} ${circumference}`}
                  strokeDashoffset={-(stat.offset * circumference) / 100}
                  strokeLinecap="butt"
                  className="transition-all duration-1000 ease-out hover:opacity-80 cursor-pointer"
                />
              ))}
            </svg>
            
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className={cn("font-black text-slate-800 leading-none", isCompact ? "text-lg" : "text-2xl")}>{total}</span>
              <span className={cn("font-black text-slate-400 uppercase tracking-widest mt-0.5", isCompact ? "text-[6px]" : "text-[8px]")}>Tổng cộng</span>
            </div>
          </div>

          {/* Legend - Tighter list on the side */}
          <div className={cn("shrink-0 flex flex-col", isCompact ? "w-[100px] gap-y-2" : "w-[140px] gap-y-4")}>
            {stats.map(stat => (
              <div key={stat.status} className="flex items-center justify-between group cursor-help">
                <div className="flex items-center gap-2">
                  <div className={cn("rounded-full", isCompact ? "h-1 w-1" : "h-1.5 w-1.5", stat.info.color)} />
                  <span className={cn("font-bold text-slate-500 group-hover:text-slate-800 transition-colors truncate", isCompact ? "text-[9px]" : "text-[11px]")}>{stat.info.label}</span>
                </div>
                <span className={cn("font-black text-slate-400 ml-2", isCompact ? "text-[9px]" : "text-[11px]")}>{stat.count}</span>
              </div>
          ))}
        </div>
        </div>
      </div>
    </Card>
  )
}
