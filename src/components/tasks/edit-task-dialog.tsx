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
import { Check, Calendar as CalendarIcon, ListTodo, Pencil, User, Trash2, Plus, Circle, PlayCircle, Clock, CheckCircle2, ExternalLink } from 'lucide-react'
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

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do', color: 'bg-slate-500', icon: Circle },
  { value: 'inprogress', label: 'In Progress', color: 'bg-sky-400', icon: PlayCircle },
  { value: 'pending', label: 'Pending', color: 'bg-orange-400', icon: Clock },
  { value: 'done', label: 'Done', color: 'bg-green-500', icon: CheckCircle2 },
]

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
  const [taskTime, setTaskTime] = useState(task.task_time || '09:00')
  const [assigneeId, setAssigneeId] = useState<string | null>(task.assignee_id)
  const [categoryId, setCategoryId] = useState<string | null>(task.category_id || null)
  const [taskGroupId, setTaskGroupId] = useState<string | null>(task.task_group_id || null)
  const [links, setLinks] = useState<{title: string, url: string}[]>(task.links || [])
  const [profiles, setProfiles] = useState<{id: string, full_name: string}[]>([])
  const [categories, setCategories] = useState<{id: string, name: string, color: string}[]>([])
  const [taskGroups, setTaskGroups] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    const fetchData = async () => {
      const { data: profs } = await supabase.from('assignees').select('id, full_name').order('full_name')
      if (profs) setProfiles(profs)

      const { data: cats } = await supabase.from('project_categories').select('id, name, color').order('order_index', { ascending: true })
      if (cats) setCategories(cats)
    }
    
    if (open) {
      setName(task.name)
      setDescription(task.description || '')
      setPriority(task.priority)
      setStatus(task.status)
      setStartDate(task.start_date ? new Date(task.start_date) : new Date())
      setDeadline(new Date(task.deadline))
      setTaskTime(task.task_time || '09:00')
      setAssigneeId(task.assignee_id)
      setCategoryId(task.category_id || null)
      setTaskGroupId(task.task_group_id || null)
      setLinks(task.links || [])
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

  const addLink = () => setLinks([...links, { title: '', url: '' }])
  const removeLink = (index: number) => setLinks(links.filter((_, i) => i !== index))
  const updateLink = (index: number, field: 'title' | 'url', value: string) => {
    const newLinks = [...links]
    newLinks[index][field] = value
    setLinks(newLinks)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    setLoading(true)
    
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
          task_time: taskTime,
          assignee_id: assigneeId,
          links: links.filter(l => l.url)
        })
        .eq('id', task.id)

      if (error) {
        console.error("Supabase Error:", error)
        alert(`Lỗi cập nhật task: ${error.message}`)
        setLoading(false)
        return
      }

      setLoading(false)
      onOpenChange(false)
      onTaskUpdated()
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
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 mx-auto sm:mx-0">
              <Pencil className="h-6 w-6 text-primary"></Pencil>
            </div>
            <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">Sửa Task</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium flex items-center gap-2">
              {task.projects && (
                <Link 
                  href={`/projects/${task.project_id}`}
                  className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-black px-3 py-1 rounded-lg text-[11px] uppercase cursor-pointer transition-colors inline-flex items-center"
                >
                  {task.projects.name}
                </Link>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto max-h-[60vh] px-8 py-6 custom-scrollbar">
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
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input 
                  id="et-time" 
                  type="time"
                  value={taskTime}
                  onChange={(e) => setTaskTime(e.target.value)}
                  className="pl-11 rounded-xl h-12 bg-white/90 border-none focus-visible:ring-primary/20 font-bold text-sm"
                />
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Links tài liệu</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addLink} className="h-6 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">
                  <Plus className="h-3 w-3 mr-1" /> Thêm link
                </Button>
              </div>
              <div className="space-y-2">
                {links.map((link, idx) => (
                  <div key={idx} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                    <Input 
                      placeholder="Tiêu đề (VD: Google Drive)" 
                      value={link.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLink(idx, 'title', e.target.value)}
                      className="rounded-xl h-9 bg-white/90 border-none text-[10px] font-medium flex-[1]"
                    />
                    <Input 
                      placeholder="https://..." 
                      value={link.url}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateLink(idx, 'url', e.target.value)}
                      className="rounded-xl h-9 bg-white/90 border-none text-[10px] font-medium flex-[2]"
                    />
                    {link.url && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          const url = link.url.startsWith('http') ? link.url : `https://${link.url}`;
                          window.open(url, '_blank');
                        }}
                        className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10 transition-colors"
                        title="Mở link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLink(idx)} className="h-9 w-9 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
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
                       <SelectValue placeholder="Chọn nhóm task" />
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
        </div>

        <div className="p-8 pt-2">
          <DialogFooter>
            <Button form="edit-task-form" type="submit" disabled={loading} className="w-full rounded-2xl h-14 font-black text-lg shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90 transition-all active:scale-[0.98]">
              {loading ? 'Đang cập nhật...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
