'use client'

import { useState, useMemo } from 'react'
import { useProjects } from '@/hooks/use-projects'
import { useTasks } from '@/hooks/use-tasks'
import { supabase } from '@/lib/supabase'
import { ProjectCard } from '@/components/projects/project-card'
import { TaskHotlist } from '@/components/tasks/task-hotlist'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Calendar as CalendarIcon, LayoutGrid, Filter, ChevronLeft, ChevronRight, X, Briefcase, Tag, Clock, AlertTriangle } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarView } from '@/components/tasks/calendar-view'
import { NewProjectDialog } from '@/components/projects/new-project-dialog'
import { EditProjectDialog } from '@/components/projects/edit-project-dialog'
import { cn } from '@/lib/utils'
import { Project } from '@/hooks/use-projects'

export default function Dashboard() {
  const { projects, loading: projectsLoading, refresh: refreshProjects } = useProjects()
  const { tasks: allTasks, loading: tasksLoading, refresh: refreshTasks } = useTasks()
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useState<'grid' | 'calendar'>('grid')

  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  
  const [currentPage, setCurrentPage] = useState(1)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const ITEMS_PER_PAGE = 6

  const handleRefresh = () => {
    refreshProjects()
    refreshTasks()
  }

  const filteredProjects = useMemo(() => {
    let result = projects.filter(p => {
      const sq = searchQuery.toLowerCase()
      if (!sq) return true
      
      if (p.name.toLowerCase().includes(sq)) return true
      if (p.suppliers?.name?.toLowerCase().includes(sq)) return true
      if (p.status?.toLowerCase().includes(sq)) return true
      
      const pTasks = allTasks.filter(t => t.project_id === p.id)
      return pTasks.some(t => t.name.toLowerCase().includes(sq))
    })

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status?.toLowerCase() === statusFilter.toLowerCase())
    }

    if (priorityFilter !== 'all') {
      result = result.filter(p => {
        const pTasks = allTasks.filter(t => t.project_id === p.id && t.status !== 'done')
        return pTasks.some(t => t.priority === priorityFilter)
      })
    }

    if (timeFilter !== 'all') {
      const today = new Date()
      result = result.filter(p => {
        const pTasks = allTasks.filter(t => t.project_id === p.id && t.status !== 'done')
        return pTasks.some(t => {
          if (!t.deadline) return false
          const d = new Date(t.deadline)
          if (timeFilter === 'today') return d.toDateString() === today.toDateString()
          if (timeFilter === 'this_week') {
            const nextWeek = new Date()
            nextWeek.setDate(today.getDate() + 7)
            return d >= today && d <= nextWeek
          }
          if (timeFilter === 'overdue') return d < today
          return true
        })
      })
    }

    if (supplierFilter !== 'all') {
      result = result.filter(p => {
        const id = p.suppliers?.id || p.supplier_id || 'none'
        return id === supplierFilter
      })
    }

    return result
  }, [projects, allTasks, searchQuery, statusFilter, priorityFilter, timeFilter, supplierFilter])

  const uniqueStatuses = useMemo(() => Array.from(new Set(projects.map(p => p.status).filter(Boolean))), [projects])
  const uniqueSuppliers = useMemo(() => {
    const map = new Map<string, {id: string, name: string}>()
    projects.forEach(p => {
      if (p.suppliers) map.set(p.suppliers.id, p.suppliers)
    })
    return Array.from(map.values())
  }, [projects])

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE)
  const paginatedProjects = filteredProjects.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0) + (timeFilter !== 'all' ? 1 : 0) + (supplierFilter !== 'all' ? 1 : 0)

  const clearFilters = () => {
    setStatusFilter('all')
    setPriorityFilter('all')
    setTimeFilter('all')
    setSupplierFilter('all')
    setSearchQuery('')
    setCurrentPage(1)
  }

  const tasksToday = allTasks.filter(t => {
    const d = new Date(t.deadline)
    const today = new Date()
    return d.getDate() === today.getDate() && 
           d.getMonth() === today.getMonth() && 
           d.getFullYear() === today.getFullYear()
  })

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá project này? Toàn bộ task liên quan sẽ bị xoá.')) return
    
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (error) {
      alert(`Lỗi khi xoá: ${error.message}`)
    } else {
      handleRefresh()
    }
  }

  const handleDuplicateProject = async (project: Project) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Create new project
    const { data: newProject, error: pError } = await supabase
      .from('projects')
      .insert({
        name: `${project.name} (Bản sao)`,
        supplier_id: project.supplier_id,
        status: project.status,
        description: project.description,
        created_by: user.id
      })
      .select()
      .single()

    if (pError) {
      alert(`Lỗi khi nhân bản project: ${pError.message}`)
      return
    }

    // 2. Fetch original tasks
    const { data: originalTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', project.id)

    if (originalTasks && originalTasks.length > 0) {
      // 3. Insert copied tasks with reset dates
      const tasksToInsert = originalTasks.map((t: any) => ({
        project_id: newProject.id,
        category_id: t.category_id,
        name: t.name,
        description: t.description,
        priority: t.priority,
        status: 'todo',
        start_date: new Date().toISOString(),
        deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
        created_by: user.id
      }))

      const { error: tError } = await supabase.from('tasks').insert(tasksToInsert)
      if (tError) {
        alert(`Nhân bản project thành công nhưng không thể sao chép task: ${tError.message}`)
      }
    }

    handleRefresh()
  }

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto">
      {/* Top Header Section */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Xin chào ✨</h2>
          <p className="text-muted-foreground text-sm font-medium">Bạn có {projects.length} project đang hoạt động.</p>
        </div>
        <div className="flex items-center gap-3">
          <NewProjectDialog onProjectCreated={handleRefresh} />
        </div>
      </section>

      {/* NEW Cleaner Multi-Criteria Filter Bar */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white/40 p-2 rounded-[2.5rem] glass-premium shadow-sm border border-white/60">
        <div className="relative group flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-all duration-300" />
          <Input 
            placeholder="Tìm kiếm dự án, đầu việc, nhà cung cấp..." 
            className="pl-11 h-12 w-full rounded-2xl border-none bg-white/60 focus-visible:ring-primary/10 transition-all text-sm font-medium pr-10"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
          {searchQuery && (
            <button 
               onClick={() => {setSearchQuery(''); setCurrentPage(1);}}
               className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
               <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2 px-2">
          <Popover>
            <PopoverTrigger 
              render={
                <Button 
                  variant="ghost" 
                  className={cn(
                    "h-12 px-6 rounded-2xl border-none bg-white/60 hover:bg-white transition-all duration-300 shadow-sm",
                    activeFiltersCount > 0 ? "text-primary bg-primary/5 hover:bg-primary/10" : "text-slate-600"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Filter className={cn("h-4 w-4", activeFiltersCount > 0 && "animate-pulse")} />
                    <span className="text-sm font-bold">Bộ lọc</span>
                    {activeFiltersCount > 0 && (
                      <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] font-black bg-primary text-white ml-1">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </div>
                </Button>
              }
            />
            <PopoverContent className="w-80 rounded-[2.5rem] border-none glass-premium shadow-2xl p-6 mr-4" align="end">
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Cấu hình bộ lọc</h4>
                  <button 
                    onClick={clearFilters}
                    className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest"
                  >
                    Xoá tất cả
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Trạng thái</Label>
                    <Select value={statusFilter} onValueChange={(v) => { if (v) { setStatusFilter(v); setCurrentPage(1); } }}>
                      <SelectTrigger className="h-11 border-none bg-white/60 hover:bg-white text-xs font-bold w-full rounded-xl shadow-sm">
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-slate-400" />
                          <SelectValue placeholder="Trạng thái" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none glass-premium shadow-xl">
                        <SelectItem value="all" className="font-bold">Tất cả trạng thái</SelectItem>
                        {uniqueStatuses.map(s => (
                          <SelectItem key={s} value={s} className="font-bold text-xs capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nhà cung cấp</Label>
                    <Select value={supplierFilter} onValueChange={(v) => { if (v) { setSupplierFilter(v); setCurrentPage(1); } }}>
                      <SelectTrigger className="h-11 border-none bg-white/60 hover:bg-white text-xs font-bold w-full rounded-xl shadow-sm">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                          <SelectValue placeholder="Nhà cung cấp" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none glass-premium shadow-xl">
                        <SelectItem value="all" className="font-bold">Bất kỳ nhà cung cấp</SelectItem>
                        {uniqueSuppliers.map(s => (
                          <SelectItem key={s.id} value={s.id} className="font-bold text-xs">{s.name}</SelectItem>
                        ))}
                        <SelectItem value="none" className="font-bold text-slate-400">Chưa định danh</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Độ ưu tiên</Label>
                    <Select value={priorityFilter} onValueChange={(v) => { if (v) { setPriorityFilter(v); setCurrentPage(1); } }}>
                      <SelectTrigger className="h-11 border-none bg-white/60 hover:bg-white text-xs font-bold w-full rounded-xl shadow-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
                          <SelectValue placeholder="Ưu tiên công việc" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none glass-premium shadow-xl">
                        <SelectItem value="all" className="font-bold">Tất cả mức độ</SelectItem>
                        <SelectItem value="critical" className="font-bold text-xs text-rose-500">Task Khẩn cấp (Critical)</SelectItem>
                        <SelectItem value="high" className="font-bold text-xs text-amber-500">Task Quan trọng (High)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hạn chót</Label>
                    <Select value={timeFilter} onValueChange={(v) => { if (v) { setTimeFilter(v); setCurrentPage(1); } }}>
                      <SelectTrigger className="h-11 border-none bg-white/60 hover:bg-white text-xs font-bold w-full rounded-xl shadow-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <SelectValue placeholder="Theo thời hạn" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none glass-premium shadow-xl">
                        <SelectItem value="all" className="font-bold">Mọi thời hạn</SelectItem>
                        <SelectItem value="today" className="font-bold text-xs text-primary">Deadline trong Hôm nay</SelectItem>
                        <SelectItem value="this_week" className="font-bold text-xs">Deadline trong Tuần này</SelectItem>
                        <SelectItem value="overdue" className="font-bold text-xs text-rose-500">Đã bị quá hạn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {activeFiltersCount > 0 && (
             <Button 
               variant="ghost" 
               size="icon" 
               onClick={clearFilters}
               className="h-12 w-12 rounded-2xl hover:bg-rose-50 hover:text-rose-500 text-slate-400 transition-all"
             >
                <X className="h-5 w-5" />
             </Button>
          )}
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Project Grid */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          <div className="flex items-center justify-between border-b border-white/40 pb-6 mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              Dự án đang triển khai
              <span className="h-6 px-2.5 flex items-center justify-center bg-primary/10 text-primary text-xs rounded-full font-bold">
                {filteredProjects.length}
              </span>
            </h3>
            
            <div className="flex bg-white/40 p-1.5 rounded-2xl glass-premium shadow-sm border border-white/60">
              <Button 
                variant={view === 'grid' ? 'secondary' : 'ghost'} 
                onClick={() => setView('grid')}
                className={cn(
                  "rounded-xl h-10 px-4 transition-all hover:bg-white flex items-center gap-2",
                  view === 'grid' ? "text-primary shadow-sm" : "text-slate-400"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Lưới</span>
              </Button>
              <Button 
                variant={view === 'calendar' ? 'secondary' : 'ghost'} 
                onClick={() => setView('calendar')}
                className={cn(
                  "rounded-xl h-10 px-4 transition-all hover:bg-white flex items-center gap-2",
                  view === 'calendar' ? "text-primary shadow-sm" : "text-slate-400"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Lịch</span>
              </Button>
            </div>
          </div>

          {view === 'grid' ? (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projectsLoading ? (
                  [1, 2, 3, 4].map(i => (
                    <div key={i} className="h-64 glass-premium rounded-3xl animate-pulse" />
                  ))
                ) : paginatedProjects.length > 0 ? (
                  paginatedProjects.map(project => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      tasks={allTasks}
                      onEdit={(p) => {
                        setEditingProject(p)
                        setIsEditOpen(true)
                      }}
                      onDelete={handleDeleteProject}
                      onDuplicate={handleDuplicateProject}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center glass-premium rounded-3xl border-dashed border-2 border-white/50">
                    <p className="text-slate-400 font-medium italic">Không có project nào khớp với bộ lọc</p>
                    <Button variant="link" onClick={clearFilters} className="text-primary mt-2">Xoá toàn bộ lọc</Button>
                  </div>
                )}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white/40 glass-premium p-2 rounded-2xl border border-white/60">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-4">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-10 w-10 p-0 rounded-xl hover:bg-white disabled:opacity-30"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-10 w-10 p-0 rounded-xl hover:bg-white disabled:opacity-30"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-800">Lịch trình công việc</h3>
              <div className="glass-premium rounded-[2.5rem] p-6 shadow-sm border border-white/20">
                 <CalendarView tasks={allTasks} />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Hotlist & Activity tabs */}
        <aside className="w-full lg:w-[340px] lg:shrink-0 space-y-6">
          <Tabs defaultValue="today" className="w-full">
            <TabsList className="flex w-full bg-white/40 glass-premium rounded-[2rem] p-1.5 h-14 border border-white/60">
              <TabsTrigger value="today" className="flex-1 rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/5 font-bold text-[11px] uppercase tracking-wider text-slate-400 data-[state=active]:text-primary transition-all duration-300">
                Today Focus
              </TabsTrigger>
              <TabsTrigger value="week" className="flex-1 rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/5 font-bold text-[11px] uppercase tracking-wider text-slate-400 data-[state=active]:text-primary transition-all duration-300">
                Upcoming
              </TabsTrigger>
            </TabsList>
            <TabsContent value="today" className="mt-6 outline-none animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="glass-premium rounded-[2.5rem] soft-glow min-h-[500px] p-8 bg-white/20">
                <TaskHotlist tasks={tasksToday} title="Hôm nay làm gì?" />
              </div>
            </TabsContent>
            <TabsContent value="week" className="mt-6 outline-none animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="glass-premium rounded-[2.5rem] soft-glow min-h-[500px] p-8 bg-white/20">
                <TaskHotlist tasks={allTasks.filter(t => t.status !== 'done')} title="Việc cần làm" />
              </div>
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      {editingProject && (
        <EditProjectDialog
          project={editingProject}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onProjectUpdated={handleRefresh}
        />
      )}
    </div>
  )
}
