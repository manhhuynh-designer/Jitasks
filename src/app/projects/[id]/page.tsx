'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Project } from '@/hooks/use-projects'
import { Task } from '@/hooks/use-tasks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Plus, 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  User, 
  CheckCircle2, 
  Circle, 
  PlayCircle,
  MoreHorizontal,
  Clock,
  Trash2,
  Check,
  Building2,
  ListTodo,
  AlertCircle,
  Pencil,
  ChevronDown,
  Settings,
  Flag,
  Link as LinkIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { EditProjectDialog } from '@/components/projects/edit-project-dialog'
import { NewTaskDialog } from '@/components/tasks/new-task-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { EditTaskDialog } from '@/components/tasks/edit-task-dialog'

export default function ProjectDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false)
  const [categories, setCategories] = useState<{id: string, name: string, color: string}[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setInitialLoading(true)
    else setIsRefreshing(true)
    
    // Ensure the loading state is visible for at least 400ms for smoother perception
    const minDelay = isSilent ? new Promise(resolve => setTimeout(resolve, 600)) : Promise.resolve()
    
    try {
      const { data: catData } = await supabase
        .from('project_categories')
        .select('*')
        .order('order_index', { ascending: true })

      const { data: pData } = await supabase
        .from('projects')
        .select('*, suppliers(name)')
        .eq('id', id)
        .single()
      
      const { data: tData } = await supabase
        .from('tasks')
        .select('*, assignees(full_name)')
        .eq('project_id', id)
        .order('deadline', { ascending: true })

      if (catData) setCategories(catData)
      if (pData) {
        setProject(pData)
        // Improved category initialization
        let foundCatId = null
        if (catData) {
          const matchingCat = catData.find((c: any) => c.name === pData.status)
          if (matchingCat) foundCatId = matchingCat.id
          else if (catData.length > 0) foundCatId = catData[0].id
        }
        
        if (!activeCategoryId && foundCatId) {
          setActiveCategoryId(foundCatId)
        }
      }
      if (tData) setTasks(tData as any)
      
      // Wait for the minimum delay if necessary
      await minDelay
    } finally {
      if (!isSilent) setInitialLoading(false)
      setIsRefreshing(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus as any })
      .eq('id', taskId)
    
    if (error) {
      console.error("Error updating task status:", error)
      return
    }
    
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t))
  }

  const updateTaskPriority = async (taskId: string, newPriority: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ priority: newPriority as any })
      .eq('id', taskId)
    
    if (error) {
      console.error("Error updating task priority:", error)
      return
    }
    
    setTasks(tasks.map(t => t.id === taskId ? { ...t, priority: newPriority as any } : t))
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Bạn có chắc muốn xóa task này?')) return
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
    
    if (error) {
      console.error("Error deleting task:", error)
      return
    }
    
    setTasks(tasks.filter(t => t.id !== taskId))
  }

  if (initialLoading) return (
    <div className="p-8 space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="h-10 w-64 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-10 w-10 bg-slate-100 rounded-xl animate-pulse" />
      </div>
      <div className="h-14 w-full max-w-4xl bg-slate-100 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-4">
          <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse" />
          {[1, 2, 3].map(i => <div key={i} className="h-32 w-full bg-slate-50 rounded-2xl animate-pulse" />)}
        </div>
        <div className="lg:col-span-4 space-y-8">
          <div className="h-64 w-full bg-slate-50 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  )
  if (!project) return <div className="p-8 text-center text-slate-400 font-medium">Không tìm thấy project</div>

  const STATUS_CONFIG = {
    todo: { label: 'To Do', color: 'bg-slate-500', ghost: 'bg-slate-100 text-slate-500' },
    inprogress: { label: 'In Progress', color: 'bg-sky-400', ghost: 'bg-sky-50 text-sky-600' },
    pending: { label: 'Pending', color: 'bg-orange-400', ghost: 'bg-orange-50 text-orange-600' },
    done: { label: 'Done', color: 'bg-emerald-500', ghost: 'bg-emerald-50 text-emerald-600' },
  }

  const PRIORITY_CONFIG = {
    low: { label: 'Low', color: 'text-slate-400' },
    medium: { label: 'Medium', color: 'text-indigo-400' },
    high: { label: 'High', color: 'text-rose-500' },
    critical: { label: 'Critical', color: 'text-red-600' },
  }

  const completedTasks = tasks.filter(t => t.status === 'done').length
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

  return (
    <div className="space-y-10 max-w-[1600px] mx-auto pb-20">
      <Button variant="ghost" onClick={() => router.back()} className="group hover:bg-transparent -ml-2 text-slate-500 hover:text-slate-800 transition-all font-bold uppercase tracking-widest text-[10px]">
        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Quay lại
      </Button>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">{project.name}</h1>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsEditOpen(true)}
                className="h-10 w-10 rounded-xl bg-slate-100/50 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
              >
                <Pencil className="h-5 w-5" />
              </Button>
            </div>

            <div className="hidden lg:block h-10 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Building2 className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Supplier</p>
                  <p className="font-bold text-slate-700">{project.suppliers?.name || 'Chưa định danh'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Created At</p>
                  <p className="font-bold text-slate-700">{format(new Date(project.created_at), 'dd MMM yyyy')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center w-full max-w-4xl bg-slate-100/50 backdrop-blur-md rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {categories.length > 0 ? categories.map((cat, index) => (
              <button
                key={cat.id}
                onClick={async () => {
                   if (project.status === cat.name) return
                   
                   // Optimistic UI updates
                   setActiveCategoryId(cat.id)
                   setProject({ ...project, status: cat.name as any })
                   
                   // Start silent refresh
                   fetchData(true)
                   
                   // Background update
                   await supabase
                    .from('projects')
                    .update({ status: cat.name as any })
                    .eq('id', project.id)
                }}
                className={cn(
                  "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative group border-none outline-none rounded-none",
                  project.status === cat.name 
                    ? cn("text-white z-10", cat.color) 
                    : cn("bg-slate-50 text-slate-400 hover:bg-white hover:text-slate-600")
                )}
                style={project.status !== cat.name ? { 
                  backgroundColor: `${cat.color === 'bg-blue-500' ? '#eff6ff' : cat.color === 'bg-emerald-500' ? '#ecfdf5' : '#f8fafc'}`,
                  color: `${cat.color === 'bg-blue-500' ? '#3b82f6' : cat.color === 'bg-emerald-500' ? '#10b981' : '#94a3b8'}`,
                  opacity: 0.6
                } : {}}
              >
                {cat.name}
                {project.status === cat.name && (
                   <span className="absolute inset-0 bg-white/10 animate-pulse" />
                )}
                {/* Visual separator except for the last item */}
                {index < categories.length - 1 && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-[1px] bg-slate-200 group-hover:bg-transparent transition-colors" />
                )}
              </button>
            )) : (
              <p className="px-4 py-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest italic animate-pulse w-full text-center">
                ⚠️ Cần chạy SQL (setup_dynamic_categories) để hiển thị Giai đoạn
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-10">
           <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                <ListTodo className="h-6 w-6 text-primary" />
                Danh sách Task
              </h3>
              <NewTaskDialog 
                projectId={project.id} 
                initialCategoryId={activeCategoryId || undefined}
                onTaskCreated={() => fetchData(true)} 
                trigger={
                  <Button 
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-90"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                }
              />
           </div>

           {isRefreshing ? (
             <div className="space-y-4 animate-in fade-in duration-500">
               {[1, 2, 3].map(i => (
                 <div key={i} className="h-24 w-full bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 animate-pulse flex items-center px-6 gap-4">
                   <div className="h-10 w-10 rounded-full bg-slate-100" />
                   <div className="space-y-2 flex-1">
                     <div className="h-4 w-1/3 bg-slate-100 rounded" />
                     <div className="h-3 w-1/2 bg-slate-100/50 rounded" />
                   </div>
                 </div>
               ))}
             </div>
           ) : (
             <div key={activeCategoryId} className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                {tasks.filter(t => t.category_id === activeCategoryId || (!t.category_id && activeCategoryId === categories[0]?.id)).length > 0 ? (
                  tasks.filter(t => t.category_id === activeCategoryId || (!t.category_id && activeCategoryId === categories[0]?.id)).map(task => (
                    <Card key={task.id} className="border-none shadow-none hover:bg-slate-50/50 transition-all group rounded-2xl overflow-visible cursor-pointer" onClick={() => {
                        setEditingTask(task)
                        setIsEditTaskOpen(true)
                      }}>
                    <CardContent className="p-4 flex items-center gap-4 overflow-visible">
                      {/* Status Dropdown */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                           <DropdownMenuTrigger
                              render={
                                 <button 
                                    className={cn(
                                      "h-8 w-8 rounded-xl flex items-center justify-center transition-all border-2 text-white shadow-sm",
                                      STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG].color,
                                      "border-transparent hover:scale-110 active:scale-95"
                                    )}
                                 >
                                    {task.status === 'done' ? <CheckCircle2 className="h-4 w-4" /> : 
                                     task.status === 'inprogress' ? <PlayCircle className="h-4 w-4" /> : 
                                     task.status === 'pending' ? <Clock className="h-4 w-4" /> : 
                                     <Circle className="h-4 w-4" />}
                                 </button>
                              }
                           />
                           <DropdownMenuContent className="rounded-2xl border-none glass-premium shadow-2xl p-2 w-44">
                              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                 <DropdownMenuItem 
                                    key={key} 
                                    onClick={() => updateTaskStatus(task.id, key)}
                                    className="rounded-xl px-4 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary font-bold text-[10px] uppercase tracking-widest gap-2"
                                 >
                                    <div className={cn("h-2 w-2 rounded-full", config.color)} />
                                    {config.label}
                                 </DropdownMenuItem>
                              ))}
                           </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                           <h4 className={cn("text-sm font-bold tracking-tight", task.status === 'done' && "line-through text-slate-400")}>
                             {task.name}
                           </h4>
                           {/* Status Badge */}
                           <Badge className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border-none", STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG].ghost)}>
                              {STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG].label}
                           </Badge>
                        </div>
                        
                        {task.description && (
                          <p className="text-xs text-slate-400 font-medium line-clamp-1 mt-0.5">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-1.5">
                          {/* Date Range */}
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <Clock className="h-3 w-3" />
                            {task.start_date ? format(new Date(task.start_date), 'dd/MM') : '??'} - {format(new Date(task.deadline), 'dd/MM/yyyy')}
                          </div>
                          
                          {/* Assignee */}
                          {task.assignee_id && (
                             <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                <User className="h-3 w-3 text-slate-400" />
                                <span>{(task as any).assignees?.full_name?.split(' ').pop()}</span>
                             </div>
                          )}

                          {/* Priority Flag Interactive */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <Popover>
                               <PopoverTrigger
                                  render={
                                     <button 
                                        title={PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG].label}
                                        className={cn("flex items-center gap-1 transition-transform active:scale-90", PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG].color)}
                                     >
                                        <Flag className="h-3.5 w-3.5 fill-current" />
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-80 transition-opacity">
                                          {task.priority}
                                        </span>
                                     </button>
                                  }
                               />
                               <PopoverContent className="w-40 rounded-2xl border-none glass-premium shadow-2xl p-2" align="start">
                                  <div className="space-y-1">
                                     {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                        <button 
                                           key={key}
                                           onClick={() => updateTaskPriority(task.id, key)}
                                           className={cn(
                                              "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/50 transition-colors",
                                              config.color
                                           )}
                                        >
                                           <Flag className="h-4 w-4 fill-current" />
                                           {config.label}
                                        </button>
                                     ))}
                                  </div>
                               </PopoverContent>
                            </Popover>
                          </div>

                          {/* Links Indicator */}
                          {task.links && task.links.length > 0 && (
                             <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
                                <LinkIcon className="h-3 w-3" />
                                <span>{task.links.length}</span>
                             </div>
                          )}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 rounded-xl">
                              <MoreHorizontal className="h-4 w-4 text-slate-400" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="rounded-2xl border-none glass-premium shadow-2xl p-2 w-40">
                          <DropdownMenuItem 
                            onClick={() => {
                              setEditingTask(task)
                              setIsEditTaskOpen(true)
                            }}
                            className="rounded-xl px-4 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary font-bold text-xs gap-2"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Sửa task
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteTask(task.id)}
                            className="rounded-xl px-4 py-2 cursor-pointer focus:bg-red-50 focus:text-red-500 font-bold text-xs gap-2 text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Xóa task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="py-20 text-center glass-premium rounded-[2.5rem] border-dashed border-2 border-slate-200 flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-[2rem] bg-slate-50 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-slate-200" />
                  </div>
                  <div>
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No tasks found</p>
                    <p className="text-slate-400 text-sm font-medium mt-1">Bắt đầu bằng cách thêm task mới.</p>
                  </div>
                </div>
              )}
           </div>
           )}
        </div>

        <div className="lg:col-span-4 space-y-10">
           <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Project Summary</h3>
              
              {/* Progress Card */}
              <Card className="rounded-[2.5rem] border-none glass-premium overflow-hidden">
                <CardContent className="p-8">
                   <div className="flex items-center justify-between mb-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completion</p>
                        <h4 className="text-3xl font-black text-primary tracking-tight">{progress}%</h4>
                      </div>
                      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="h-7 w-7 text-primary" />
                      </div>
                   </div>
                   <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-700 ease-out shadow-lg shadow-primary/20" 
                        style={{ width: `${progress}%` }} 
                      />
                   </div>
                   <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 flex justify-between">
                     <span>{completedTasks} tasks done</span>
                     <span>{tasks.length} total</span>
                   </p>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="rounded-[2.5rem] border-none bg-white shadow-xl shadow-slate-200/50">
                <CardHeader className="pb-2 px-8 pt-8">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                    {project.description || 'Không có mô tả chi tiết cho project này.'}
                  </p>
                </CardContent>
              </Card>
           </div>
        </div>
      </div>

      <EditProjectDialog 
        project={project} 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
        onProjectUpdated={fetchData} 
      />

      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          open={isEditTaskOpen}
          onOpenChange={setIsEditTaskOpen}
          onTaskUpdated={fetchData}
        />
      )}
    </div>
  )
}
