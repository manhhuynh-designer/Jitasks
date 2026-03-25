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
import { Check, Building2, Pencil, Text, Copy } from 'lucide-react'
import { cn, getCategoryColorStyles } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarIcon } from 'lucide-react'
import { Textarea } from '../ui/textarea'
import { Project } from '@/hooks/use-projects'

// Removed static STATUS_OPTIONS

export function EditProjectDialog({ 
  project, 
  open, 
  onOpenChange, 
  onProjectUpdated,
  isClone = false
}: { 
  project: Project, 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  onProjectUpdated: () => void,
  isClone?: boolean
}) {
  const [name, setName] = useState(isClone ? `${project.name} (Bản sao)` : project.name)
  const [description, setDescription] = useState(project.description || '')
  const [supplierId, setSupplierId] = useState(project.supplier_id || '')
  const [status, setStatus] = useState(project.status)
  const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([])
  const [categories, setCategories] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(false)
  const [createdAt, setCreatedAt] = useState<Date>(new Date(project.created_at))

  useEffect(() => {
    const fetchData = async () => {
      const { data: sData } = await supabase.from('suppliers').select('id, name')
      if (sData) setSuppliers(sData)

      const { data: catData } = await supabase.from('project_categories').select('*').order('order_index', { ascending: true })
      if (catData) setCategories(catData)
    }
    fetchData()
    
    // Reset form when project changes or dialog opens
    if (open) {
        setName(isClone ? `${project.name} (Bản sao)` : project.name)
        setDescription(project.description || '')
        setSupplierId(project.supplier_id || '')
        setStatus(project.status)
        setCreatedAt(new Date(project.created_at))
    }
  }, [open, project])

  const selectedSupplier = suppliers.find(s => s.id === supplierId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    setLoading(true)
    
    try {
      if (isClone) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          alert("Not logged in")
          setLoading(false)
          return
        }

        const { data: newProject, error: pError } = await supabase
          .from('projects')
          .insert({
            name,
            description,
            supplier_id: supplierId || null,
            status: status as any,
            created_by: user.id,
            created_at: createdAt.toISOString()
          })
          .select()
          .single()

        if (pError) throw pError

        // Copy tasks
        const { data: originalTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', project.id)

        if (originalTasks && originalTasks.length > 0) {
          const tasksToInsert = originalTasks.map((t: any) => ({
            project_id: newProject.id,
            category_id: t.category_id,
            name: t.name,
            description: t.description,
            priority: t.priority,
            status: 'todo',
            start_date: new Date().toISOString(),
            deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
            task_group_id: t.task_group_id,
            created_by: user.id
          }))
          const { error: tError } = await supabase.from('tasks').insert(tasksToInsert)
          if (tError) console.error("Error copy tasks", tError)
        }
      } else {
        const { error } = await supabase
          .from('projects')
          .update({
            name,
            description,
            supplier_id: supplierId || null,
            status: status as any,
            created_at: createdAt.toISOString(),
          })
          .eq('id', project.id)

        if (error) {
          console.error("Supabase Error:", error)
          alert(`Lỗi cập nhật project: ${error.message}`)
          setLoading(false)
          return
        }
      }

      setLoading(false)
      onOpenChange(false)
      onProjectUpdated()
    } catch (err) {
      console.error("Unexpected error:", err)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none glass-premium p-0 flex flex-col max-h-[90dvh]">
        <div className="p-8 pb-0">
          <DialogHeader className="space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
              {isClone ? <Copy className="h-6 w-6 text-primary"></Copy> : <Pencil className="h-6 w-6 text-primary"></Pencil>}
            </div>
            <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">{isClone ? 'Nhân bản Project' : 'Sửa Project'}</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              {isClone ? 'Chỉnh sửa thông tin cho bản sao của project.' : 'Cập nhật thông tin chi tiết cho project của bạn.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
          <form id="edit-project-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="p-name" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Tên Project</Label>
              <Input 
                id="p-name" 
                placeholder="Ví dụ: Thu mua Tết 2026" 
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                required
                className="rounded-2xl h-12 bg-white/90 border-none focus-visible:ring-primary/20 font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Ngày Project</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant={"outline"}
                      type="button"
                      className={cn(
                        "w-full h-12 justify-start text-left font-medium rounded-2xl bg-white/90 border-none hover:bg-white/100 px-4",
                        !createdAt && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                      {createdAt ? format(createdAt, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={createdAt}
                    onSelect={(date) => date && setCreatedAt(date)}
                    initialFocus
                    className="rounded-2xl"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-desc" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Mô tả</Label>
              <Textarea 
                id="p-desc" 
                placeholder="Nhập mô tả chi tiết..." 
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                className="rounded-2xl min-h-[80px] bg-white/90 border-none focus-visible:ring-primary/20 font-medium resize-none text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nhà cung cấp</Label>
              <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" type="button" className="w-full justify-between h-12 rounded-2xl bg-white/90 border-none hover:bg-white/100 px-4">
                    <span className="flex items-center gap-2 overflow-hidden">
                      <Building2 className="h-4 w-4 text-slate-400 shrink-0"></Building2>
                      <span className="truncate">{selectedSupplier?.name || "Chọn nhà cung cấp"}</span>
                    </span>
                    <div className="h-4 w-4 text-slate-400 border-2 border-slate-400 rounded-full flex items-center justify-center text-[10px]">+</div>
                  </Button>
                }
              />
                <DropdownMenuContent className="w-[300px] rounded-2xl border-none glass-premium shadow-2xl p-2 z-[100]">
                  {suppliers.length > 0 ? (
                    suppliers.map(s => (
                      <DropdownMenuItem 
                        key={s.id} 
                        onClick={() => setSupplierId(s.id)}
                        className="rounded-xl px-4 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary font-medium"
                      >
                        {s.name}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-slate-500 italic">Chưa có supplier nào</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Trạng thái</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((opt, idx) => {
                  const isActive = status === opt.name
                  const colorStyles = getCategoryColorStyles((opt as any).color)
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setStatus(opt.name as any)}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                        isActive 
                          ? cn("text-white shadow-xl border-none", colorStyles.className || 'bg-slate-800') 
                          : "bg-white/90 border-transparent text-slate-400 hover:bg-white/100"
                      )}
                      style={isActive ? colorStyles.style : {}}
                    >
                      {idx + 1}. {opt.name}
                      {isActive && <Check className="h-3 w-3 shadow-lg"></Check>}
                    </button>
                )})}
              </div>
            </div>
          </form>
        </div>

        <div className="p-8 pt-2">
          <DialogFooter>
            <Button form="edit-project-form" type="submit" disabled={loading} className="w-full rounded-2xl h-14 font-black text-lg shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90 transition-all active:scale-[0.98]">
              {loading ? (isClone ? 'Đang tạo...' : 'Đang cập nhật...') : (isClone ? 'Tạo bản sao' : 'Lưu thay đổi')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
