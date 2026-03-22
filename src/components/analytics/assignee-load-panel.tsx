'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { UserX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LABEL_XS } from '@/constants/ui-tokens'

interface AssigneeStats {
  name: string
  role?: string
  total: number
  done: number
  inprogress: number
  todo: number
  critical: number
}

interface AssigneeLoadPanelProps {
  tasks: Array<{
    assignee_id: string | null
    assignees?: { full_name: string; role?: string } | null
    status: 'todo' | 'inprogress' | 'pending' | 'done'
    priority: 'low' | 'medium' | 'high' | 'critical'
  }>
}

function stringToHslColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return `hsl(${Math.abs(hash) % 360}, 55%, 60%)`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function AssigneeLoadPanel({ tasks }: AssigneeLoadPanelProps) {
  const assigneeStats = useMemo(() => {
    const map = tasks.reduce((acc, task) => {
      const key = task.assignee_id ?? '__unassigned__'
      const name = task.assignees?.full_name ?? 'Chưa phân công'
      
      if (!acc[key]) {
        acc[key] = { 
          name, 
          role: task.assignees?.role, 
          total: 0, 
          done: 0, 
          inprogress: 0, 
          todo: 0, 
          critical: 0 
        }
      }
      
      acc[key].total++
      if (task.status === 'done') {
        acc[key].done++
      } else if (task.status === 'inprogress') {
        acc[key].inprogress++
      } else {
        // todo or pending
        acc[key].todo++
      }

      if (task.priority === 'critical' && task.status !== 'done') {
        acc[key].critical++
      }
      
      return acc
    }, {} as Record<string, AssigneeStats>)

    return Object.entries(map)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => {
        if (a.id === '__unassigned__') return 1
        if (b.id === '__unassigned__') return -1
        if (b.critical !== a.critical) return b.critical - a.critical
        if (b.inprogress !== a.inprogress) return b.inprogress - a.inprogress
        return a.name.localeCompare(b.name)
      })
  }, [tasks])

  if (tasks.length === 0 || assigneeStats.length === 0) return null
  // Hide if only unassigned exists? Prompt says "Ẩn nếu không có task nào có assignee"
  const hasAssignee = tasks.some(t => t.assignee_id !== null)
  if (!hasAssignee) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <span className={LABEL_XS}>Phân bổ nhân sự</span>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {assigneeStats.filter(s => s.id !== '__unassigned__').length} người
        </span>
      </div>

      <Card className="rounded-[2rem] border-none bg-white/40 shadow-sm overflow-hidden">
        <CardContent className="p-2 space-y-1">
          {assigneeStats.map((stats) => {
            const isUnassigned = stats.id === '__unassigned__'
            const donePct = (stats.done / stats.total) * 100
            const inprogressPct = (stats.inprogress / stats.total) * 100
            const todoPct = (stats.todo / stats.total) * 100

            return (
              <div 
                key={stats.id}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white transition-all group cursor-default"
              >
                {isUnassigned ? (
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <UserX className="h-5 w-5" />
                  </div>
                ) : (
                  <div 
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: stringToHslColor(stats.name) }}
                  >
                    {getInitials(stats.name)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="truncate">
                      <p className={cn(
                        "text-xs font-bold truncate",
                        isUnassigned ? "text-slate-400 italic" : "text-slate-700"
                      )}>
                        {stats.name}
                      </p>
                      {stats.role && (
                        <p className="text-[9px] text-slate-400 font-medium truncate uppercase tracking-tighter">
                          {stats.role}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {stats.critical > 0 && (
                        <span className="h-5 px-1.5 rounded-lg bg-red-100 text-red-600 text-[10px] font-black flex items-center gap-0.5 animate-pulse">
                          ⚡{stats.critical}
                        </span>
                      )}
                      <span className="text-[10px] font-black text-slate-400">{stats.total}</span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-emerald-400 transition-all duration-700"
                      style={{ width: `${donePct}%` }}
                    />
                    <div 
                      className="h-full bg-blue-400 transition-all duration-700"
                      style={{ width: `${inprogressPct}%` }}
                    />
                    <div 
                      className="h-full bg-slate-200 transition-all duration-700"
                      style={{ width: `${todoPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
