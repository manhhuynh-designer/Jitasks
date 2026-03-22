import React, { useMemo, useState } from 'react'
import { 
  FolderOpen, 
  AlertTriangle, 
  Zap, 
  TrendingUp, 
  CheckCircle2,
  ChevronRight,
  Search,
  Check
} from 'lucide-react'
import { isPast, isToday, isThisWeek, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { STATUS_CONFIG, LABEL_XS } from '@/constants/ui-tokens'

interface StatsBarProps {
  projects: any[]
  tasks: any[]
  selectionTasks: any[]
  onTaskClick?: (task: any) => void
  className?: string
}

export function StatsBar({ projects, tasks, selectionTasks, onTaskClick, className }: StatsBarProps) {
  const router = useRouter()
  const [detailKpi, setDetailKpi] = useState<string | null>(null)

  const kpisData = useMemo(() => {
    const activeProjectsList = projects
    
    const overdueTasksList = selectionTasks.filter(t =>
      t.status !== 'done' &&
      t.deadline &&
      isPast(new Date(t.deadline)) &&
      !isToday(new Date(t.deadline))
    )

    const criticalTasksList = selectionTasks.filter(t =>
      t.priority === 'critical' && t.status !== 'done'
    )

    const doneThisWeekList = selectionTasks.filter(t =>
      t.status === 'done' &&
      t.deadline &&
      isThisWeek(new Date(t.deadline), { weekStartsOn: 1 })
    )

    return {
      active: {
        id: 'active',
        label: 'Projects hoạt động',
        value: activeProjectsList.length,
        items: activeProjectsList,
        icon: FolderOpen,
        valueColor: 'text-slate-800',
        iconBg: 'bg-slate-100/80',
        isCheckable: false
      },
      overdue: {
        id: 'overdue',
        label: 'Tasks quá hạn',
        value: overdueTasksList.length,
        items: overdueTasksList,
        icon: overdueTasksList.length > 0 ? AlertTriangle : CheckCircle2,
        valueColor: overdueTasksList.length > 0 ? "text-red-500" : "text-emerald-500",
        iconBg: overdueTasksList.length > 0 ? "bg-red-50" : "bg-emerald-50",
        isCheckable: true
      },
      critical: {
        id: 'critical',
        label: 'Tasks ưu tiên',
        value: criticalTasksList.length,
        items: criticalTasksList,
        icon: Zap,
        valueColor: criticalTasksList.length > 0 ? "text-red-500" : "text-slate-300",
        iconBg: criticalTasksList.length > 0 ? "bg-red-50" : "bg-slate-50",
        isCheckable: true
      },
      done: {
        id: 'done',
        label: 'Hoàn thành tuần này',
        value: doneThisWeekList.length,
        items: doneThisWeekList,
        icon: TrendingUp,
        valueColor: 'text-emerald-600',
        iconBg: 'bg-emerald-50',
        isCheckable: false
      }
    }
  }, [projects, selectionTasks])

  const selectedKpi = detailKpi ? (kpisData as any)[detailKpi] : null

  const { statusCounts, total } = useMemo(() => {
    const counts = {
      inprogress: selectionTasks.filter(t => t.status === 'inprogress').length,
      todo:       selectionTasks.filter(t => t.status === 'todo').length,
      pending:    selectionTasks.filter(t => t.status === 'pending').length,
      done:       selectionTasks.filter(t => t.status === 'done').length,
    }
    const total = selectionTasks.length
    return { statusCounts: counts, total }
  }, [selectionTasks])

  return (
    <>
      <div className={cn(
        "rounded-[2.5rem] bg-white shadow-xl shadow-slate-200/50 overflow-hidden",
        "flex flex-col md:flex-row md:divide-x divide-slate-100",
        className
      )}>
        {/* KPI Tiles Section */}
        <div className="grid grid-cols-2 md:flex md:flex-[2.5] lg:flex-[3] divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {Object.values(kpisData).map((kpi) => (
            <KPITile 
              key={kpi.id}
              icon={kpi.icon} 
              label={kpi.label} 
              value={kpi.isCheckable && kpi.value === 0 ? '✓' : kpi.value}
              valueColor={kpi.valueColor}
              iconBg={kpi.iconBg}
              onClick={() => kpi.value > 0 && setDetailKpi(kpi.id)}
              className={kpi.value > 0 ? "cursor-pointer" : "cursor-default opacity-80"}
            />
          ))}
        </div>

        {/* Donut Section */}
        <div className="flex-[2] px-8 py-5 flex flex-col justify-center min-w-0">
          <p className={cn(LABEL_XS, "mb-3 flex items-center gap-1.5")}>
            Phân bổ Tasks
          </p>
          
          <div className="flex items-center gap-10">
            <DonutChart total={total} counts={statusCounts} />
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
              {(['inprogress', 'todo', 'pending', 'done'] as const).map(key => (
                <div key={key} className="flex items-center justify-between gap-4 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-2 w-2 rounded-full shrink-0" 
                      style={{ background: STATUS_CONFIG[key].hex }} 
                    />
                    <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                      {STATUS_CONFIG[key].label}
                    </span>
                  </div>
                  <span className="text-[11px] font-black text-slate-700 tabular-nums">
                    {statusCounts[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!detailKpi} onOpenChange={(open) => !open && setDetailKpi(null)}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none glass-premium p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-3">
              {selectedKpi && (
                <>
                  <div className={cn("p-2 rounded-xl bg-white/80", selectedKpi.valueColor)}>
                    <selectedKpi.icon className="h-5 w-5" />
                  </div>
                  {selectedKpi.label}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              {selectedKpi?.items.map((item: any) => {
                const isItemProject = 'status' in item && 'name' in item && !('priority' in item)
                
                return (
                  <div 
                    key={item.id}
                    onClick={() => {
                      if (!isItemProject && onTaskClick) {
                        onTaskClick(item)
                      } else {
                        const projectId = isItemProject ? item.id : item.project_id
                        router.push(`/projects/${projectId}`)
                      }
                      setDetailKpi(null)
                    }}
                    className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/60 cursor-pointer group transition-all border border-transparent hover:border-white/40 active:scale-[0.98]"
                  >
                    <div className="space-y-1 min-w-0 flex-1 pr-4">
                      <p className="font-bold text-slate-800 truncate group-hover:text-primary transition-colors">
                        {item.name}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">
                        {isItemProject 
                          ? (item.suppliers?.name || 'Chưa định danh')
                          : (item.projects?.name || 'Đang tải...')
                        }
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      {isItemProject ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter",
                            item.status === 'Active' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                          )}>
                            {item.status}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                           <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter",
                            item.priority === 'critical' ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                          )}>
                            {item.priority}
                          </span>
                          {item.deadline && (
                            <span className="text-[10px] font-bold text-slate-400 capitalize">
                              {format(new Date(item.deadline), 'dd MMM')}
                            </span>
                          )}
                        </div>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface KPITileProps {
  icon: React.ElementType
  value: number | string
  label: string
  valueColor: string
  iconBg: string
  onClick?: () => void
  className?: string
}

function KPITile({ icon: Icon, value, label, valueColor, iconBg, onClick, className }: KPITileProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex-1 min-w-0 px-6 py-5 flex flex-col gap-2 hover:bg-slate-50/50 transition-colors group relative overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none truncate pr-2">
          {label}
        </p>
        <div className={cn("h-7 w-7 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", iconBg)}>
          <Icon className={cn("h-3.5 w-3.5", valueColor.replace('text-', 'stroke-'))} />
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <p className={cn("text-3xl font-black tracking-tighter leading-none", valueColor)}>
          {value}
        </p>
        {onClick && (
          <ChevronRight className="h-4 w-4 text-slate-200 opacity-0 group-hover:opacity-100 group-hover:text-slate-400 transition-all -translate-x-1 group-hover:translate-x-0" />
        )}
      </div>
    </div>
  )
}

function DonutChart({ total, counts }: { total: number, counts: Record<string, number> }) {
  const radius = 29
  const circumference = 2 * Math.PI * radius
  
  const segments = useMemo(() => {
    if (total === 0) return []
    const order = ['inprogress', 'todo', 'pending', 'done'] as const
    let currentOffset = 0
    
    return order.map(key => {
      const percentage = (counts[key] / total) * 100
      const dashArray = `${(percentage * circumference) / 100} ${circumference}`
      const dashOffset = -(currentOffset * circumference) / 100
      currentOffset += percentage
      
      return { key, dashArray, dashOffset }
    })
  }, [total, counts, circumference])

  return (
    <div className="relative w-[72px] h-[72px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r={radius}
          fill="transparent"
          stroke="#f1f5f9"
          strokeWidth="10"
        />
        {total > 0 && segments.map(segment => (
          <circle
            key={segment.key}
            cx="50" cy="50" r={radius}
            fill="transparent"
            stroke={STATUS_CONFIG[segment.key].hex}
            strokeWidth="10"
            strokeDasharray={segment.dashArray}
            strokeDashoffset={segment.dashOffset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-black text-slate-800 leading-none">{total}</span>
        <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 mt-0.5">tasks</span>
      </div>
    </div>
  )
}
