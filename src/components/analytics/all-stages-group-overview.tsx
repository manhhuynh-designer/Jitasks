'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { LABEL_XS } from '@/constants/ui-tokens'
import { ChevronRight } from 'lucide-react'

interface GroupStats {
  id: string
  name: string
  category_id: string
  total: number
  done: number
  inprogress: number
  todo: number
}

interface AllStagesGroupOverviewProps {
  categories: Array<{ id: string; name: string; color: string }>
  taskGroups: Array<{
    id: string
    name: string
    category_id: string
  }>
  tasks: Array<{
    task_group_id: string | null
    category_id: string | null
    status: 'todo' | 'inprogress' | 'pending' | 'done'
    name: string
  }>
  activeCategoryId: string | null
  onGroupClick?: (groupId: string, categoryId: string) => void
}

export function AllStagesGroupOverview({
  categories,
  taskGroups,
  tasks,
  activeCategoryId,
  onGroupClick,
}: AllStagesGroupOverviewProps) {
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(categories.map(c => c.id)))

  const statsByCategory = useMemo(() => {
    const result = categories.map(cat => {
      // 1. Groups in this category
      const groups = taskGroups
        .filter(g => g.category_id === cat.id)
        .map(group => {
          const groupTasks = tasks.filter(t => t.task_group_id === group.id)
          const stats = groupTasks.reduce((acc, t) => {
            acc.total++
            if (t.status === 'done') acc.done++
            else if (t.status === 'inprogress') acc.inprogress++
            else acc.todo++
            return acc
          }, { total: 0, done: 0, inprogress: 0, todo: 0 })

          return {
            ...group,
            ...stats
          }
        })
      
      // 2. Ungrouped tasks in this category
      const ungroupedTasks = tasks.filter(t => 
        t.category_id === cat.id && 
        (!t.task_group_id || !taskGroups.find(g => g.id === t.task_group_id))
      )

      const ungroupedStats = ungroupedTasks.reduce((acc, t) => {
        acc.total++
        if (t.status === 'done') acc.done++
        else if (t.status === 'inprogress') acc.inprogress++
        else acc.todo++
        return acc
      }, { total: 0, done: 0, inprogress: 0, todo: 0 })

      return {
        ...cat,
        groups,
        ungrouped: ungroupedStats,
        hasContent: groups.length > 0 || ungroupedTasks.length > 0,
        totalItems: groups.length + (ungroupedTasks.length > 0 ? 1 : 0)
      }
    }).filter(cat => cat.hasContent)

    return result
  }, [categories, taskGroups, tasks])

  const toggleCat = (id: string) => {
    const next = new Set(openCats)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpenCats(next)
  }

  if (statsByCategory.length === 0) return null

  const totalItems = statsByCategory.reduce((sum, c) => sum + c.totalItems, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <span className={LABEL_XS}>Tất cả giai đoạn</span>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {totalItems} mục
        </span>
      </div>

      <div className="space-y-3">
        {statsByCategory.map((cat) => {
          const isOpen = openCats.has(cat.id)
          const isActive = cat.id === activeCategoryId

          return (
            <div key={cat.id} className="space-y-2">
              <button 
                onClick={() => toggleCat(cat.id)}
                className={cn(
                  "w-full flex items-center justify-between p-2 transition-all",
                  isActive ? "bg-primary/5 rounded-xl px-3" : "px-3"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn("h-1.5 w-1.5 rounded-full", cat.color)} />
                  <span className={cn(
                    "text-xs font-black uppercase tracking-wider",
                    isActive ? "text-primary" : "text-slate-600"
                  )}>
                    {cat.name}
                  </span>
                  <span className="text-[10px] font-bold text-slate-300">
                    {cat.totalItems}
                  </span>
                </div>
                <ChevronRight className={cn(
                  "h-3.5 w-3.5 text-slate-300 transition-transform duration-300",
                  isOpen && "rotate-90"
                )} />
              </button>

              <div 
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                )}
              >
                <div className="space-y-1 px-3">
                  {cat.groups.map((group) => {
                    const donePct = group.total > 0 ? (group.done / group.total) * 100 : 0
                    const inprogressPct = group.total > 0 ? (group.inprogress / group.total) * 100 : 0

                    return (
                      <div 
                        key={group.id}
                        onClick={() => onGroupClick?.(group.id, group.category_id)}
                        className="flex items-center justify-between h-10 px-2 rounded-xl hover:bg-white cursor-pointer group transition-all"
                      >
                        <span className="text-xs font-bold text-slate-500 truncate max-w-[120px] group-hover:text-slate-800 transition-colors">
                          {group.name}
                        </span>
                        
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-[80px] h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                            <div 
                              className="h-full bg-emerald-400"
                              style={{ width: `${donePct}%` }}
                            />
                            <div 
                              className="h-full bg-blue-400"
                              style={{ width: `${inprogressPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 w-8 text-right">
                            {group.done}/{group.total}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Ungrouped section if present */}
                  {cat.ungrouped.total > 0 && (
                    <div 
                      onClick={() => onGroupClick?.('ungrouped', cat.id)}
                      className="flex items-center justify-between h-10 px-2 rounded-xl hover:bg-white cursor-pointer group transition-all"
                    >
                      <span className="text-xs font-bold text-slate-400 italic group-hover:text-slate-800 transition-colors">
                        Chưa phân nhóm
                      </span>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-[80px] h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-emerald-400"
                            style={{ width: `${(cat.ungrouped.done / cat.ungrouped.total) * 100}%` }}
                          />
                          <div 
                            className="h-full bg-blue-400"
                            style={{ width: `${(cat.ungrouped.inprogress / cat.ungrouped.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 w-8 text-right">
                          {cat.ungrouped.done}/{cat.ungrouped.total}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
