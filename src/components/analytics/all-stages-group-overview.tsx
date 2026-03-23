'use client'

import { useMemo } from 'react'
import { isPast, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { getDeadlineLevel, DEADLINE_LEVELS } from '@/constants/ui-tokens'

interface AllStagesGroupOverviewProps {
  categories: Array<{ id: string; name: string; color: string }>
  taskGroups: Array<{
    id: string
    name: string
    category_id: string
  }>
  tasks: Array<{
    id: string
    task_group_id: string | null
    category_id: string | null
    status: 'todo' | 'inprogress' | 'pending' | 'done'
    priority: string
    deadline: string | null
    name: string
  }>
  activeCategoryId: string | null
  onGroupClick: (groupId: string, categoryId: string) => void
}

export function AllStagesGroupOverview({
  categories,
  taskGroups,
  tasks,
  activeCategoryId,
  onGroupClick,
}: AllStagesGroupOverviewProps) {
  
  const activeCategory = categories.find(c => c.id === activeCategoryId)

  const activeGroups = useMemo(() => taskGroups
    .filter(g => g.category_id === activeCategoryId)
    .map(g => {
      const gt         = tasks.filter(t => t.task_group_id === g.id)
      const done       = gt.filter(t => t.status === 'done').length
      const total      = gt.length
      const inprogress = gt.filter(t => t.status === 'inprogress').length
      const overdue    = gt.filter(t => t.status !== 'done' && t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline))).length
      const critical   = gt.filter(t => t.priority === 'critical' && t.status !== 'done').length
      const nearest    = gt.filter(t => t.status !== 'done' && t.deadline)
        .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0]?.deadline ?? null
      return { ...g, done, total, inprogress, overdue, critical, nearest }
    })
    .sort((a, b) => {
      const aU = (a.overdue + a.critical > 0) ? 0 : 1
      const bU = (b.overdue + b.critical > 0) ? 0 : 1
      if (aU !== bU) return aU - bU
      return b.inprogress - a.inprogress
    })
  , [taskGroups, activeCategoryId, tasks])

  if (activeGroups.length === 0) return null

  return (
    <Card className="rounded-[2.5rem] border-none bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <div className="flex items-center gap-2">
            {activeCategory?.color && (
              <div className={cn("h-2 w-2 rounded-full", activeCategory.color)} />
            )}
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Nhóm — {activeCategory?.name ?? 'Giai đoạn hiện tại'}
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-300">{activeGroups.length} nhóm</span>
        </div>

        {/* Group rows */}
        <div className="px-3 pb-4 space-y-0.5">
          {activeGroups.map(g => (
            <button
              key={g.id}
              onClick={() => onGroupClick(g.id, activeCategoryId!)}
              className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.99]"
            >
              {/* Row 1: badges + tên + fraction */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {g.overdue > 0 && (
                    <span className="text-[8px] font-black px-1 py-0.5 rounded bg-rose-50 text-rose-500 border border-rose-100 shrink-0">
                      {g.overdue} trễ
                    </span>
                  )}
                  {g.critical > 0 && g.overdue === 0 && (
                    <span className="text-[8px] font-black px-1 py-0.5 rounded bg-red-50 text-red-500 border border-red-100 shrink-0">
                      ⚡{g.critical}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-slate-700 truncate">{g.name}</span>
                </div>
                <span className="text-[10px] font-black text-slate-400 tabular-nums shrink-0">
                  {g.done}/{g.total}
                </span>
              </div>

              {/* Row 2: stacked bar + deadline */}
              {g.total > 0 && (
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex h-1 flex-1 rounded-full overflow-hidden bg-slate-100">
                    <div className="bg-emerald-400 transition-all duration-500" style={{ width: `${(g.done/g.total)*100}%` }} />
                    <div className="bg-blue-400 transition-all duration-500"    style={{ width: `${(g.inprogress/g.total)*100}%` }} />
                  </div>
                  {g.nearest ? (() => {
                    const { level, label } = getDeadlineLevel(g.nearest)
                    const s = DEADLINE_LEVELS[level as keyof typeof DEADLINE_LEVELS]
                    return (
                      <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md border shrink-0", s.bg, s.text, s.border)}>
                        {label}
                      </span>
                    )
                  })() : <span className="text-[9px] text-slate-200 shrink-0">–</span>}
                </div>
              )}
              {g.total === 0 && (
                <p className="text-[10px] text-slate-300 italic mt-0.5">Chưa có task</p>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
