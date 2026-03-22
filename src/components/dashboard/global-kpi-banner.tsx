import { useMemo, useState } from 'react'
import { isPast, isToday, format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { FolderOpen, Search, AlertTriangle, Zap, Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CARD_GLASS, LABEL_XS } from '@/constants/ui-tokens'
import { Project } from '@/hooks/use-projects'
import { Task } from '@/hooks/use-tasks'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from 'next/navigation'

interface GlobalKPIBannerProps {
  projects: Project[]
  tasks: Task[]
  className?: string
  variant?: 'default' | 'compact'
}

export function GlobalKPIBanner({ projects, tasks, className, variant = 'default' }: GlobalKPIBannerProps) {
  const router = useRouter()
  const [detailKpi, setDetailKpi] = useState<string | null>(null)

  const stats = useMemo(() => {
    const activeProjectsList = projects.filter(p => (p.status || '').toLowerCase() !== 'archive' && !p.deleted_at)
    
    const overdueTasksList = tasks.filter(t =>
      t.status !== 'done' && t.deadline &&
      isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline))
    )

    const criticalOpenTasksList = tasks.filter(t =>
      t.priority === 'critical' && t.status !== 'done'
    )

    return {
      activeProjects: activeProjectsList.length,
      activeProjectsList,
      overdueTasks: overdueTasksList.length,
      overdueTasksList,
      criticalOpenTasks: criticalOpenTasksList.length,
      criticalOpenTasksList,
    }
  }, [projects, tasks])

  const kpis = [
    {
      id: 'active',
      label: 'Projects hoạt động',
      value: stats.activeProjects,
      items: stats.activeProjectsList,
      icon: FolderOpen,
      color: 'text-blue-600',
      isCheckable: false
    },
    {
      id: 'overdue',
      label: 'Tasks quá hạn',
      value: stats.overdueTasks,
      items: stats.overdueTasksList,
      icon: AlertTriangle,
      color: stats.overdueTasks > 0 ? 'text-red-500' : 'text-slate-300',
      isCheckable: true
    },
    {
      id: 'critical',
      label: 'Tasks ưu tiên',
      value: stats.criticalOpenTasks,
      items: stats.criticalOpenTasksList,
      icon: Zap,
      color: stats.criticalOpenTasks > 0 ? 'text-red-500' : 'text-slate-300',
      isCheckable: true
    }
  ]

  const selectedKpi = kpis.find(k => k.id === detailKpi)

  return (
    <>
      <div className={cn(
        "grid gap-4",
        variant === 'compact' ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
        className
      )}>
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          const isCompleted = kpi.isCheckable && kpi.value === 0
          const isCompact = variant === 'compact'
          
          return (
            <Card 
              key={kpi.id} 
              onClick={() => kpi.value > 0 && setDetailKpi(kpi.id)}
              className={cn(
                CARD_GLASS, 
                "transition-all group cursor-pointer active:scale-95 border-white/40",
                isCompact ? "p-3" : "p-6",
                kpi.value > 0 ? "hover:scale-[1.02] hover:bg-white/60" : "opacity-80 cursor-default"
              )}
            >
              <CardContent className={cn("p-0", isCompact ? "space-y-2" : "space-y-3")}>
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "rounded-xl bg-white/50 backdrop-blur-sm transition-colors group-hover:bg-white", 
                    kpi.color,
                    isCompact ? "p-1.5" : "p-2"
                  )}>
                    <Icon className={cn(isCompact ? "h-3.5 w-3.5" : "h-5 w-5")} />
                  </div>
                  <span className={cn(LABEL_XS, isCompact && "text-[9px] uppercase tracking-wider")}>{kpi.label}</span>
                </div>
                
                <div className="flex items-baseline justify-between group-hover:pr-1 transition-all">
                  {isCompleted ? (
                    <Check className={cn("text-emerald-400 stroke-[4px]", isCompact ? "h-5 w-5" : "h-8 w-8")} />
                  ) : (
                    <span className={cn("font-black tracking-tighter", kpi.color, isCompact ? "text-xl" : "text-3xl")}>
                      {kpi.value}
                    </span>
                  )}
                  {kpi.value > 0 && (
                    <ChevronRight className={cn("text-slate-300 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0", isCompact ? "h-3.5 w-3.5" : "h-5 w-5")} />
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!detailKpi} onOpenChange={(open) => !open && setDetailKpi(null)}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none glass-premium p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-3">
              {selectedKpi && (
                <>
                  <div className={cn("p-2 rounded-xl bg-white/80", selectedKpi.color)}>
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
                      const projectId = isItemProject ? item.id : item.project_id
                      router.push(`/projects/${projectId}`)
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
