'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Project } from '@/hooks/use-projects'
import { Task } from '@/hooks/use-tasks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Link as LinkIcon,
  Copy,
  Search,
  ArrowUpDown,
  Maximize2
} from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { EditProjectDialog } from '@/components/projects/edit-project-dialog'
import { NewTaskDialog } from '@/components/tasks/new-task-dialog'
import { MiniGanttCard } from '@/components/gantt/mini-gantt-card'
import { GroupTimelineModal } from '@/components/gantt/group-timeline-modal'
import { AddGroupDialog } from '@/components/gantt/add-group-dialog'
import { EditGroupDialog } from '@/components/gantt/edit-group-dialog'
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
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false)
  const editingTask = tasks.find(t => t.id === editingTaskId)
  const [categories, setCategories] = useState<{id: string, name: string, color: string}[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [taskGroups, setTaskGroups] = useState<{
    id: string, 
    name: string, 
    category_id: string,
    start_date?: string | null,
    deadline?: string | null
  }[]>([])
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  
  const [isCloneOpen, setIsCloneOpen] = useState(false)
  const [taskSearchQuery, setTaskSearchQuery] = useState('')
  const [taskSortOrder, setTaskSortOrder] = useState<'asc' | 'desc'>('asc')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  
  const handleTaskClick = useCallback((taskId: string) => {
    setEditingTaskId(taskId)
    setIsEditTaskOpen(true)
  }, [])

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
        .select('*, assignees(full_name), task_groups(id, name)')
        .eq('project_id', id)
        .order('deadline', { ascending: true })

      const { data: groupData } = await supabase
        .from('task_groups')
        .select('*')
        .eq('project_id', id)
        .order('order_index', { ascending: true })

      if (catData) setCategories(catData)
      if (groupData) setTaskGroups(groupData)
      if (pData) {
        setProject(pData)
        // Improved category initialization
        let foundCatId = null
        if (catData) {
          const matchingCat = catData.find((c: any) => c.name.toLowerCase() === pData.status.toLowerCase())
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


  const groups = useMemo(() => {
    let filteredTasks = tasks.filter(t => t.category_id === activeCategoryId || (!t.category_id && activeCategoryId === categories[0]?.id))
    
    if (taskSearchQuery) {
      filteredTasks = filteredTasks.filter(t => t.name.toLowerCase().includes(taskSearchQuery.toLowerCase()))
    }
    
    filteredTasks.sort((a, b) => {
      const dateA = new Date(a.deadline).getTime()
      const dateB = new Date(b.deadline).getTime()
      return taskSortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

    const currentGroups = taskGroups.filter(g => g.category_id === activeCategoryId)
    const result: {id: string, name: string, start_date?: string | null, deadline?: string | null, tasks: Task[]}[] = []

    // Add explicit groups
    currentGroups.forEach(group => {
      const gTasks = filteredTasks.filter(t => t.task_group_id === group.id)
      
      const validStarts = gTasks.map(t => t.start_date ? new Date(t.start_date).getTime() : NaN).filter(n => !isNaN(n))
      const validEnds = gTasks.map(t => t.deadline ? new Date(t.deadline).getTime() : NaN).filter(n => !isNaN(n))
      
      const computedStart = validStarts.length > 0 ? new Date(Math.min(...validStarts)).toISOString() : group.start_date
      const computedEnd = validEnds.length > 0 ? new Date(Math.max(...validEnds)).toISOString() : group.deadline

      result.push({
        id: group.id,
        name: group.name,
        start_date: computedStart,
        deadline: computedEnd,
        tasks: gTasks
      })
    })

    // Add ungrouped tasks
    const ungrouped = filteredTasks.filter(t => !t.task_group_id || !currentGroups.find(g => g.id === t.task_group_id))
    if (ungrouped.length > 0) {
      const validStarts = ungrouped.map(t => t.start_date ? new Date(t.start_date).getTime() : NaN).filter(n => !isNaN(n));
      const validEnds = ungrouped.map(t => t.deadline ? new Date(t.deadline).getTime() : NaN).filter(n => !isNaN(n));
      
      const minDate = validStarts.length > 0 ? new Date(Math.min(...validStarts)).toISOString() : new Date().toISOString();
      const maxDate = validEnds.length > 0 ? new Date(Math.max(...validEnds)).toISOString() : new Date(Date.now() + 86400000 * 7).toISOString();

      result.push({
        id: 'ungrouped',
        name: 'Chưa phân nhóm',
        start_date: minDate,
        deadline: maxDate,
        tasks: ungrouped
      })
    }

    return result
  }, [tasks, activeCategoryId, categories, taskGroups, taskSearchQuery, taskSortOrder])

  useEffect(() => {
    if (!id) return

    // 1. Initial Fetch
    fetchData()

    // 2. Realtime Subscription
    const channel = supabase
      .channel(`project-tasks-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${id}`
        },
        async (payload) => {
          console.log('Realtime task change:', payload)
          
          if (payload.eventType === 'INSERT') {
            // For inserts, we might need the joined data (assignees, task_groups)
            // so we do a silent targeted fetch for this specific task
            const { data } = await supabase
              .from('tasks')
              .select('*, assignees(full_name), task_groups(id, name)')
              .eq('id', payload.new.id)
              .single()
            
            if (data) {
              setTasks(prev => [...prev, data as any])
            }
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => 
              t.id === payload.new.id ? { ...t, ...payload.new } : t
            ))
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id === payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, fetchData])

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
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsEditOpen(true)}
                  className="h-10 w-10 rounded-xl bg-slate-100/50 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                >
                  <Pencil className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsCloneOpen(true)}
                  className="h-10 w-10 rounded-xl bg-slate-100/50 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                >
                  <Copy className="h-5 w-5" />
                </Button>
              </div>
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
                onClick={() => setActiveCategoryId(cat.id)}
                className={cn(
                  "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative group border-none outline-none rounded-none",
                  activeCategoryId === cat.id 
                    ? cn("text-white z-10", cat.color || 'bg-slate-800') 
                    : "bg-slate-50 text-slate-400 hover:bg-white hover:text-slate-600"
                )}
                style={activeCategoryId !== cat.id ? { 
                  backgroundColor: `${cat.color === 'bg-blue-500' ? '#eff6ff' : cat.color === 'bg-emerald-500' ? '#ecfdf5' : '#f8fafc'}`,
                  color: `${cat.color === 'bg-blue-500' ? '#3b82f6' : cat.color === 'bg-emerald-500' ? '#10b981' : '#94a3b8'}`,
                  opacity: 0.6
                } : {}}
              >
                {cat.name}
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
           <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <ListTodo className="h-6 w-6 text-primary" />
                  Danh sách Task
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Tìm task..." 
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    className="pl-9 h-10 w-full sm:w-[200px] rounded-xl bg-slate-50 border-none font-medium"
                  />
                  {isRefreshing && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setTaskSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="h-10 rounded-xl bg-slate-50 hover:bg-slate-100 font-bold text-slate-600 gap-2 px-3"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {taskSortOrder === 'desc' ? 'Gần nhất' : 'Xa nhất'}
                </Button>
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
                {activeCategoryId && (
                  <AddGroupDialog 
                    projectId={project.id} 
                    categoryId={activeCategoryId} 
                    onGroupCreated={() => fetchData(true)} 
                    trigger={
                      <Button
                        className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-2 px-4 shadow-lg shadow-slate-200"
                      >
                        <Plus className="h-4 w-4" />
                        Thêm nhóm
                      </Button>
                    }
                  />
                )}
              </div>
           </div>

                    {(() => {
                      const activeGroup = groups.find((g: any) => g.id === expandedGroupId)
                      
                      if (groups.length === 0) {
                        return (
                          <div className="py-20 text-center glass-premium rounded-[2.5rem] border-dashed border-2 border-slate-200 flex flex-col items-center gap-4">
                            <div className="h-16 w-16 rounded-[2rem] bg-slate-50 flex items-center justify-center">
                              <AlertCircle className="h-8 w-8 text-slate-200" />
                            </div>
                            <div>
                              <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No tasks found</p>
                              <p className="text-slate-400 text-sm font-medium mt-1">Bắt đầu bằng cách thêm task mới.</p>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div key={activeCategoryId} className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
                          {/* Grid of Mini Gantt Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {groups.map(group => (
                              <MiniGanttCard 
                                key={group.id}
                                group={group as any}
                                tasks={group.tasks}
                                onExpand={(id) => setExpandedGroupId(id)}
                                onCardClick={() => setExpandedGroupId(group.id)}
                                onTaskClick={handleTaskClick}
                                onEditGroup={(id) => setEditingGroupId(id)}
                              />
                            ))}
                          </div>

                          {/* Full Timeline Modal */}
                          {expandedGroupId && activeGroup && (
                            <GroupTimelineModal 
                              open={!!expandedGroupId}
                              onOpenChange={(open) => !open && setExpandedGroupId(null)}
                              group={activeGroup as any}
                              onTaskClick={handleTaskClick}
                              onTaskUpdated={() => fetchData(true)}
                              tasks={activeGroup.tasks}
                            />
                          )}
                        </div>
                      )
                    })()}
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

                   {categories.length > 0 && tasks.length > 0 && (
                     <div className="mt-6 space-y-3 pt-6 border-t border-slate-100/50">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tasks by Stage</p>
                       {categories.map(cat => {
                         const catTasks = tasks.filter(t => t.category_id === cat.id || (!t.category_id && cat.id === categories[0]?.id))
                         if (catTasks.length === 0) return null
                         const catDone = catTasks.filter(t => t.status === 'done').length
                         
                         return (
                           <div key={cat.id} className="flex items-center justify-between text-xs font-bold">
                             <div className="flex items-center gap-2 text-slate-600">
                               <div className={cn("h-2 w-2 rounded-full", cat.color)} />
                               {cat.name}
                             </div>
                             <span className="text-slate-400">
                               {catDone} / {catTasks.length}
                             </span>
                           </div>
                         )
                       })}
                     </div>
                   )}
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

      <EditProjectDialog 
        project={project} 
        open={isCloneOpen} 
        onOpenChange={setIsCloneOpen} 
        onProjectUpdated={fetchData} 
        isClone={true}
      />

      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          open={isEditTaskOpen}
          onOpenChange={(open) => {
            setIsEditTaskOpen(open)
            if (!open) setEditingTaskId(null)
          }}
          onTaskUpdated={() => fetchData(true)}
        />
      )}

      <EditGroupDialog
        groupId={editingGroupId}
        open={!!editingGroupId}
        onOpenChange={(open) => !open && setEditingGroupId(null)}
        onGroupUpdated={() => fetchData(true)}
      />
    </div>
  )
}
