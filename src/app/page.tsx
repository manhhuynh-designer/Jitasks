'use client'

import { useState, useMemo, useEffect } from 'react'
import { useProjects } from '@/hooks/use-projects'
import { useTasks } from '@/hooks/use-tasks'
import { supabase } from '@/lib/supabase'
import { ProjectCard } from '@/components/projects/project-card'
import { TaskHotlist } from '@/components/tasks/task-hotlist'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Plus, Search, Calendar as CalendarIcon, LayoutGrid, Filter, ChevronLeft, ChevronRight, X, Briefcase, Tag, Clock, Flag, ArrowDownUp } from 'lucide-react'
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
  const [categories, setCategories] = useState<{id: string, name: string, color: string}[]>([])

  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('project_categories').select('*').order('order_index', { ascending: true })
      if (data) setCategories(data)
    }
    fetchCats()
  }, [])

  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('all')
  
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [taskFilter, setTaskFilter] = useState<'today' | 'upcoming'>('today')
  const [upcomingRange, setUpcomingRange] = useState<'7' | '30' | 'all'>('all')
  
  // Calculate counts for Task Switcher Badges
  const taskCounts = useMemo(() => {
    const today = new Date()
    today.setHours(0,0,0,0)
    
    const todayTasks = allTasks.filter(t => {
      if (t.status === 'done') return false
      if (!t.deadline) return false
      const d = new Date(t.deadline)
      d.setHours(0,0,0,0)
      return d.getTime() <= today.getTime()
    })

    const upcomingTasks = allTasks.filter(t => {
      if (t.status === 'done') return false
      if (!t.deadline) return upcomingRange === 'all'
      
      const d = new Date(t.deadline)
      d.setHours(0,0,0,0)
      if (d.getTime() <= today.getTime()) return false
      
      if (upcomingRange === '7') {
        const nextWeek = new Date(today)
        nextWeek.setDate(today.getDate() + 7)
        return d.getTime() <= nextWeek.getTime()
      }
      if (upcomingRange === '30') {
        const nextMonth = new Date(today)
        nextMonth.setDate(today.getDate() + 30)
        return d.getTime() <= nextMonth.getTime()
      }
      return true
    })

    return {
      today: todayTasks.length,
      upcoming: upcomingTasks.length
    }
  }, [allTasks, upcomingRange])
  const [itemsPerPage, setItemsPerPage] = useState(6)

  const [cloningProject, setCloningProject] = useState<Project | null>(null)
  const [isCloneOpen, setIsCloneOpen] = useState(false)

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

    result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [projects, allTasks, searchQuery, statusFilter, priorityFilter, timeFilter, supplierFilter, sortOrder])


  const uniqueSuppliers = useMemo(() => {
    const map = new Map<string, {id: string, name: string}>()
    projects.forEach(p => {
      if (p.suppliers) map.set(p.suppliers.id, p.suppliers)
    })
    return Array.from(map.values())
  }, [projects])

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
  const paginatedProjects = filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

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
    setCloningProject(project)
    setIsCloneOpen(true)
  }

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto scroll-smooth">
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
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white/40 p-1.5 rounded-3xl glass-premium shadow-md border border-white/60">
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
            
            <div className="flex items-center gap-3">
              {/* Grouped Sort & Filter - Icon Only */}
              <div className="flex p-1 bg-white/40 glass-premium rounded-2xl border border-white/60 shadow-sm h-11 items-center">
                <Button 
                  variant="ghost" 
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  title="Sắp xếp"
                  className="h-9 w-9 p-0 rounded-xl hover:bg-white text-slate-500 transition-all duration-300 flex items-center justify-center border-none"
                >
                  <ArrowDownUp className="h-4 w-4" />
                </Button>
                
                <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                <Popover>
                  <PopoverTrigger 
                    render={
                      <Button 
                        variant="ghost" 
                        title="Bộ lọc"
                        className={cn(
                          "h-9 w-9 p-0 rounded-xl hover:bg-white transition-all duration-300 border-none flex items-center justify-center",
                          activeFiltersCount > 0 ? "text-primary" : "text-slate-500"
                        )}
                      >
                        <Filter className={cn("h-4 w-4", activeFiltersCount > 0 && "animate-pulse")} />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-80 rounded-3xl border-none glass-premium shadow-2xl p-6 mr-4" align="end">
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
                          <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Trạng thái</Label>
                          <Select value={statusFilter} onValueChange={(v) => { if (v) { setStatusFilter(v); setCurrentPage(1); } }}>
                            <SelectTrigger className="h-11 border-none bg-white/60 hover:bg-white text-xs font-bold w-full rounded-xl shadow-sm">
                              <div className="flex items-center gap-2">
                                <Tag className="h-3.5 w-3.5 text-slate-400" />
                                <SelectValue placeholder="Trạng thái" />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-slate-100 bg-white shadow-2xl p-1.5">
                              <SelectItem value="all" className="font-bold rounded-lg py-2.5">Tất cả trạng thái</SelectItem>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.name} className="font-bold text-xs capitalize rounded-lg py-2.5">{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Nhà cung cấp</Label>
                          <Select value={supplierFilter} onValueChange={(v) => { if (v) { setSupplierFilter(v); setCurrentPage(1); } }}>
                            <SelectTrigger className="h-11 border-none bg-white/60 hover:bg-white text-xs font-bold w-full rounded-xl shadow-sm">
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                <SelectValue placeholder="Nhà cung cấp" />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-slate-100 bg-white shadow-2xl p-1.5">
                              <SelectItem value="all" className="font-bold rounded-lg py-2.5">Bất kỳ nhà cung cấp</SelectItem>
                              {uniqueSuppliers.map(s => (
                                <SelectItem key={s.id} value={s.id} className="font-bold text-xs rounded-lg py-2.5">{s.name}</SelectItem>
                              ))}
                              <SelectItem value="none" className="font-bold text-slate-400 rounded-lg py-2.5">Chưa định danh</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Độ ưu tiên</Label>
                          <Select value={priorityFilter} onValueChange={(v) => { if (v) { setPriorityFilter(v); setCurrentPage(1); } }}>
                            <SelectTrigger className="h-11 border-none bg-white/60 hover:bg-white text-xs font-bold w-full rounded-xl shadow-sm">
                              <div className="flex items-center gap-2">
                                <Flag className="h-3.5 w-3.5 text-slate-400 fill-current" />
                                <SelectValue placeholder="Ưu tiên công việc" />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-slate-100 bg-white shadow-2xl p-1.5">
                              <SelectItem value="all" className="font-bold rounded-lg py-2.5">Tất cả mức độ</SelectItem>
                              <SelectItem value="critical" className="font-bold text-xs text-rose-500 rounded-lg py-2.5">Task Khẩn cấp (Critical)</SelectItem>
                              <SelectItem value="high" className="font-bold text-xs text-amber-500 rounded-lg py-2.5">Task Quan trọng (High)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Hạn chót</Label>
                          <Select value={timeFilter} onValueChange={(v) => { if (v) { setTimeFilter(v); setCurrentPage(1); } }}>
                            <SelectTrigger className="h-11 border-none bg-white/60 hover:bg-white text-xs font-bold w-full rounded-xl shadow-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <SelectValue placeholder="Theo thời hạn" />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-slate-100 bg-white shadow-2xl p-1.5">
                              <SelectItem value="all" className="font-bold rounded-lg py-2.5">Mọi thời hạn</SelectItem>
                              <SelectItem value="today" className="font-bold text-xs text-primary rounded-lg py-2.5">Deadline trong Hôm nay</SelectItem>
                              <SelectItem value="this_week" className="font-bold text-xs rounded-lg py-2.5">Deadline trong Tuần này</SelectItem>
                              <SelectItem value="overdue" className="font-bold text-xs text-rose-500 rounded-lg py-2.5">Đã bị quá hạn</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* View Toggle - More Prominent */}
              <div className="flex p-1.5 bg-white/40 glass-premium rounded-2xl border border-white/60 shadow-md h-12 items-center">
                <Button 
                  onClick={() => setView('grid')}
                  className={cn(
                    "rounded-xl h-9 px-4 transition-all flex items-center gap-2 font-black border-none",
                    view === 'grid' 
                      ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                      : "bg-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="text-[10px] uppercase tracking-widest">Lưới</span>
                </Button>
                <Button 
                  onClick={() => setView('calendar')}
                  className={cn(
                    "rounded-xl h-9 px-4 transition-all flex items-center gap-2 font-black border-none",
                    view === 'calendar' 
                      ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                      : "bg-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span className="text-[10px] uppercase tracking-widest">Lịch</span>
                </Button>
              </div>
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
                      categories={categories}
                      onEdit={(p) => {
                        setEditingProject(p)
                        setIsEditOpen(true)
                      }}
                      onDelete={handleDeleteProject}
                      onDuplicate={handleDuplicateProject}
                      onTaskUpdate={handleRefresh}
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
              {totalPages >= 1 && (
                <div className="flex items-center justify-between bg-white/40 glass-premium p-2 rounded-2xl border border-white/60">
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
            <div className="flex flex-col h-full snap-start scroll-mt-2">
              <div className="glass-premium rounded-3xl p-6 shadow-sm border border-white/20 h-[calc(100vh-80px)] flex flex-col overflow-hidden">
                 <CalendarView tasks={allTasks} onRefreshTasks={handleRefresh} className="flex-1 overflow-hidden" />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Unified Hotlist */}
        <aside className="w-full lg:w-[340px] lg:shrink-0 space-y-6">
          <div className="glass-premium rounded-3xl soft-glow min-h-[600px] bg-white/30 border border-white/50 relative">
            {/* Task Switcher - Integrated with top */}
            <div className="flex px-4 gap-3 bg-white/10 border-b border-white/20 h-16 items-center w-full rounded-t-3xl">
              <div className="flex-1">
                <Button 
                  onClick={() => setTaskFilter('today')}
                  className={cn(
                    "w-full rounded-2xl h-11 px-4 transition-all font-black border-none text-[10px] uppercase tracking-widest flex items-center justify-center gap-2",
                    taskFilter === 'today' 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-transparent text-slate-400 hover:text-slate-600 hover:bg-white/10"
                  )}
                >
                  Việc hôm nay
                  {taskCounts.today > 0 && (
                    <span className={cn(
                      "h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center text-[9px] font-black transition-all duration-300",
                      taskFilter === 'today' ? "bg-white text-primary" : "bg-slate-200 text-slate-600"
                    )}>
                      {taskCounts.today}
                    </span>
                  )}
                </Button>
              </div>
              
              <div className="flex-1">
                <Button 
                  onClick={() => setTaskFilter('upcoming')}
                  className={cn(
                    "w-full rounded-2xl h-11 px-4 transition-all font-black border-none text-[10px] uppercase tracking-widest flex items-center justify-center gap-2",
                    taskFilter === 'upcoming' 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-transparent text-slate-400 hover:text-slate-600 hover:bg-white/10"
                  )}
                >
                  Việc sắp tới
                  {taskCounts.upcoming > 0 && (
                    <span className={cn(
                      "h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center text-[9px] font-black transition-all duration-300",
                      taskFilter === 'upcoming' ? "bg-white text-primary" : "bg-slate-200 text-slate-600"
                    )}>
                      {taskCounts.upcoming}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            <div className="px-6 space-y-6">
              {taskFilter === 'upcoming' && (
                <div className="flex items-center justify-center gap-6 py-2 border-b border-slate-100/50">
                  {[
                    { label: '7 ngày', value: '7' },
                    { label: '1 tháng', value: '30' },
                    { label: 'Tất cả', value: 'all' }
                  ].map((btn) => (
                    <button
                      key={btn.value}
                      onClick={() => setUpcomingRange(btn.value as any)}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative py-1",
                        upcomingRange === btn.value 
                          ? "text-primary" 
                          : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {btn.label}
                      {upcomingRange === btn.value && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full transition-all duration-300" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <TaskHotlist 
                tasks={allTasks} 
                filter={taskFilter as 'today' | 'upcoming'} 
                upcomingRange={upcomingRange}
                onStatusChange={handleRefresh} 
              />
            </div>
          </div>
        </aside>
      </div>

      {editingProject && (
        <EditProjectDialog
          project={editingProject}
          open={isEditOpen}
          onOpenChange={(v) => {
            setIsEditOpen(v)
            if (!v) setEditingProject(null)
          }}
          onProjectUpdated={handleRefresh}
        />
      )}

      {cloningProject && (
        <EditProjectDialog
          project={cloningProject}
          open={isCloneOpen}
          onOpenChange={(v) => {
            setIsCloneOpen(v)
            if (!v) setCloningProject(null)
          }}
          onProjectUpdated={handleRefresh}
          isClone={true}
        />
      )}
    </div>
  )
}
