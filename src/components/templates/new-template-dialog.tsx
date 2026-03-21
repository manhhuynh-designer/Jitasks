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
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, ListChecks, Check, Clock, Layers, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PRIORITY_OPTIONS } from '@/lib/priority-utils'

export function NewTemplateDialog({ 
  template,
  onTemplateCreated, 
  onTemplateUpdated,
  trigger,
  defaultStatus,
  defaultCategoryId,
  defaultGroupId
}: { 
  template?: any,
  onTemplateCreated?: () => void,
  onTemplateUpdated?: () => void,
  trigger?: React.ReactElement,
  defaultStatus?: string,
  defaultCategoryId?: string,
  defaultGroupId?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [taskName, setTaskName] = useState(template?.task_name || '')
  const [projectStatus, setProjectStatus] = useState<string>(template?.project_status || defaultStatus || '')
  const [priority, setPriority] = useState(template?.default_priority || 'medium')
  const [categories, setCategories] = useState<{id: string, name: string, color: string}[]>([])
  const [taskGroups, setTaskGroups] = useState<{id: string, name: string}[]>([])
  const [taskGroupId, setTaskGroupId] = useState<string | null>(template?.task_group_id || defaultGroupId || null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && template) {
        setTaskName(template.task_name)
        setProjectStatus(template.project_status)
        setPriority(template.default_priority)
        setTaskGroupId(template.task_group_id)
    }
  }, [open, template])

  useEffect(() => {
    if (open) {
      const fetchCategories = async () => {
        const { data } = await supabase.from('project_categories').select('id, name, color').order('order_index')
        if (data) {
           setCategories(data)
           if (!projectStatus && data.length > 0) setProjectStatus(data[0].name)
           else if (defaultStatus) setProjectStatus(defaultStatus)
        }
      }
      fetchCategories()
    }
  }, [open, defaultStatus, defaultCategoryId])

  useEffect(() => {
    if (open && defaultGroupId) {
      setTaskGroupId(defaultGroupId)
    }
  }, [open, defaultGroupId])

  useEffect(() => {
    const fetchGroups = async () => {
      const cat = categories.find(c => c.name === projectStatus)
      if (cat) {
        const { data } = await supabase
          .from('task_groups')
          .select('id, name')
          .eq('category_id', cat.id)
          .order('order_index', { ascending: true })
        if (data) setTaskGroups(data)
      } else {
        setTaskGroups([])
      }
    }
    if (open && projectStatus) fetchGroups()
  }, [projectStatus, categories, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskName) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Not logged in.")
        setLoading(false)
        return
      }

      if (template) {
        const { error: updateError } = await supabase
          .from('task_templates')
          .update({
            task_name: taskName,
            project_status: projectStatus as any,
            default_priority: priority as any,
            category_id: categories.find(c => c.name === projectStatus)?.id || defaultCategoryId,
            task_group_id: taskGroupId
          })
          .eq('id', template.id)

        if (updateError) throw updateError
        if (onTemplateUpdated) onTemplateUpdated()
      } else {
        const { error: insertError } = await supabase
          .from('task_templates')
          .insert({ 
            task_name: taskName, 
            project_status: projectStatus as any,
            default_priority: priority as any,
            category_id: categories.find(c => c.name === projectStatus)?.id || defaultCategoryId,
            task_group_id: taskGroupId,
            created_by: user.id
          })

        if (insertError) throw insertError
        if (onTemplateCreated) onTemplateCreated()
      }

      setTaskName('')
      setOpen(false)
    } catch (err) {
      console.error("Unexpected error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        trigger || (
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary transition-colors font-bold">
            <Plus className="h-4 w-4"></Plus>
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none glass-premium p-0 overflow-hidden shadow-2xl">
        <div className="p-8 pb-4 text-center sm:text-left">
          <DialogHeader className="space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-2 mx-auto sm:mx-0 shadow-sm ring-4 ring-amber-50/50">
              <ListChecks className="h-7 w-7 text-amber-500"></ListChecks>
            </div>
            <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">
              {template ? 'Sửa Task Template' : 'Thêm Task Template'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-xs">
              Mẫu task này sẽ được tự động tạo khi dự án chuyển sang giai đoạn tương ứng.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="t-name" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Tên Task Template</Label>
            <Input 
              id="t-name" 
              placeholder="v.d. Kiểm tra mẫu hàng, Gửi báo giá..." 
              value={taskName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaskName(e.target.value)}
              required
              className="rounded-xl h-12 bg-white/90 border-none focus-visible:ring-primary/20 font-medium shadow-sm"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Kích hoạt tại Giai đoạn</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setProjectStatus(cat.name)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all border outline-none",
                    projectStatus === cat.name 
                      ? cn("text-white border-transparent shadow-lg", cat.color)
                      : "bg-white/60 text-slate-400 border-white hover:bg-white"
                  )}
                >
                  {projectStatus === cat.name && <Check className="h-3 w-3 text-white stroke-[4px]" />}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nhóm Task (Tùy chọn)</Label>
            <Select value={taskGroupId || "none"} onValueChange={(val) => setTaskGroupId(val === "none" ? null : val)}>
              <SelectTrigger className="h-11 rounded-xl bg-white/90 border-none hover:bg-white/100 px-4 text-xs font-medium shadow-sm">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-slate-400" />
                  <SelectValue placeholder="Chọn nhóm task">
                    {taskGroupId && taskGroupId !== "none" ? taskGroups.find(g => g.id === taskGroupId)?.name : "--- Không có nhóm ---"}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none glass-premium shadow-2xl p-2">
                <SelectItem value="none" className="rounded-lg px-4 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary font-medium text-xs">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-3 w-3" />
                    <span>-- Không có nhóm --</span>
                  </div>
                </SelectItem>
                {taskGroups.map(g => (
                  <SelectItem key={g.id} value={g.id} className="rounded-lg px-4 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary font-medium text-xs">
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Độ ưu tiên mặc định</Label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border outline-none",
                    priority === p.value 
                      ? cn("text-white border-transparent shadow-lg", p.color)
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

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading} className="w-full rounded-[2rem] h-14 font-black text-base shadow-xl shadow-primary/20 bg-primary text-white hover:bg-primary/95 transition-all hover:scale-[1.02] active:scale-[0.98]">
              {loading ? 'Đang lưu...' : (template ? 'Cập nhật Template' : 'Lưu Template')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
