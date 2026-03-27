'use client'

import { useSearchParams } from 'next/navigation'
import { useProjects } from '@/hooks/use-projects'
import { useTasks } from '@/hooks/use-tasks'
import { supabase } from '@/lib/supabase'
import { ProjectCard } from '@/components/projects/project-card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NewProjectDialog } from '@/components/projects/new-project-dialog'
import { useState, useMemo, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Search, X, ArrowUpDown, ChevronLeft, ChevronRight, LayoutGrid, Info, FileJson } from 'lucide-react'
import { exportProjectsToJSON } from '@/lib/export-utils'
import { cn } from '@/lib/utils'
import { StatsBar } from '@/components/dashboard/stats-bar'
import { EditTaskDialog } from '@/components/tasks/edit-task-dialog'
import { Task } from '@/hooks/use-tasks'

export default function ProjectsPage() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const supplierId = searchParams.get('supplier')
  const assigneeId = searchParams.get('assignee')
  
  const { projects, loading, refresh, deleteProject } = useProjects()
  const { tasks } = useTasks()

  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState<{id: string, name: string}[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false)

  useEffect(() => {
    document.title = 'Dự án | Jitasks'
  }, [])

  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('project_categories').select('id, name')
      if (data) setCategories(data)
    }
    fetchCats()
  }, [])

  const filteredProjects = useMemo(() => {
    let result = [...projects]
    
    // 1. URL Status/Stage Filter
    if (status) {
      result = result.filter(p => p.status === status)
    }

    // 2. Search Query Filter
    if (searchQuery) {
      result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // 3. Supplier Filter
    if (supplierId) {
      result = result.filter(p => (p.suppliers?.id === supplierId || p.supplier_id === supplierId))
    }

    // 4. Assignee Filter
    if (assigneeId) {
      result = result.filter(p => tasks.some(t => t.project_id === p.id && t.assignee_id === assigneeId))
    }
    
    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
    
    return result
  }, [projects, status, searchQuery, sortOrder, supplierId, assigneeId, tasks])

  const currentSelectionTasks = useMemo(() => {
    const projectIds = new Set(filteredProjects.map(p => p.id))
    return tasks.filter(t => projectIds.has(t.project_id))
  }, [filteredProjects, tasks])

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
  const paginatedProjects = filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {status ? `Dự án: ${status}` : 
             supplierId ? `Dự án theo Nhà cung cấp` :
             assigneeId ? `Dự án theo Nhân sự` : 
             'Tất cả dự án'}
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            {status ? `Danh sách dự án đang ở giai đoạn ${status}.` :
             supplierId ? `Danh sách dự án được cung cấp bởi đối tác đã chọn.` :
             assigneeId ? `Danh sách dự án mà nhân sự này đang phụ trách đầu việc.` :
             'Quản lý và theo dõi tiến độ toàn bộ dự án hệ thống.'}
          </p>
        </div>
        <NewProjectDialog onProjectCreated={refresh} />
      </div>

      <StatsBar
        projects={filteredProjects}
        tasks={tasks}
        selectionTasks={currentSelectionTasks}
        onTaskClick={(task) => {
          setSelectedTask(task)
          setIsTaskDetailOpen(true)
        }}
        className="mb-8"
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/40 glass-premium p-3 rounded-3xl border border-white/60 mb-6 shadow-sm">
        <div className="relative w-full sm:w-[350px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Tìm kiếm dự án..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-10 h-10 bg-white/60 border-none rounded-2xl focus-visible:ring-primary/20 text-sm font-medium transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          <Button
            variant="outline"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="h-10 rounded-2xl bg-white/60 border-none hover:bg-white/100 flex items-center gap-2 whitespace-nowrap px-4 font-bold text-slate-600 shadow-sm"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortOrder === 'desc' ? 'Mới nhất' : 'Cũ nhất'}
          </Button>

          <Button
            variant="outline"
            onClick={() => exportProjectsToJSON(filteredProjects.map(p => p.id))}
            disabled={filteredProjects.length === 0}
            className="h-10 rounded-2xl bg-white/60 border-none hover:bg-emerald-50 hover:text-emerald-500 flex items-center gap-2 whitespace-nowrap px-4 font-bold text-slate-600 shadow-sm transition-all"
          >
            <FileJson className="h-4 w-4" />
            Xuất JSON ({filteredProjects.length})
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-420px)]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="space-y-6 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedProjects.map(project => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  tasks={tasks}
                  categories={categories}
                  onDelete={deleteProject}
                  onTaskUpdate={refresh}
                />
              ))}
            </div>
            
            {totalPages >= 1 && (
              <div className="flex items-center justify-between bg-white/40 glass-premium p-2 rounded-2xl border border-white/60 mt-4">
                <div className="flex items-center gap-4 pl-4">
                   <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:inline-block">
                     Trang {currentPage} / {totalPages}
                   </span>
                   <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                     <SelectTrigger className="h-8 border-none bg-white/60 focus:ring-0 text-xs font-bold w-[120px] rounded-xl">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent className="rounded-xl border-none glass-premium shadow-xl">
                       <SelectItem value="6" className="text-xs font-bold py-2">6 dự án/trang</SelectItem>
                       <SelectItem value="12" className="text-xs font-bold py-2">12 dự án/trang</SelectItem>
                       <SelectItem value="24" className="text-xs font-bold py-2">24 dự án/trang</SelectItem>
                       <SelectItem value="48" className="text-xs font-bold py-2">48 dự án/trang</SelectItem>
                     </SelectContent>
                   </Select>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-white/80 shrink-0"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-white/80 shrink-0"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white/60 glass-premium rounded-3xl border border-dashed border-slate-300">
            <p className="text-slate-500 font-medium">Không tìm thấy dự án nào.</p>
          </div>
        )}
      </ScrollArea>

      {selectedTask && (
        <EditTaskDialog
          task={selectedTask}
          open={isTaskDetailOpen}
          onOpenChange={setIsTaskDetailOpen}
          onTaskUpdated={refresh}
        />
      )}
    </div>
  )
}
