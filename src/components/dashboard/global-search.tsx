'use client'

import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Search, Hash, Briefcase, Calendar, ChevronRight, X, Command } from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Project } from '@/hooks/use-projects'
import { Task } from '@/hooks/use-tasks'
import { format } from 'date-fns'

interface GlobalSearchProps {
  projects: Project[]
  tasks: Task[]
  onProjectClick?: (project: Project) => void
  onTaskClick?: (task: Task) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function GlobalSearch({ projects, tasks, onProjectClick, onTaskClick, open: propsOpen, onOpenChange }: GlobalSearchProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = propsOpen !== undefined ? propsOpen : internalOpen
  const setOpen = useCallback((v: boolean) => {
    if (onOpenChange) onOpenChange(v)
    else setInternalOpen(v)
  }, [onOpenChange])

  const [query, setQuery] = useState('')

  // Listen for Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, setOpen])

  // Search logic
  const searchResults = React.useMemo(() => {
    if (!query.trim()) return { projects: [], tasks: [] }
    const q = query.toLowerCase()
    
    const filteredProjects = projects.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.description?.toLowerCase().includes(q) ||
      p.suppliers?.name.toLowerCase().includes(q)
    ).slice(0, 5)

    const filteredTasks = tasks.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.description?.toLowerCase().includes(q)
    ).map(t => ({
      ...t,
      project: projects.find(p => p.id === t.project_id)
    })).slice(0, 10)

    return { projects: filteredProjects, tasks: filteredTasks }
  }, [query, projects, tasks])

  const handleSelect = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 border-none shadow-2xl max-w-2xl overflow-hidden bg-slate-50/95 backdrop-blur-xl">
        <div className="flex items-center border-b border-slate-200/60 px-6 h-16 group">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input
            autoFocus
            placeholder="Tìm kiếm dự án, công việc, nhà cung cấp..."
            className="flex-1 border-none bg-transparent h-full text-base font-medium focus-visible:ring-0 placeholder:text-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 shadow-sm">
            <Command className="h-3 w-3 text-slate-400" />
            <span className="text-[10px] font-black text-slate-400">K</span>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
          {!query && (
            <div className="p-8 text-center">
              <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Search className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Bắt đầu tìm kiếm thông tin...</p>
              <p className="text-xs text-slate-400 mt-2">Dự án • Công việc • Nhà cung cấp • Khách hàng</p>
            </div>
          )}

          {query && searchResults.projects.length === 0 && searchResults.tasks.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-sm font-bold text-slate-400 italic">Không tìm thấy kết quả cho "{query}"</p>
            </div>
          )}

          {searchResults.projects.length > 0 && (
            <div className="mb-4">
              <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dự án</div>
              <div className="space-y-1">
                {searchResults.projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { onProjectClick?.(p); handleSelect(); }}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white transition-all group text-left"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors truncate">{p.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="uppercase">{p.status}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span>{p.suppliers?.name || 'Chưa gán NCC'}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchResults.tasks.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Công việc</div>
              <div className="space-y-1">
                {searchResults.tasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { onTaskClick?.(t); handleSelect(); }}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white transition-all group text-left"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <Hash className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate">{t.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="text-slate-500 font-black uppercase text-[9px]">{t.project?.name || 'Dự án ẩn'}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {t.deadline ? format(new Date(t.deadline), 'dd/MM/yyyy') : 'Không thời hạn'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-white/50 border-t border-slate-200/60 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.5 rounded bg-slate-200/50 text-[9px] font-black text-slate-500">↑↓</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Di chuyển</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1 py-0.5 rounded bg-slate-200/50 text-[9px] font-black text-slate-500">Enter</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chọn</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-1.5">
            <Command className="h-3 w-3" />
            + K để Mở/Đóng
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
