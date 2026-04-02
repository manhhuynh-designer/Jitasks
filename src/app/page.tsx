'use client'

import { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { useProjects } from '@/hooks/use-projects'
import { useTasks } from '@/hooks/use-tasks'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { supabase } from '@/lib/supabase'
import { ProjectCard } from '@/components/projects/project-card'
import { ProjectListItem } from '@/components/projects/project-list-item'
import { TaskHotlist } from '@/components/tasks/task-hotlist'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { Plus, Search, Calendar as CalendarIcon, LayoutGrid, List, Filter, ChevronLeft, ChevronRight, ChevronDownIcon, X, Briefcase, Tag, Clock, Flag, ArrowDownUp, Command, BarChart2 } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarView } from '@/components/tasks/calendar-view'
import { Calendar } from '@/components/ui/calendar'
import { NewProjectDialog } from '@/components/projects/new-project-dialog'
import { EditProjectDialog } from '@/components/projects/edit-project-dialog'
import { cn, getCategoryColorStyles } from '@/lib/utils'
import { Project } from '@/hooks/use-projects'
import { GlobalKPIBanner } from '@/components/dashboard/global-kpi-banner'
import { SourcingPipelineBar } from '@/components/dashboard/sourcing-pipeline-bar'
import { GlobalSearch } from '@/components/dashboard/global-search'
import { TaskCompletionHeatmap } from '@/components/dashboard/task-completion-heatmap'
import { TaskStatusDonut } from '@/components/dashboard/task-status-donut'
import { DashboardGantt } from '@/components/dashboard/dashboard-gantt'

const PROJECT_STATUSES = [
  { value: 'Sourcing', label: 'Sourcing', color: 'bg-blue-500 text-white' },
  { value: 'Active', label: 'Active', color: 'bg-emerald-500 text-white' },
  { value: 'On Hold', label: 'On Hold', color: 'bg-amber-500 text-white' },
  { value: 'Archive', label: 'Archive', color: 'bg-slate-500 text-white' }
]

const TASK_STATUSES = [
  { value: 'todo', label: 'To Do', color: 'bg-slate-500 text-white' },
  { value: 'inprogress', label: 'In Progress', color: 'bg-sky-400 text-white shadow-sm shadow-sky-400/20' },
  { value: 'pending', label: 'Pending', color: 'bg-orange-400 text-white shadow-sm shadow-orange-400/20' },
  { value: 'done', label: 'Done', color: 'bg-emerald-500 text-white opacity-80' }
]

export default function Dashboard() {
  const { projects, loading: projectsLoading, refresh: refreshProjects, deleteProject } = useProjects()
  const { tasks: allTasks, loading: tasksLoading, refresh: refreshTasks } = useTasks()
  const [searchQuery, setSearchQuery] = useLocalStorage('ji_searchQuery', '')
  const [view, setView] = useLocalStorage<'grid' | 'calendar' | 'gantt'>('ji_view', 'grid')
  const [categories, setCategories] = useState<{id: string, name: string, color: string}[]>([])

  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('project_categories').select('*').order('order_index', { ascending: true })
      if (data) setCategories(data)
    }
    fetchCats()
  }, [])

  const [statusFilter, setStatusFilter] = useLocalStorage<string[]>('ji_statusFilter', [])
  const [taskStatusFilter, setTaskStatusFilter] = useLocalStorage<string[]>('ji_taskStatusFilter', [])
  const [priorityFilter, setPriorityFilter] = useLocalStorage<string[]>('ji_priorityFilter', [])
  const [supplierFilter, setSupplierFilter] = useLocalStorage<string[]>('ji_supplierFilter', [])
  const [rawDateRange, setRawDateRange] = useLocalStorage<{ from: string | Date | undefined, to: string | Date | undefined }>('ji_dateRange', { from: undefined, to: undefined })
  
  // Deserialize Date objects from localStorage
  const dateRange = useMemo(() => ({
    from: rawDateRange.from ? new Date(rawDateRange.from) : undefined,
    to: rawDateRange.to ? new Date(rawDateRange.to) : undefined
  }), [rawDateRange])

  const setDateRange = (range: { from: Date | undefined, to: Date | undefined }) => {
    setRawDateRange(range)
  }
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  const [currentPage, setCurrentPage] = useLocalStorage('ji_currentPage', 1)
  const [sortOrder, setSortOrder] = useLocalStorage<'desc' | 'asc'>('ji_sortOrder', 'desc')
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
  const [itemsPerPage, setItemsPerPage] = useLocalStorage('ji_itemsPerPage', 6)
  const [gridDisplayType, setGridDisplayType] = useLocalStorage<'grid' | 'list'>('ji_gridDisplayType', 'grid')

  const [cloningProject, setCloningProject] = useState<Project | null>(null)
  const [isCloneOpen, setIsCloneOpen] = useState(false)
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false)

  useEffect(() => {
    document.title = 'Dashboard | Jitasks'
  }, [])

  const handleRefresh = () => {
    refreshProjects()
    refreshTasks()
  }

  const filteredTasks = useMemo(() => {
    let result = allTasks

    // Search query
    const sq = searchQuery.toLowerCase()
    if (sq) {
      result = result.filter(t => 
        t.name.toLowerCase().includes(sq) || 
        t.projects?.name?.toLowerCase().includes(sq) ||
        t.assignees?.full_name?.toLowerCase().includes(sq)
      )
    }

    // Priority filter (Multi)
    if (priorityFilter.length > 0) {
      result = result.filter(t => priorityFilter.includes(t.priority))
    }

    // Project status filter (Multi)
    if (statusFilter.length > 0) {
      result = result.filter(t => statusFilter.includes(t.projects?.status || 'Sourcing'))
    }

    // Task status filter (Multi)
    if (taskStatusFilter.length > 0) {
      result = result.filter(t => taskStatusFilter.includes(t.status))
    }

    // Supplier filter (Multi)
    if (supplierFilter.length > 0) {
      result = result.filter(t => {
        const id = t.assignee_id || 'none'
        return supplierFilter.includes(id)
      })
    }

    // Date range filter
    if (dateRange.from) {
      const from = new Date(dateRange.from)
      from.setHours(0,0,0,0)
      
      result = result.filter(t => {
        if (!t.deadline) return false
        const d = new Date(t.deadline)
        d.setHours(0,0,0,0)
        
        if (dateRange.to) {
          const to = new Date(dateRange.to)
          to.setHours(23,59,59,999)
          return d >= from && d <= to
        }
        return d >= from
      })
    }

    return result
  }, [allTasks, searchQuery, priorityFilter, taskStatusFilter, statusFilter, supplierFilter, dateRange])

  const activeContextTasks = useMemo(() => {
    const activeProjectIds = new Set(projects.filter(p => (p.status || '').toLowerCase() !== 'archive').map(p => p.id))
    return allTasks.filter(t => activeProjectIds.has(t.project_id))
  }, [projects, allTasks])

  const filteredProjects = useMemo(() => {
    let result = projects

    // Search query
    const sq = searchQuery.toLowerCase()
    if (sq) {
      result = result.filter(p => {
        if (p.name.toLowerCase().includes(sq)) return true
        if (p.suppliers?.name?.toLowerCase().includes(sq)) return true
        if (p.status?.toLowerCase().includes(sq)) return true
        
        const pTasks = allTasks.filter(t => t.project_id === p.id)
        return pTasks.some(t => t.name.toLowerCase().includes(sq))
      })
    }

    // Status filter (Multi)
    if (statusFilter.length > 0) {
      result = result.filter(p => statusFilter.includes(p.status || 'Sourcing'))
    }

    // Priority filter (Multi) - If a project has ANY task with selected priority
    if (priorityFilter.length > 0) {
      result = result.filter(p => {
        const pTasks = allTasks.filter(t => t.project_id === p.id && t.status !== 'done')
        return pTasks.some(t => priorityFilter.includes(t.priority))
      })
    }

    // Task status filter (Multi) - If a project has ANY task with selected stage
    if (taskStatusFilter.length > 0) {
      result = result.filter(p => {
        const pTasks = allTasks.filter(t => t.project_id === p.id)
        return pTasks.some(t => taskStatusFilter.includes(t.status))
      })
    }

    // Supplier filter (Multi)
    if (supplierFilter.length > 0) {
      result = result.filter(p => {
        const id = p.suppliers?.id || p.supplier_id || 'none'
        return supplierFilter.includes(id)
      })
    }

    // Date range filter for projects
    if (dateRange.from) {
      const from = new Date(dateRange.from)
      from.setHours(0,0,0,0)
      result = result.filter(p => {
        const pTasks = allTasks.filter(t => t.project_id === p.id && t.status !== 'done')
        return pTasks.some(t => {
          if (!t.deadline) return false
          const d = new Date(t.deadline)
          d.setHours(0,0,0,0)
          if (dateRange.to) {
            const to = new Date(dateRange.to)
            to.setHours(23,59,59,999)
            return d >= from && d <= to
          }
          return d >= from
        })
      })
    }

    result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [projects, allTasks, searchQuery, statusFilter, priorityFilter, supplierFilter, dateRange, sortOrder])


  const uniqueSuppliers = useMemo(() => {
    const map = new Map<string, {id: string, name: string}>()
    projects.forEach(p => {
      if (p.suppliers) map.set(p.suppliers.id, p.suppliers)
    })
    return Array.from(map.values())
  }, [projects])

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
  const paginatedProjects = filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const activeFiltersCount = (statusFilter.length > 0 ? 1 : 0) + (priorityFilter.length > 0 ? 1 : 0) + (dateRange.from ? 1 : 0) + (supplierFilter.length > 0 ? 1 : 0)

  const clearFilters = () => {
    setStatusFilter([])
    setTaskStatusFilter([])
    setPriorityFilter([])
    setDateRange({ from: undefined, to: undefined })
    setSupplierFilter([])
    setSearchQuery('')
    setCurrentPage(1)
    setShowSupplierDropdown(false)
    setShowDatePicker(false)
  }

  const tasksToday = allTasks.filter(t => {
    const d = new Date(t.deadline)
    const today = new Date()
    return d.getDate() === today.getDate() && 
           d.getMonth() === today.getMonth() && 
           d.getFullYear() === today.getFullYear()
  })

  const handleDeleteProject = async (projectId: string) => {
    const success = await deleteProject(projectId)
    if (success) handleRefresh()
  }

  const handleDuplicateProject = async (project: Project) => {
    setCloningProject(project)
    setIsCloneOpen(true)
  }

  const toggleStatus = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
    setCurrentPage(1)
  }

  const toggleTaskStatus = (status: string) => {
    setTaskStatusFilter(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
    setCurrentPage(1)
  }

  const togglePriority = (priority: string) => {
    setPriorityFilter(prev => 
      prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
    )
    setCurrentPage(1)
  }

  const toggleSupplier = (supplierId: string) => {
    setSupplierFilter(prev => 
      prev.includes(supplierId) ? prev.filter(s => s !== supplierId) : [...prev, supplierId]
    )
    setCurrentPage(1)
  }

  const getPriorityInfo = (p: string) => {
    const opts: Record<string, { label: string, color: string }> = {
      low: { label: 'Thấp', color: 'text-slate-400' },
      medium: { label: 'Vừa', color: 'text-amber-500' },
      high: { label: 'Cao', color: 'text-fuchsia-500' },
      critical: { label: 'Gấp', color: 'text-red-600' }
    }
    return opts[p] || opts.low
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

      {/* ✅ NEW: Analytics Banner & Pipeline */}
      <div className="grid gap-6">
        <GlobalKPIBanner projects={projects} tasks={allTasks} />
        <SourcingPipelineBar 
          projects={projects} 
          categories={categories}
          onStageClick={(status) => {
            setStatusFilter(prev => 
              prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
            )
          }}
        />
      </div>


      <div className="flex flex-col xl:flex-row gap-8 xl:items-stretch items-start">
        {/* Left Column: Project Grid */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          <div className="flex items-center gap-3 flex-wrap border-b border-white/40 pb-5 mb-6">
              {/* Compact Search Bar next to Sort/Filter */}
              <div className="relative group flex-1 sm:flex-initial">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-all duration-300" />
                <Input 
                  placeholder="Tìm dự án..." 
                  className="pl-10 h-11 w-full sm:w-[200px] lg:w-[260px] rounded-2xl border-none bg-white/40 glass-premium focus-visible:ring-primary/10 transition-all text-xs font-bold pr-16"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchQuery && (
                    <button 
                      onClick={() => {setSearchQuery(''); setCurrentPage(1);}}
                      className="h-7 w-7 rounded-lg hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button 
                    onClick={() => setIsGlobalSearchOpen(true)}
                    title="Tìm kiếm nâng cao (Ctrl+K)"
                    className="h-7 w-7 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-all duration-300"
                  >
                    <Command className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Grouped Sort & Filter - Icon Only */}
              <div className="flex p-1 bg-white/40 glass-premium rounded-2xl border border-white/60 h-11 items-center">
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
                  <PopoverContent className="w-80 p-0 rounded-3xl border border-white/40 bg-[#F8FAFC]/90" align="end">
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <Label className="text-sm font-black text-slate-800 uppercase tracking-wider">Cấu hình bộ lọc</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearFilters}
                          className="h-7 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg px-2"
                        >
                          Xoá tất cả
                        </Button>
                      </div>

                      <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-1 custom-scrollbar">
                         {/* Status (Multi-select Badges) */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Trạng thái Project</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {(categories.length > 0 ? categories : PROJECT_STATUSES.map(s => ({ id: s.value, name: s.label, color: s.color.split(' ')[0] }))).map(cat => {
                              const catName = 'name' in cat ? cat.name : (cat as any).label
                              const catValue = 'name' in cat ? cat.name : (cat as any).value
                              const isActive = statusFilter.length === 0 || statusFilter.includes(catValue)
                              const colorStyles = getCategoryColorStyles(cat.color)
                              
                              return (
                                <button
                                  key={catValue}
                                  onClick={() => toggleStatus(catValue)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border-transparent",
                                    isActive 
                                      ? cn("text-white shadow-sm scale-100", colorStyles.className || 'bg-slate-800') 
                                      : "bg-slate-100 text-slate-400 opacity-50 scale-95 hover:opacity-80"
                                  )}
                                  style={isActive ? colorStyles.style : {}}
                                >
                                  {catName}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Task Status (Multi-select Badges) */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Trạng thái Task</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {TASK_STATUSES.map(status => {
                              const isActive = taskStatusFilter.length === 0 || taskStatusFilter.includes(status.value)
                              return (
                                <button
                                  key={status.value}
                                  onClick={() => toggleTaskStatus(status.value)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border-transparent",
                                    isActive ? `${status.color} scale-100` : "bg-slate-100 text-slate-400 opacity-50 scale-95 hover:opacity-80"
                                  )}
                                >
                                  {status.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Priority (Flag Buttons) */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Độ ưu tiên</Label>
                          <div className="flex items-center justify-between gap-1 px-1">
                            {['low', 'medium', 'high', 'critical'].map((p) => {
                              const info = getPriorityInfo(p)
                              const isActive = priorityFilter.length === 0 || priorityFilter.includes(p)
                              return (
                                <button
                                  key={p}
                                  onClick={() => togglePriority(p)}
                                  className={cn(
                                    "w-12 h-10 flex items-center justify-center transition-all bg-transparent",
                                    isActive ? "opacity-100 scale-125" : "opacity-40 hover:opacity-100 scale-100"
                                  )}
                                  title={info.label}
                                >
                                  <Flag className={cn("h-6 w-6 fill-current", info.color)} />
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Supplier (Inline Dropdown) */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Nhà cung cấp</Label>
                          <div className="relative">
                            <Popover>
                              <PopoverTrigger 
                                render={
                                  <Button 
                                    variant="outline"
                                    className="h-11 w-full justify-between border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold rounded-2xl px-4"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                      <span className={cn(supplierFilter.length === 0 ? "text-slate-400" : "text-slate-700")}>
                                        {supplierFilter.length === 0 ? "Tất cả nhà cung cấp" : `Đã chọn ${supplierFilter.length} nhà cung cấp`}
                                      </span>
                                    </div>
                                    <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                                  </Button>
                                }
                              />
                              <PopoverContent className="w-64 p-2 rounded-2xl border border-slate-100 bg-white/95 backdrop-blur-md shadow-xl" align="start">
                                <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                  <button
                                    onClick={() => setSupplierFilter([])}
                                    className={cn(
                                      "w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left",
                                      supplierFilter.length === 0 ? "bg-primary/5 text-primary font-bold" : "hover:bg-slate-50 text-slate-600"
                                    )}
                                  >
                                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center", supplierFilter.length === 0 ? "bg-primary border-primary" : "border-slate-300")}>
                                      {supplierFilter.length === 0 && <X className="h-2.5 w-2.5 text-white" />}
                                    </div>
                                    <span className="text-xs">Tất cả nhà cung cấp</span>
                                  </button>
                                  {uniqueSuppliers.map(s => (
                                    <button
                                      key={s.id}
                                      onClick={() => toggleSupplier(s.id)}
                                      className={cn(
                                        "w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left",
                                        supplierFilter.includes(s.id) ? "bg-primary/5 text-primary font-bold" : "hover:bg-slate-50 text-slate-600"
                                      )}
                                    >
                                      <div className={cn("w-4 h-4 rounded border flex items-center justify-center", supplierFilter.includes(s.id) ? "bg-primary border-primary" : "border-slate-300")}>
                                        {supplierFilter.includes(s.id) && <X className="h-2.5 w-2.5 text-white" />}
                                      </div>
                                      <div className={cn("w-1.5 h-1.5 rounded-full", supplierFilter.includes(s.id) ? "bg-primary" : "bg-slate-300")} />
                                      <span className="text-xs truncate">{s.name}</span>
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => toggleSupplier('none')}
                                    className={cn(
                                      "w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left",
                                      supplierFilter.includes('none') ? "bg-primary/5 text-primary font-bold" : "hover:bg-slate-50 text-slate-400"
                                    )}
                                  >
                                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center", supplierFilter.includes('none') ? "bg-primary border-primary" : "border-slate-300")}>
                                      {supplierFilter.includes('none') && <X className="h-2.5 w-2.5 text-white" />}
                                    </div>
                                    <span className="text-xs">Chưa định danh</span>
                                  </button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {/* Date Range Picker (Inline) */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 ml-1">Khoảng thời gian (Hạn chót)</Label>
                          <div className="relative">
                            <Popover>
                              <PopoverTrigger 
                                render={
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "h-11 border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold w-full rounded-2xl justify-between px-4",
                                      !dateRange.from && "text-slate-400"
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                                      <span className={cn(dateRange.from ? "text-slate-700" : "text-slate-400")}>
                                        {dateRange.from ? (
                                          dateRange.to ? (
                                            `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")}`
                                          ) : (
                                            format(dateRange.from, "dd/MM/yyyy")
                                          )
                                        ) : (
                                          "Bất kỳ lúc nào"
                                        )}
                                      </span>
                                    </div>
                                    <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                                  </Button>
                                }
                              />
                              <PopoverContent className="w-auto p-0 rounded-3xl border border-slate-100 bg-white shadow-2xl" align="start">
                                <Calendar
                                  mode="range"
                                  defaultMonth={dateRange.from}
                                  selected={dateRange as any}
                                  onSelect={(range) => setDateRange(range as any)}
                                  numberOfMonths={1}
                                  className="rounded-3xl border-none"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* View Mode Toggle */}
              <div className="w-[1px] h-5 bg-slate-200 hidden sm:block" />
              <div className="flex p-1 bg-white/40 glass-premium rounded-2xl border border-white/60 h-11 items-center">
                <Button 
                  onClick={() => setView('grid')}
                  className={cn(
                    "rounded-xl h-9 px-3 transition-all flex items-center gap-1.5 font-black border-none text-[10px]",
                    view === 'grid' 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="uppercase tracking-widest hidden sm:inline">Lưới</span>
                </Button>
                <Button 
                  onClick={() => setView('calendar')}
                  className={cn(
                    "rounded-xl h-9 px-3 transition-all flex items-center gap-1.5 font-black border-none text-[10px]",
                    view === 'calendar' 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span className="uppercase tracking-widest hidden sm:inline">Lịch</span>
                </Button>
                <Button 
                  onClick={() => setView('gantt')}
                  className={cn(
                    "rounded-xl h-9 px-3 transition-all flex items-center gap-1.5 font-black border-none text-[10px]",
                    view === 'gantt' 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <BarChart2 className="h-3.5 w-3.5 rotate-90" />
                  <span className="uppercase tracking-widest hidden sm:inline">Gantt</span>
                </Button>
              </div>

              {/* Card/List sub-toggle — only in Grid view */}
              {view === 'grid' && (
                <div className="flex p-0.5 bg-white/30 rounded-lg border border-white/40 h-9 items-center">
                  <Button 
                    variant="ghost"
                    onClick={() => setGridDisplayType('grid')}
                    className={cn(
                      "rounded-md h-8 w-8 p-0 transition-all flex items-center justify-center border-none",
                      gridDisplayType === 'grid' 
                        ? "bg-white text-primary shadow-sm" 
                        : "bg-transparent text-slate-400 hover:text-slate-600"
                    )}
                    title="Card view"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => setGridDisplayType('list')}
                    className={cn(
                      "rounded-md h-8 w-8 p-0 transition-all flex items-center justify-center border-none",
                      gridDisplayType === 'list' 
                        ? "bg-white text-primary shadow-sm" 
                        : "bg-transparent text-slate-400 hover:text-slate-600"
                    )}
                    title="List view"
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
          </div>

          {view === 'grid' ? (
            <div className="space-y-6">
              {projectsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-64 glass-premium rounded-3xl animate-pulse" />
                  ))}
                </div>
              ) : paginatedProjects.length > 0 ? (
                <div className={cn(
                  gridDisplayType === 'grid' 
                    ? "grid grid-cols-1 md:grid-cols-2 gap-6" 
                    : "bg-white/30 glass-premium rounded-lg border border-white/40 overflow-hidden divide-y divide-slate-100"
                )}>
                  {paginatedProjects.map(project => (
                    <div key={project.id}>
                      {gridDisplayType === 'grid' ? (
                        <ProjectCard 
                          project={project} 
                          tasks={filteredTasks}
                          categories={categories}
                          onEdit={(p) => {
                            setEditingProject(p)
                            setIsEditOpen(true)
                          }}
                          onDelete={handleDeleteProject}
                          onDuplicate={handleDuplicateProject}
                          onTaskUpdate={handleRefresh}
                        />
                      ) : (
                        <ProjectListItem 
                          project={project}
                          tasks={allTasks}
                          onEdit={(p) => {
                            setEditingProject(p)
                            setIsEditOpen(true)
                          }}
                          onDelete={handleDeleteProject}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center glass-premium rounded-3xl border-dashed border-2 border-white/50">
                  <p className="text-slate-400 font-medium italic">Không có project nào khớp với bộ lọc</p>
                  <Button variant="link" onClick={clearFilters} className="text-primary mt-2">Xoá toàn bộ lọc</Button>
                </div>
              )}
              
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
          ) : view === 'calendar' ? (
            <div className="flex flex-col h-full snap-start scroll-mt-2">
              <div className="glass-premium rounded-3xl p-6 shadow-sm border border-white/20 h-[calc(100vh-80px)] flex flex-col overflow-hidden">
                 <CalendarView tasks={filteredTasks} onRefreshTasks={handleRefresh} className="flex-1 overflow-hidden" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full snap-start scroll-mt-2">
               <div className="h-[calc(100vh-120px)] flex flex-col overflow-hidden">
                  <DashboardGantt tasks={filteredTasks} onRefreshTasks={handleRefresh} />
               </div>
            </div>
          )}
        </div>

        {/* Right Column: Unified Hotlist */}
        <aside className="w-full xl:w-[380px] xl:shrink-0 flex flex-col">
          <div className="glass-premium rounded-3xl soft-glow h-auto xl:h-0 xl:min-h-full min-h-[400px] bg-white/30 border border-white/50 relative flex flex-col overflow-hidden">
            {/* Task Switcher - Integrated with top */}
            <div className="flex px-4 gap-3 bg-white/10 border-b border-white/20 min-h-[64px] items-center w-full rounded-t-3xl mt-2">
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

            {taskFilter === 'upcoming' && (
              <div className="flex items-center justify-center gap-6 py-4 border-b border-white/10 mx-6">
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

            <div className="px-6 py-6 flex-1 overflow-y-auto custom-scrollbar">
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

      {/* Full-width Analytics Footer */}
      <div className="mt-8 pt-8 border-t border-white/40">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:items-stretch min-w-0">
          <div className="lg:col-span-3 h-full min-w-0">
            <TaskCompletionHeatmap tasks={activeContextTasks} className="h-full w-full" />
          </div>
          <div className="lg:col-span-2 h-full min-w-0">
            <TaskStatusDonut tasks={activeContextTasks} className="h-full w-full" />
          </div>
        </div>
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
      
      <GlobalSearch 
        projects={projects} 
        tasks={allTasks}
        open={isGlobalSearchOpen}
        onOpenChange={setIsGlobalSearchOpen}
        onProjectClick={(p) => {
          setSearchQuery(p.name)
        }}
        onTaskClick={(t) => {
          setSearchQuery(t.name)
        }}
      />
    </div>
  )
}
