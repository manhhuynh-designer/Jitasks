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
  Maximize2,
  Image as ImageIcon,
  GripVertical,
  Layers
} from 'lucide-react'
import { format, isPast, isToday, isBefore, addDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn, getCategoryColorStyles } from '@/lib/utils'
import { UpcomingTasksStrip } from '@/components/analytics/upcoming-tasks-strip'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragMoveEvent,
  DragOverlay,
  useDroppable,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { EditTaskDialog } from '@/components/tasks/edit-task-dialog'
import { AssigneeLoadPanel } from '@/components/analytics/assignee-load-panel'
import { AllStagesGroupOverview } from '@/components/analytics/all-stages-group-overview'
import { TaskDropOptionsDialog } from '@/components/tasks/task-drop-options-dialog'
import { ProjectDocuments } from '@/components/projects/project-documents'

function DropZone({ id, label, icon, color }: { id: string, label: string, icon: React.ReactNode, color: string }) {
  const { isOver, setNodeRef } = useDroppable({ id })
  
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-3 px-6 py-4 rounded-[2rem] transition-all duration-300 cursor-default",
        isOver 
          ? cn("bg-primary text-white scale-110 shadow-xl ring-2 ring-primary/10") 
          : cn("text-slate-500", color)
      )}
    >
      <div className={cn(
        "h-10 w-10 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
        isOver ? "bg-white/10" : "bg-slate-50"
      )}>
        {icon}
      </div>
      <span className={cn(
        "text-[12px] font-black uppercase tracking-widest leading-none",
        isOver ? "opacity-100" : "opacity-60"
      )}>
        {label}
      </span>
    </div>
  )
}

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
  
  const [isUpdateCoverOpen, setIsUpdateCoverOpen] = useState(false)
  const [coverUrl, setCoverUrl] = useState(project?.cover_url || '')
  const [defaultCoverUrl, setDefaultCoverUrl] = useState<string | null>(null)
  const [updatingCover, setUpdatingCover] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isImageValid, setIsImageValid] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const [taskToHandleDrop, setTaskToHandleDrop] = useState<Task | null>(null)
  const [isDropOptionsOpen, setIsDropOptionsOpen] = useState(false)
  const [dropPosition, setDropPosition] = useState<{ x: number, y: number } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (project?.name) {
      document.title = `${project.name} | Jitasks`
    }
  }, [project?.name])

  // Sync coverUrl when project changes
  useEffect(() => {
    if (project) {
      setCoverUrl(project.cover_url || '')
      
      // Fetch default Pexels cover if project has no cover
      if (!project.cover_url && !defaultCoverUrl) {
        fetch('/api/pexels')
          .then(res => res.json())
          .then(data => {
            if (data.photos && data.photos.length > 0) {
              // Pick a deterministic image based on project ID
              const charSum = project.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
              const index = charSum % data.photos.length
              setDefaultCoverUrl(data.photos[index])
            }
          })
          .catch(err => console.error('Error fetching default cover:', err))
      }
    }
  }, [project?.cover_url, project?.id, defaultCoverUrl])

  // Helper to convert Google Drive links to direct image links
  const convertDriveLink = (url: string): string => {
    if (!url || typeof url !== 'string') return url;
    
    // Nếu không phải Google URL thì trả về nguyên
    if (!url.includes('drive.google.com') && !url.includes('docs.google.com')) {
      return url;
    }

    // Ưu tiên pattern cụ thể nhất trước
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]{10,})/,      // /file/d/ID (most common share link)
      /[?&]id=([a-zA-Z0-9_-]{10,})/,          // ?id=ID or &id=ID
      /\/d\/([a-zA-Z0-9_-]{10,})(?:\/|$|\?)/  // /d/ID/ or /d/ID end (avoid partial match)
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) {
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
      }
    }

    // URL là Google nhưng không nhận diện được format → trả về nguyên
    return url;
  };

  const handleUpdateCover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return
    setUpdatingCover(true)
    try {
      const { error } = await supabase
        .from('projects')
        .update({ cover_url: coverUrl || null })
        .eq('id', project.id)
      
      if (error) throw error
      setIsUpdateCoverOpen(false)
      fetchData(true)
    } catch (err: any) {
      console.error("Error updating cover:", err)
      alert(`Lỗi khi cập nhật ảnh bìa: ${err.message || 'Chưa rõ nguyên nhân. Hãy chắc chắn bạn đã chạy lệnh SQL.'}`)
    } finally {
      setUpdatingCover(false)
    }
  }

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
        .is('deleted_at', null)
        .order('order_index', { ascending: true })

      const { data: pData } = await supabase
        .from('projects')
        .select('*, suppliers(name)')
        .eq('id', id)
        .single()
      
      const { data: tData } = await supabase
        .from('tasks')
        .select('*, assignees(id, full_name), task_groups(id, name)')
        .eq('project_id', id)
        .is('deleted_at', null)
        .order('deadline', { ascending: true })

      const { data: groupData } = await supabase
        .from('task_groups')
        .select('*')
        .eq('project_id', id)
        .is('deleted_at', null)
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
  }, [id, activeCategoryId])

  const handleStageChange = async (cat: {id: string, name: string}) => {
    if (!project) return
    setActiveCategoryId(cat.id)
    
    // Optomistic UI update
    const previousStatus = project.status
    setProject(prev => prev ? { ...prev, status: cat.name as any } : null)

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: cat.name as any })
        .eq('id', id)
      
      if (error) throw error
    } catch (err: any) {
      console.error("Error updating project stage:", err)
      // Revert on error
      setProject(prev => prev ? { ...prev, status: previousStatus } : null)
      alert(`Lỗi khi cập nhật giai đoạn: ${err.message}. Đảm bảo tên giai đoạn "${cat.name}" có trong danh sách cho phép.`)
    }
  }

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
              .select('*, assignees(id, full_name), task_groups(id, name)')
              .eq('id', payload.new.id)
              .single()
            
            if (data) {
              setTasks(prev => [...prev, data as any])
            }
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.deleted_at) {
              setTasks(prev => prev.filter(t => t.id !== payload.new.id))
            } else {
              setTasks(prev => prev.map(t => 
                t.id === payload.new.id ? { ...t, ...payload.new } : t
              ))
            }
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
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId)
    
    if (error) {
      console.error("Error deleting task:", error)
      return
    }
    
    setTasks(tasks.filter(t => t.id !== taskId))
  }

  // --- Drag and Drop Handlers ---

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find the containers
    const activeContainer = active.data.current?.sortable?.containerId || active.data.current?.containerId
    const overContainer = over.data.current?.sortable?.containerId || overId

    if (!activeContainer || !overContainer) return

    // Bỏ qua logic thay đổi mảng nếu đang hover vào thanh Bottom Actions
    if (['drop-delete', 'drop-ungrouped', 'drop-new-group'].includes(overContainer as string)) return

    if (activeContainer !== overContainer) {
      setTasks((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId)
        if (activeIndex === -1) return prev
        
        const newGroupId = overContainer === 'ungrouped' ? null : overContainer
        
        const updated = [...prev]
        updated[activeIndex] = { ...updated[activeIndex], task_group_id: newGroupId }
        return updated
      })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) {
      setDropPosition(null)
      return
    }

    // Handle Drop UI Zones (Delete, Ungrouped, New Group)
    if (over.id === 'drop-delete') {
      const taskId = active.id as string
      if (confirm('Bạn có chắc muốn xoá task này?')) {
        const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', taskId)
        if (error) console.error("Error deleting task:", error)
        fetchData(true)
      }
      return
    }

    if (over.id === 'drop-ungrouped') {
      const taskId = active.id as string
      const { error } = await supabase.from('tasks').update({ task_group_id: null }).eq('id', taskId)
      if (error) console.error("Error moving to ungrouped:", error)
      fetchData(true)
      return
    }

    if (over.id === 'drop-new-group') {
      const taskId = active.id as string
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        // Try to identify the category from the task container
        const activeContainer = active.data.current?.sortable?.containerId || active.data.current?.containerId
        
        // Find corresponding category if the container is a group
        if (activeContainer && activeContainer !== 'ungrouped') {
          const group = taskGroups.find(g => g.id === activeContainer)
          if (group) {
            setActiveCategoryId(group.category_id)
          } else {
            // Container might already be a category ID in some views
            setActiveCategoryId(activeContainer)
          }
        }
        
        setTaskToHandleDrop(task)
        
        // Lấy tọa độ thẻ lúc thả ra để hiển thị Dialog
        if (active.rect.current.translated) {
          setDropPosition({
            x: active.rect.current.translated.left + (active.rect.current.translated.width / 2),
            y: active.rect.current.translated.top
          })
        }
        
        setIsDropOptionsOpen(true)
      }
      return
    }

    if (active.data.current?.type !== 'Task') return

    const activeId = active.id as string
    const task = tasks.find(t => t.id === activeId)
    if (!task) return

    const groupId = task.task_group_id
    
    // Safety: ensure it's still assigned to the active category if we want to move it accurately
    // In this view we're mostly moving between groups in the same category anyway.

    const { error } = await supabase
      .from('tasks')
      .update({ task_group_id: groupId })
      .eq('id', activeId)

    if (error) {
      console.error('Error persisting DnD:', error.message)
      alert('Lỗi khi lưu vị trí task: ' + error.message)
      fetchData(true) // Rollback
    }
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
    <DndContext 
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-10 max-w-[1600px] mx-auto pb-32">
      {/* HEADER & STAGE BAR AREA WITH COVER BACKGROUND */}
      <div className="relative isolate px-8 pt-4 pb-1 group/cover transition-all duration-700 min-h-[300px] flex flex-col justify-end">
        {/* REPOSITIONED CHANGE COVER BUTTON */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsUpdateCoverOpen(true)}
          className="absolute top-4 right-4 h-8 w-8 rounded-lg bg-white/50 backdrop-blur-md border border-white/50 hover:bg-white/80 transition-all z-30 shadow-sm active:scale-90"
          title="Đổi ảnh bìa"
        >
          <ImageIcon className="h-4 w-4 text-slate-700" />
        </Button>

        {(project.cover_url || defaultCoverUrl) && (
          <div className="absolute -top-[8.5rem] w-screen left-1/2 -translate-x-1/2 bottom-0 z-0 overflow-hidden pointer-events-none translate-z-0">
            <img 
              src={convertDriveLink(project.cover_url || defaultCoverUrl || '')} 
              alt="Project Cover" 
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              className="w-full h-full object-cover opacity-100 contrast-[0.9] saturate-[1.1]" 
            />
            {/* Multi-layered gradients for depth and blending - using slate-50 to match bg-slate-50 */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-50/40 via-slate-50/10 to-slate-50" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-50/70 via-transparent to-slate-50/70" />
            <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent" />
          </div>
        )}

        <div className="relative z-10 space-y-12">
          <Button variant="ghost" onClick={() => router.back()} className="group hover:bg-transparent -ml-2 text-slate-500 hover:text-slate-800 transition-all font-bold uppercase tracking-widest text-[10px]">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Quay lại
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">{project.name}</h1>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsEditOpen(true)}
                    className="h-10 w-10 rounded-xl bg-white/60 backdrop-blur-md border border-white/50 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                  >
                    <Pencil className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsCloneOpen(true)}
                    className="h-10 w-10 rounded-xl bg-white/60 backdrop-blur-md border border-white/50 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      if (confirm('Bạn có chắc chắn muốn xoá project này?')) {
                        supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
                          if (!error) router.push('/')
                          else alert(`Lỗi: ${error.message}`)
                        })
                      }
                    }}
                    className="h-10 w-10 rounded-xl bg-white/60 backdrop-blur-md border border-white/50 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              {project.description && (
                <p className="text-sm font-medium text-slate-600/80 leading-relaxed italic max-w-2xl drop-shadow-sm line-clamp-2 hover:line-clamp-none transition-all cursor-default">
                  {project.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-10 gap-y-6 pb-2">
              <div className="flex items-center gap-3 group cursor-pointer text-slate-700">
                <div className="h-10 w-10 rounded-xl bg-white/60 backdrop-blur-md border border-white/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Building2 className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none mb-1">Supplier</p>
                  <p className="font-bold text-slate-800">{project.suppliers?.name || 'Chưa định danh'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-700">
                <div className="h-10 w-10 rounded-xl bg-white/60 backdrop-blur-md border border-white/50 flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none mb-1">Created At</p>
                  <p className="font-bold text-slate-800">{format(new Date(project.created_at), 'dd/MM/yyyy')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-4xl">
            <div className="relative flex items-center w-full bg-white/40 backdrop-blur-xl rounded-t-2xl border-x border-t border-white/60 overflow-hidden shadow-2xl shadow-slate-200/30">
              {categories.length > 0 ? categories.map((cat, index) => {
                const isSelected = activeCategoryId === cat.id
                const colorStyles = getCategoryColorStyles(cat.color)
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleStageChange(cat)}
                    className={cn(
                      "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative group border-none outline-none rounded-none",
                      isSelected 
                        ? cn("text-white z-10", colorStyles.className || 'bg-slate-800') 
                        : "text-slate-500 hover:text-slate-800 hover:bg-white/40 font-bold"
                    )}
                    style={isSelected ? colorStyles.style : {}}
                  >
                    <span className="relative z-10">{index + 1}. {cat.name}</span>
                    {isSelected && (
                      <div className="absolute inset-0 bg-inherit animate-in fade-in zoom-in-95 duration-300" />
                    )}
                  </button>
                )
              }) : (
                <p className="px-4 py-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest italic animate-pulse w-full text-center">
                  ⚠️ Cần chạy SQL (setup_dynamic_categories) để hiển thị Giai đoạn
                </p>
              )}
            </div>
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
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto ">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Tìm task..." 
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    className="pl-9 h-10 w-full sm:w-[200px] rounded-xl bg-slate-50 border-slate-200 font-medium"
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
                {/* Dual Button Group: New Task & Add Group */}
                <div className="flex items-center h-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 overflow-hidden ring-1 ring-white/10 shrink-0">
                  <NewTaskDialog 
                    projectId={project.id} 
                    initialCategoryId={activeCategoryId || undefined}
                    onTaskCreated={() => fetchData(true)} 
                    trigger={
                      <button className="h-full pl-4 pr-3 flex items-center gap-2 hover:bg-white/10 transition-all font-bold text-xs active:scale-[0.98]">
                        <Plus className="h-4 w-4" />
                        <span>Task mới</span>
                      </button>
                    }
                  />
                  {activeCategoryId && (
                    <>
                      <div className="w-[1px] h-4 bg-white/20 shrink-0" />
                      <AddGroupDialog 
                        projectId={project.id} 
                        categoryId={activeCategoryId} 
                        onGroupCreated={() => fetchData(true)} 
                        trigger={
                          <button className="h-full pl-3 pr-4 flex items-center gap-2 hover:bg-white/10 transition-all font-bold text-xs active:scale-[0.98]">
                            <Plus className="h-3.5 w-3.5 opacity-70" />
                            <span>Thêm nhóm</span>
                          </button>
                        }
                      />
                    </>
                  )}
                </div>
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
                        onRefresh={() => fetchData(true)}
                      />
                    ))}
                  </div>

                {expandedGroupId && activeGroup && (
                  <GroupTimelineModal 
                    open={!!expandedGroupId}
                    onOpenChange={(open) => !open && setExpandedGroupId(null)}
                    group={activeGroup as any}
                    onTaskClick={handleTaskClick}
                    onTaskUpdated={() => fetchData(true)}
                    tasks={activeGroup.tasks}
                    projectId={project.id}
                    categoryId={activeCategoryId!}
                  />
                )}
              </div>
            )
          })()}
        </div>

        <div className="lg:col-span-4">
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Project Summary</h3>

            {/* [1] PROGRESS CARD */}
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
                  <div className="h-full bg-primary transition-all duration-700 ease-out shadow-lg shadow-primary/20"
                    style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 flex justify-between">
                  <span>{completedTasks} tasks done</span>
                  <span>{tasks.length} total</span>
                </p>

                {/* ✅ MỚI: Mini Stats Row */}
                {tasks.length > 0 && (() => {
                  const overdue    = tasks.filter(t => t.status !== 'done' && t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline))).length
                  const dueToday   = tasks.filter(t => t.status !== 'done' && t.deadline && isToday(new Date(t.deadline))).length
                  const inProgress = tasks.filter(t => t.status === 'inprogress').length
                  return (
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 rounded-2xl p-3 text-center">
                        <p className="text-lg font-black text-blue-600 leading-none">{inProgress}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mt-1">Đang làm</p>
                      </div>
                      <div className={cn("rounded-2xl p-3 text-center", dueToday > 0 ? "bg-violet-50" : "bg-slate-50")}>
                        <p className={cn("text-lg font-black leading-none", dueToday > 0 ? "text-violet-600" : "text-slate-400")}>
                          {dueToday > 0 ? dueToday : '–'}
                        </p>
                        <p className={cn("text-[9px] font-black uppercase tracking-widest mt-1", dueToday > 0 ? "text-violet-400" : "text-slate-300")}>
                          Hôm nay
                        </p>
                      </div>
                      <div className={cn("rounded-2xl p-3 text-center", overdue > 0 ? "bg-rose-50" : "bg-slate-50")}>
                        <p className={cn("text-lg font-black leading-none", overdue > 0 ? "text-rose-500" : "text-slate-400")}>
                          {overdue > 0 ? overdue : '✓'}
                        </p>
                        <p className={cn("text-[9px] font-black uppercase tracking-widest mt-1", overdue > 0 ? "text-rose-400" : "text-slate-300")}>
                          Quá hạn
                        </p>
                      </div>
                    </div>
                  )
                })()}

                {/* Tasks by Stage */}
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
                            <div 
                              className={cn("h-2 w-2 rounded-full", getCategoryColorStyles(cat.color).className)} 
                              style={getCategoryColorStyles(cat.color).style}
                            />{cat.name}
                          </div>
                          <span className="text-slate-400">{catDone} / {catTasks.length}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* [1.5] Project Documents Widget */}
            <ProjectDocuments projectId={project.id} />

            {/* [2] Upcoming Tasks Strip */}
            <UpcomingTasksStrip tasks={tasks} onTaskClick={handleTaskClick} />

            {/* [3] All Stages Group Overview */}
            <AllStagesGroupOverview
              categories={categories}
              taskGroups={taskGroups}
              tasks={tasks}
              activeCategoryId={activeCategoryId}
              onGroupClick={(groupId, categoryId) => {
                setActiveCategoryId(categoryId)
                setExpandedGroupId(groupId)
              }}
            />

          {/* [4] Assignee Load Panel */}
          <AssigneeLoadPanel tasks={tasks} />
        </div>
      </div>
      </div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: { active: { opacity: '0.5' } },
        }),
      }}>
        {activeId ? (
          <div className="bg-white border-2 border-primary/20 rounded-2xl p-4 shadow-2xl ring-4 ring-primary/5 cursor-grabbing scale-105 rotate-1 flex items-center gap-3">
            <GripVertical className="h-4 w-4 text-primary" />
            <div className="flex-1">
              <h5 className="text-[13px] font-bold text-slate-700 tracking-tight">
                {tasks.find(t => t.id === activeId)?.name}
              </h5>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {tasks.find(t => t.id === activeId)?.status}
              </p>
            </div>
          </div>
        ) : null}
      </DragOverlay>

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

      {/* Update Cover Dialog */}
      <Dialog open={isUpdateCoverOpen} onOpenChange={setIsUpdateCoverOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none glass-premium p-8 shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-900/10 flex items-center justify-center mb-2">
              <ImageIcon className="h-6 w-6 text-slate-900" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Cập nhật ảnh bìa</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Nhập liên kết hình ảnh để thay đổi nền cho thanh giai đoạn. (Lưu ý: Nếu dùng Google Drive, hãy chọn "Bất kỳ ai có liên kết đều có thể xem")
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateCover} className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="cover-url" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Link ảnh bìa</Label>
              <div className="relative group">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                <Input 
                  id="cover-url" 
                  placeholder="https://example.com/image.jpg" 
                  value={coverUrl}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const converted = convertDriveLink(raw);
                    setCoverUrl(converted);
                    setIsImageValid(true);
                    if (converted) {
                      setIsPreviewLoading(true);
                    } else {
                      setIsPreviewLoading(false);
                    }
                  }}
                  className="rounded-2xl h-14 bg-slate-50 border-none focus-visible:ring-primary/20 font-medium pl-11 shadow-inner"
                />
              </div>
            </div>

            {coverUrl && (
              <div className="relative rounded-2xl overflow-hidden aspect-[21/9] bg-slate-100 border-2 border-slate-100">
                {isPreviewLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm z-10 gap-3">
                    <div className="h-8 w-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Đang tải preview...</p>
                  </div>
                )}
                <img 
                  src={coverUrl} 
                  alt="Preview" 
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  className={cn("w-full h-full object-cover transition-opacity duration-300", isPreviewLoading ? "opacity-0" : "opacity-100")} 
                  onLoad={() => {
                    setIsPreviewLoading(false);
                    setIsImageValid(true);
                  }}
                  onError={(e) => {
                    setIsPreviewLoading(false);
                    setIsImageValid(false);
                    e.currentTarget.src = 'https://placehold.co/600x200?text=Link+hình+không+hợp+lệ';
                  }} 
                />
                {!isPreviewLoading && !isImageValid && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-50/90 z-10 gap-2">
                    <AlertCircle className="h-8 w-8 text-rose-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Link hình không hiển thị được</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button 
                type="submit" 
                disabled={updatingCover || isPreviewLoading || (!isImageValid && coverUrl !== "")} 
                className="w-full rounded-2xl h-14 font-black text-lg bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                {updatingCover ? 'Đang cập nhật...' : isPreviewLoading ? 'Đang kiểm tra hình...' : 'Cập nhật ngay'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {editingTask && (
        <EditTaskDialog
          task={editingTask as Task}
          open={isEditTaskOpen}
          onOpenChange={(open: boolean) => {
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

      {/* Bottom Drop Toolbar */}
      <div 
        className={cn(
          "fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-out",
          activeId ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0 pointer-events-none"
        )}
      >
        <div className="bg-white/90 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200/60 p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] flex items-center gap-2 overflow-hidden ring-1 ring-slate-900/5">
          <DropZone id="drop-ungrouped" label="Chưa phân nhóm" icon={<Layers className="h-5 w-5" />} color="hover:text-blue-600 hover:bg-blue-50" />
          <DropZone id="drop-new-group" label="Tạo nhóm mới" icon={<Plus className="h-5 w-5" />} color="hover:text-emerald-600 hover:bg-emerald-50" />
          <div className="w-[1px] h-8 bg-slate-100 mx-1" />
          <DropZone id="drop-delete" label="Xoá vĩnh viễn" icon={<Trash2 className="h-5 w-5" />} color="hover:text-rose-600 hover:bg-rose-50" />
        </div>
      </div>

      <TaskDropOptionsDialog 
        task={taskToHandleDrop}
        projectId={project?.id as string}
        categoryId={activeCategoryId || categories[0]?.id || ''}
        open={isDropOptionsOpen}
        initialStep="create_group"
        onOpenChange={(open) => {
          setIsDropOptionsOpen(open)
          if (!open) {
            setDropPosition(null)
          }
        }}
        position={dropPosition || undefined}
        onActionComplete={() => {
          fetchData(true)
          setIsDropOptionsOpen(false)
          setDropPosition(null)
        }}
      />
      </div>
    </DndContext>
  )
}
