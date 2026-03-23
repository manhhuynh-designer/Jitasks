'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { UserX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AssigneeStats {
  id: string
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

export function AssigneeLoadPanel({ tasks }: AssigneeLoadPanelProps) {
  const assigneeStats = useMemo(() => {
    const map = tasks.reduce((acc, task) => {
      const key = task.assignee_id ?? '__unassigned__'
      const name = task.assignees?.full_name ?? 'Chưa phân công'
      
      if (!acc[key]) {
        acc[key] = { 
          id: key,
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
        acc[key].todo++
      }

      if (task.priority === 'critical' && task.status !== 'done') {
        acc[key].critical++
      }
      
      return acc
    }, {} as Record<string, AssigneeStats>)

    return Object.values(map)
      .sort((a, b) => {
        if (a.id === '__unassigned__') return 1
        if (b.id === '__unassigned__') return -1
        if (b.critical !== a.critical) return b.critical - a.critical
        if (b.inprogress !== a.inprogress) return b.inprogress - a.inprogress
        return a.name.localeCompare(b.name)
      })
  }, [tasks])

  if (tasks.length === 0 || assigneeStats.length === 0) return null
  
  const hasAssignee = tasks.some(t => t.assignee_id !== null)
  if (!hasAssignee) return null

  const assignees = assigneeStats.filter(s => s.id !== '__unassigned__')
  const unassigned = assigneeStats.find(s => s.id === '__unassigned__')

  return (
    <Card className="rounded-[2.5rem] border-none bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phân bổ nhân sự</p>
          <span className="text-[10px] font-bold text-slate-300">{assignees.length} người</span>
        </div>

        {/* Rows */}
        <div className="px-3 pb-4 space-y-0.5">
          {assignees.map(a => (
            <div key={a.id} className="px-3 py-2.5 rounded-2xl">
              <div className="flex items-center gap-3">
                {/* Avatar: h-7 w-7 rounded-full */}
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0"
                  style={{ background: stringToHslColor(a.name) }}>
                  {a.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 truncate">{a.name}</p>
                  {a.role && <p className="text-[10px] font-medium text-slate-400">{a.role}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {a.critical > 0 && (
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md border bg-red-50 text-red-500 border-red-100">
                      ⚡{a.critical}
                    </span>
                  )}
                  <span className="text-[10px] font-black text-slate-400 tabular-nums">{a.total}</span>
                </div>
              </div>
              {/* Stacked bar: h-1 */}
              <div className="flex h-1 mt-2 rounded-full overflow-hidden bg-slate-100 mx-0.5">
                <div className="bg-emerald-400 transition-all duration-500" style={{ width: `${(a.done/a.total)*100}%` }} />
                <div className="bg-blue-400 transition-all duration-500"    style={{ width: `${(a.inprogress/a.total)*100}%` }} />
              </div>
            </div>
          ))}

          {/* Unassigned */}
          {unassigned && unassigned.total > 0 && (
            <div className="px-3 py-2.5 rounded-2xl border border-dashed border-slate-100 mt-2">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <UserX className="h-3.5 w-3.5 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-400 italic flex-1">Chưa phân công</p>
                <span className="text-[10px] font-black text-slate-300 tabular-nums">{unassigned.total}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
