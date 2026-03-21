'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '../ui/badge'
import { Check, Calendar as CalendarIcon, ListTodo, Pencil, User, Trash2, Plus, Circle, PlayCircle, Clock, CheckCircle2, ExternalLink, MessageSquare, Link2, Download, Send, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover"
import { Task } from '@/hooks/use-tasks'
import { Textarea } from '../ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"

import { STATUS_OPTIONS, getStatusInfo } from '@/lib/status-utils'

import { PRIORITY_OPTIONS, getPriorityInfo } from '@/lib/priority-utils'

export function EditTaskDialog({ 
  task, 
  open, 
  onOpenChange, 
  onTaskUpdated 
}: { 
  task: Task, 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  onTaskUpdated: () => void 
}) {
  const [name, setName] = useState(task.name)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState(task.priority)
  const [status, setStatus] = useState(task.status)
  const [startDate, setStartDate] = useState<Date>(task.start_date ? new Date(task.start_date) : new Date())
  const [deadline, setDeadline] = useState<Date>(new Date(task.deadline))
  
  const minutesToTime = (val: any) => {
    if (typeof val === 'number') {
      const h = Math.floor(val / 60).toString().padStart(2, '0')
      const m = (val % 60).toString().padStart(2, '0')
      return `${h}:${m}`
    }
    return typeof val === 'string' && val ? val : '09:00'
  }
  const [taskTime, setTaskTime] = useState(minutesToTime(task.task_time))
  
  const [assigneeId, setAssigneeId] = useState<string | null>(task.assignee_id)
  const [categoryId, setCategoryId] = useState<string | null>(task.category_id || null)
  const [taskGroupId, setTaskGroupId] = useState<string | null>(task.task_group_id || null)
  const [profiles, setProfiles] = useState<{id: string, full_name: string}[]>([])
  const [categories, setCategories] = useState<{id: string, name: string, color: string}[]>([])
  const [taskGroups, setTaskGroups] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(false)

  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [attachments, setAttachments] = useState<any[]>([])
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('')
  const [newAttachmentName, setNewAttachmentName] = useState('')
  const [isSubmittingExtra, setIsSubmittingExtra] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState('')

  const COMMENTS_PER_PAGE = 5
  const [commentsPage, setCommentsPage] = useState(1)
  const [totalComments, setTotalComments] = useState(0)

  const fetchCommentsByPage = async (page: number) => {
    const from = (page - 1) * COMMENTS_PER_PAGE
    const to = from + COMMENTS_PER_PAGE - 1
    
    const { data, count, error } = await supabase.from('task_comments')
      .select('*', { count: 'exact' })
      .eq('task_id', task.id)
      .order('created_at', { ascending: true })
      .range(from, to)
      
    if (!error && data) {
      setComments(data)
      if (count !== null) setTotalComments(count)
      setCommentsPage(page)
    }
  }

  const handleEditComment = async (id: string) => {
    if (!editingCommentContent.trim()) return
    const { error } = await supabase.from('task_comments').update({ content: editingCommentContent.trim() }).eq('id', id)
    if (error) {
      console.error("Error editing comment:", error)
      alert("Lỗi sửa bình luận: " + error.message)
    } else {
      setComments(comments.map(c => c.id === id ? { ...c, content: editingCommentContent.trim() } : c))
      setEditingCommentId(null)
    }
  }
  
  useEffect(() => {
    const fetchData = async () => {
      const { data: profs } = await supabase.from('assignees').select('id, full_name').order('full_name')
      if (profs) setProfiles(profs)

      const { data: cats } = await supabase.from('project_categories').select('id, name, color').order('order_index', { ascending: true })
      if (cats) setCategories(cats)

      // Fetch total comments to find the last page (newest comments)
      const { count: commsCount } = await supabase
        .from('task_comments')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', task.id)
      
      const lastPage = Math.max(1, Math.ceil((commsCount || 0) / COMMENTS_PER_PAGE))
      await fetchCommentsByPage(lastPage)

      // Fetch Attachments
      const { data: atts } = await supabase.from('task_attachments')
        .select('*').eq('task_id', task.id).order('created_at', { ascending: false })
      if (atts) setAttachments(atts)
    }
    
    if (open) {
      setIsEditing(false)
      setName(task.name)
      setDescription(task.description || '')
      setPriority(task.priority)
      setStatus(task.status)
      setStartDate(task.start_date ? new Date(task.start_date) : new Date())
      setDeadline(new Date(task.deadline))
      setTaskTime(minutesToTime(task.task_time))
      setAssigneeId(task.assignee_id)
      setCategoryId(task.category_id || null)
      setTaskGroupId(task.task_group_id || null)
      fetchData()
    }
  }, [open, task])

  useEffect(() => {
    const fetchGroups = async () => {
      if (categoryId) {
        const { data } = await supabase
          .from('task_groups')
          .select('id, name')
          .eq('category_id', categoryId)
          .order('order_index', { ascending: true })
        if (data) setTaskGroups(data)
      } else {
        setTaskGroups([])
      }
    }
    if (open) fetchGroups()
  }, [categoryId, open])

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    setIsSubmittingExtra(true)
    const { data, error } = await supabase.from('task_comments').insert({
      task_id: task.id,
      content: newComment.trim()
    }).select().single()
    if (error) {
      console.error("Error adding comment:", error)
      alert("Lỗi thêm bình luận: " + error.message)
    } else if (data) {
      // Re-fetch to see the new comment at the bottom.
      // We need the updated total count to jump to the last page.
      const { count: newCount } = await supabase
        .from('task_comments')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', task.id)
      
      const lastPage = Math.max(1, Math.ceil((newCount || 0) / COMMENTS_PER_PAGE))
      await fetchCommentsByPage(lastPage)
      setNewComment('')
    }
    setIsSubmittingExtra(false)
  }

  const handleDeleteComment = async (id: string) => {
    const { error } = await supabase.from('task_comments').delete().eq('id', id)
    if (!error) {
       // If deleting the last item on a page (other than page 1), go back one page
       if (comments.length === 1 && commentsPage > 1) {
         await fetchCommentsByPage(commentsPage - 1)
       } else {
         await fetchCommentsByPage(commentsPage)
       }
    }
  }

  const handleAddAttachment = async () => {
    if (!newAttachmentUrl.trim() || !newAttachmentName.trim()) return
    setIsSubmittingExtra(true)
    const { data, error } = await supabase.from('task_attachments').insert({
      task_id: task.id,
      file_name: newAttachmentName.trim(),
      file_url: newAttachmentUrl.trim()
    }).select().single()
    if (error) {
      console.error("Error adding attachment:", error)
      alert("Lỗi thêm đính kèm: " + error.message)
    } else if (data) {
      setAttachments([data, ...attachments])
      setNewAttachmentUrl('')
      setNewAttachmentName('')
    }
    setIsSubmittingExtra(false)
  }

  const handleDeleteAttachment = async (id: string) => {
    await supabase.from('task_attachments').delete().eq('id', id)
    setAttachments(attachments.filter(a => a.id !== id))
  }
  const updateQuickField = async (field: string, value: any) => {
    const { error } = await supabase
      .from('tasks')
      .update({ [field]: value })
      .eq('id', task.id)
    
    if (error) {
      console.error(`Quick update error [${field}]:`, error)
      return
    }
    
    if (field === 'priority') setPriority(value)
    if (field === 'status') setStatus(value)
    
    onTaskUpdated()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    setLoading(true)

    const timeToMinutes = (val: string) => {
      if (!val || !val.includes(':')) return 0
      const [h, m] = val.split(':').map(Number)
      return (h || 0) * 60 + (m || 0)
    }
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          name,
          description,
          priority: priority as any,
          status: status as any,
          category_id: categoryId,
          task_group_id: taskGroupId,
          start_date: startDate.toISOString(),
          deadline: deadline.toISOString(),
          task_time: timeToMinutes(taskTime),
          assignee_id: assigneeId
        })
        .eq('id', task.id)


      if (error) {
        console.error("Supabase Error:", error)
        alert(`Lỗi cập nhật task: ${error.message}`)
        setLoading(false)
        return
      }

      setLoading(false)
      setIsEditing(false)
      onTaskUpdated()
      onOpenChange(false)
    } catch (err) {
      console.error("Unexpected error:", err)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none glass-premium p-0">
        <div className="p-8 pb-0 text-center sm:text-left">
          <DialogHeader className="space-y-3">
            {isEditing && (
              <>
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 mx-auto sm:mx-0">
                  <Pencil className="h-6 w-6 text-primary"></Pencil>
                </div>
                <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">
                  Sửa Task
                </DialogTitle>
              </>
            )}
            {!isEditing && (
                <DialogTitle className="sr-only">Chi tiết Task</DialogTitle>
            )}
            <DialogDescription className="text-muted-foreground font-medium flex items-center gap-2">
              {task.projects && (
                <Link 
                  href={`/projects/${task.project_id}`}
                  className={cn(
                    "text-white border-transparent font-black px-3 py-1 rounded-lg text-[11px] uppercase cursor-pointer transition-colors inline-flex items-center shadow-sm",
                    categories.find(c => c.id === (categoryId || task.category_id))?.color || "bg-primary"
                  )}
                >
                  {task.projects.name}
                </Link>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto max-h-[60vh] px-8 py-6 custom-scrollbar">
          {isEditing ? (
            <form id="edit-task-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="et-name" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Tên Task</Label>
              <Input 
                id="et-name" 
                placeholder="Ví dụ: Kiểm tra mẫu hàng" 
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                required
                className="rounded-xl h-12 bg-white/90 border-none focus-visible:ring-primary/20 font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="et-desc" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Mô tả</Label>
              <Textarea 
                id="et-desc" 
                placeholder="Chi tiết công việc..." 
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                className="rounded-xl min-h-[80px] bg-white/90 border-none focus-visible:ring-primary/20 font-medium resize-none text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Ngày bắt đầu</Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full h-11 justify-start text-left font-medium rounded-xl bg-white/90 border-none hover:bg-white/100 px-4 text-xs",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
                        {startDate ? format(startDate, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0 rounded-xl border-none shadow-2xl" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                      className="rounded-xl"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Hạn chót</Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full h-11 justify-start text-left font-medium rounded-xl bg-white/90 border-none hover:bg-white/100 px-4 text-xs",
                          !deadline && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
                        {deadline ? format(deadline, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0 rounded-xl border-none shadow-2xl" align="start">
                    <Calendar
                      mode="single"
                      selected={deadline}
                      onSelect={(date) => date && setDeadline(date)}
                      initialFocus
                      className="rounded-xl"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="et-time" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Giờ (hh:mm)</Label>
              <div className="relative group">
                <Select value={taskTime} onValueChange={(v) => setTaskTime(v || "09:00")}>
                  <SelectTrigger className="rounded-xl h-12 bg-white/90 border-none hover:bg-white/100 text-sm font-bold w-full px-4">
                     <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <SelectValue placeholder="Chọn giờ" />
                     </div>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} align="start" side="bottom" sideOffset={4} className="max-h-[200px] rounded-xl border-none glass-premium shadow-2xl p-2 min-w-[var(--radix-select-trigger-width)]">
                    {Array.from({ length: 48 }).map((_, i) => {
                      const h = Math.floor(i / 2).toString().padStart(2, '0')
                      const m = i % 2 === 0 ? '00' : '30'
                      const val = `${h}:${m}`
                      return (
                        <SelectItem key={val} value={val} className="rounded-lg px-4 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary font-bold text-sm">
                          {val}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Người thực hiện</Label>
              <Select value={assigneeId || ""} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-11 rounded-xl bg-white/90 border-none hover:bg-white/100 px-4 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <SelectValue placeholder="Chọn người thực hiện">
                      {profiles.find(p => p.id === assigneeId)?.full_name}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none glass-premium shadow-2xl p-2">
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id} className="rounded-lg px-4 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary font-medium text-xs">
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


            <div className="flex flex-col gap-6">
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Giai đoạn</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border outline-none",
                        categoryId === c.id 
                          ? `text-white border-transparent shadow-lg ${c.color}`
                          : "bg-white/60 text-slate-400 border-white hover:bg-white"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {taskGroups.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                   <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nhóm Task</Label>
                   <Select value={taskGroupId || "none"} onValueChange={(val) => setTaskGroupId(val === "none" ? null : val)}>
                     <SelectTrigger className="h-11 rounded-xl bg-white/90 border-none hover:bg-white/100 px-4 text-xs font-medium">
                       <SelectValue placeholder="Chọn nhóm task">
                         {taskGroupId && taskGroupId !== "none" ? taskGroups.find((g: any) => g.id === taskGroupId)?.name || task.task_groups?.name : "Chọn nhóm task"}
                       </SelectValue>
                     </SelectTrigger>
                     <SelectContent className="rounded-xl border-none glass-premium shadow-2xl p-2">
                       <SelectItem value="none" className="rounded-lg px-4 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary font-medium text-xs">
                         -- Không có nhóm --
                       </SelectItem>
                       {taskGroups.map(g => (
                         <SelectItem key={g.id} value={g.id} className="rounded-lg px-4 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary font-medium text-xs">
                           {g.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Trạng thái</Label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map(s => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setStatus(s.value as any)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border outline-none",
                            status === s.value 
                              ? `text-white ${s.color} border-transparent shadow-md`
                              : "bg-white/60 text-slate-500 border-white hover:bg-white"
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5", status === s.value ? "text-white" : "text-slate-400")} />
                          {s.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Độ ưu tiên</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITY_OPTIONS.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPriority(p.value as any)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border outline-none",
                          priority === p.value 
                            ? `text-white ${p.color} border-transparent shadow-lg`
                            : "bg-white/60 text-slate-400 border-white hover:bg-white"
                        )}
                      >
                        <p.icon className={cn("h-3.5 w-3.5 fill-current", 
                          priority === p.value ? "text-white" : p.text
                        )} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </form>
        ) : (
            <div className="space-y-6">
              <div>
                 <div className="flex items-start gap-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button className="mt-1 group transition-transform active:scale-90 outline-none">
                             {(() => {
                                const pInfo = PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[0];
                                const PriorityIcon = pInfo.icon;
                                return <PriorityIcon className={cn("h-5 w-5 fill-current", pInfo.text)} />;
                             })()}
                          </button>
                        }
                      />
                      <DropdownMenuContent align="start" className="rounded-xl border-none glass-premium shadow-2xl p-2 min-w-[150px]">
                        {PRIORITY_OPTIONS.map(p => {
                          const Icon = p.icon;
                          return (
                            <DropdownMenuItem 
                              key={p.value} 
                              onClick={() => updateQuickField('priority', p.value)}
                              className="rounded-lg px-3 py-2 cursor-pointer focus:bg-primary/10 flex items-center gap-2"
                            >
                              <Icon className={cn("h-4 w-4 fill-current", p.text)} />
                              <span className="text-xs font-bold uppercase tracking-wider">{p.label}</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <h3 className="text-xl font-black text-slate-800 leading-tight flex-1">{task.name}</h3>
                 </div>
                 {task.description && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap pl-8">{task.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ngày bắt đầu</span>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      {task.start_date ? format(new Date(task.start_date), 'dd/MM/yyyy') : '---'}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hạn chót</span>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <CalendarIcon className="h-4 w-4 text-rose-500" />
                      {task.deadline ? format(new Date(task.deadline), 'dd/MM/yyyy') : '---'}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Giờ</span>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <Clock className="h-4 w-4 text-amber-500" />
                      {minutesToTime(task.task_time)}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Người thực hiện</span>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <User className="h-4 w-4 text-blue-500" />
                      {profiles.find(p => p.id === task.assignee_id)?.full_name || 'Chưa giao'}
                    </div>
                 </div>

                 <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trạng thái</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button type="button" className={cn(
                            "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white px-2 py-1 rounded-lg cursor-pointer hover:opacity-90 transition-opacity w-fit shadow-sm outline-none border-none",
                            STATUS_OPTIONS.find(s => s.value === status)?.color
                          )}>
                            {(() => {
                              const s = STATUS_OPTIONS.find(s => s.value === status);
                              if (!s) return '---';
                              const StatusIcon = s.icon;
                              return <StatusIcon className="h-3 w-3" />;
                            })()}
                            {STATUS_OPTIONS.find(s => s.value === status)?.label}
                          </button>
                        }
                      />
                      <DropdownMenuContent align="start" className="rounded-xl border-none glass-premium shadow-2xl p-2 min-w-[150px]">
                        {STATUS_OPTIONS.map(s => {
                          const Icon = s.icon;
                          return (
                            <DropdownMenuItem 
                              key={s.value} 
                              onClick={() => updateQuickField('status', s.value)}
                              className="rounded-lg px-3 py-1.5 cursor-pointer focus:bg-primary/10 flex items-center gap-2"
                            >
                              <Icon className={cn("h-3.5 w-3.5", s.color.replace('bg-', 'text-'))} />
                              <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                 </div>

                 <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nhóm Task</span>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-200/40 px-2 py-1 rounded-lg w-fit border border-slate-200/50">
                       <ListTodo className="h-3 w-3" />
                       {taskGroups.find(g => g.id === (taskGroupId || task.task_group_id))?.name || task.task_groups?.name || '---'}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* Attachments Section */}
              <div className="space-y-4 pt-4 border-t border-slate-100 mb-4">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                  <Link2 className="h-4 w-4" /> Đính kèm Links
                </Label>
                
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50/50 border border-blue-100 group transition-colors hover:border-blue-200">
                        <Link2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <a href={att.file_url} target="_blank" rel="noopener noreferrer" title={att.file_url} className="text-[12px] font-bold text-slate-700 hover:text-blue-600 max-w-[200px] truncate transition-colors">
                          {att.file_name}
                        </a>
                        {isEditing && (
                          <button 
                             type="button" 
                             onClick={() => handleDeleteAttachment(att.id)}
                             className="h-5 w-5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-all ml-1"
                          >
                             <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {isEditing && (
                  <div className="flex gap-2 p-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                     <div className="flex-1 flex gap-2 w-full">
                       <Input 
                          placeholder="Tên (VD: Thiết kế Figma)" 
                          value={newAttachmentName}
                          onChange={(e) => setNewAttachmentName(e.target.value)}
                          className="flex-1 rounded-xl h-9 bg-white border-slate-200 text-xs font-medium"
                       />
                       <Input 
                          placeholder="URL (https://...)" 
                          value={newAttachmentUrl}
                          onChange={(e) => setNewAttachmentUrl(e.target.value)}
                          className="flex-[2] rounded-xl h-9 bg-white border-slate-200 text-xs font-medium"
                       />
                     </div>
                     <Button 
                        type="button" 
                        onClick={handleAddAttachment}
                        disabled={isSubmittingExtra || !newAttachmentName.trim() || !newAttachmentUrl.trim()}
                        className="h-9 shrink-0 px-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 shadow-sm transition-colors border-none"
                     >
                       <Plus className="h-4 w-4" />
                     </Button>
                  </div>
                )}
              </div>

              {/* Comments Section */}
              {!isEditing && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> Cập nhật
                  </Label>

                  {comments.length > 0 && (
                    <div className="p-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      {/* Pagination Controls (Top) */}
                      {totalComments > COMMENTS_PER_PAGE && (
                        <div className="flex items-center justify-between px-2 pt-2 pb-4 border-b border-slate-100 mb-2">
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Trang {commentsPage} / {Math.ceil(totalComments / COMMENTS_PER_PAGE)}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => fetchCommentsByPage(commentsPage - 1)}
                              disabled={commentsPage === 1}
                              className="h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 disabled:opacity-30"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => fetchCommentsByPage(commentsPage + 1)}
                              disabled={commentsPage >= Math.ceil(totalComments / COMMENTS_PER_PAGE)}
                              className="h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 disabled:opacity-30"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {comments.map(comment => (
                        <div key={comment.id} className="p-4 relative group border-b border-slate-200/50">
                          <div className="flex justify-between items-start overflow-hidden">
                             <div className="flex items-center gap-2">
                               <div className="h-6 w-6 rounded-full bg-slate-200/50 flex items-center justify-center shrink-0 border border-slate-200/50">
                                 <MessageSquare className="h-3 w-3 text-slate-400" />
                               </div>
                               <span className="text-[10px] uppercase tracking-widest text-slate-400">
                                 {format(new Date(comment.created_at), "HH:mm · dd/MM/yyyy")}
                               </span>
                             </div>
                             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button
                                 type="button"
                                 onClick={() => {
                                   setEditingCommentId(comment.id)
                                   setEditingCommentContent(comment.content)
                                 }}
                                 className="h-6 w-6 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-all bg-white shadow-sm border border-slate-100"
                               >
                                  <Edit2 className="h-3.5 w-3.5" />
                               </button>
                               <button
                                 type="button"
                                 onClick={() => handleDeleteComment(comment.id)}
                                 className="h-6 w-6 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all bg-white shadow-sm border border-slate-100"
                               >
                                 <Trash2 className="h-3.5 w-3.5" />
                               </button>
                             </div>
                          </div>
                          
                          {editingCommentId === comment.id ? (
                             <div className="space-y-2 mt-3">
                               <Textarea 
                                 value={editingCommentContent}
                                 onChange={e => setEditingCommentContent(e.target.value)}
                                 className="rounded-lg min-h-[50px] text-xs font-medium bg-white"
                               />
                               <div className="flex justify-end gap-2">
                                 <Button type="button" variant="ghost" onClick={() => setEditingCommentId(null)} className="h-7 text-xs px-3 rounded-lg">Hủy</Button>
                                 <Button type="button" onClick={() => handleEditComment(comment.id)} className="h-7 text-xs px-3 rounded-lg bg-primary text-white hover:bg-slate-700">Lưu</Button>
                               </div>
                             </div>
                          ) : (
                             <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap pl-8">{comment.content}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
        </div>
        <div className="p-5 px-8 pt-2 border-t border-slate-100 bg-white rounded-b-[2.5rem] shrink-0">
          {isEditing ? (
            <DialogFooter>
              <div className="flex gap-2 w-full justify-end">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl h-10 font-bold px-6 border-slate-200">
                  Hủy
                </Button>
                <Button form="edit-task-form" type="submit" disabled={loading} className="rounded-xl h-10 font-bold px-8 bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20 transition-all active:scale-[0.98]">
                  {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>
            </DialogFooter>
          ) : (
            <div className="flex flex-col gap-3">
               <div className="relative">
                  <Textarea 
                     placeholder="Nhập nội dung trao đổi..." 
                     value={newComment}
                     onChange={(e) => setNewComment(e.target.value)}
                     className="min-h-[48px] focus-visible:ring-0 text-sm font-medium resize-none px-6 py-3.5 w-full pr-14 custom-scrollbar placeholder:text-slate-400 rounded-2xl"
                  />
                  <Button 
                     type="button" 
                     onClick={handleAddComment}
                     disabled={isSubmittingExtra || !newComment.trim()}
                     className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-full bg-primary text-white hover:bg-primary/90 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
               </div>
               
               <div className="flex justify-between items-center px-1">
                 <span className="text-[10px] text-slate-400 font-medium">Bình luận để chia sẻ ý tưởng hoặc tiến độ</span>
                 <Button 
                   type="button" 
                   onClick={() => setIsEditing(true)} 
                   variant="ghost"
                   className="w-fit h-8 px-3 text-xs rounded-lg flex items-center gap-1.5 font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                 >
                   <Pencil className="h-3 w-3" /> Chỉnh sửa Task
                 </Button>
               </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
