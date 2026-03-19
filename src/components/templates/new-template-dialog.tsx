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
import { Plus, ListChecks, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// Removed hardcoded STATUS_OPTIONS

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-600' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'bg-rose-100 text-rose-600' },
]

export function NewTemplateDialog({ 
  onTemplateCreated, 
  trigger,
  defaultStatus 
}: { 
  onTemplateCreated?: () => void,
  trigger?: React.ReactElement,
  defaultStatus?: string
}) {
  const [open, setOpen] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [projectStatus, setProjectStatus] = useState<string>(defaultStatus || '')
  const [priority, setPriority] = useState('medium')
  const [categories, setCategories] = useState<{name: string, color: string}[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      const fetchCategories = async () => {
        const { data } = await supabase.from('project_categories').select('name, color').order('order_index')
        if (data) {
           setCategories(data)
           if (!projectStatus && data.length > 0) setProjectStatus(data[0].name)
           else if (defaultStatus) setProjectStatus(defaultStatus)
        }
      }
      fetchCategories()
    }
  }, [open, defaultStatus, projectStatus])

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

      const { error } = await supabase
        .from('task_templates')
        .insert({ 
          task_name: taskName, 
          project_status: projectStatus as any,
          default_priority: priority as any,
          created_by: user.id
        })

      if (error) {
        console.error("Error creating template:", error)
        alert("Error: " + error.message)
      } else {
        setTaskName('')
        setOpen(false)
        if (onTemplateCreated) onTemplateCreated()
      }
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
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none glass-premium p-0 overflow-hidden shadow-2xl">
        <div className="p-8 pb-0">
          <DialogHeader className="space-y-3 text-left">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-2 mx-0 shadow-sm ring-4 ring-amber-50/50">
              <ListChecks className="h-7 w-7 text-amber-500"></ListChecks>
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">Thêm Task Template</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-sm">
              Tự động tạo task này mỗi khi một dự án chuyển sang giai đoạn được chọn bên dưới.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-2">
            <Label htmlFor="t-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tên Task Template</Label>
            <Input 
              id="t-name" 
              placeholder="v.d. Kiểm tra mẫu thử, Liên hệ NCC..." 
              value={taskName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaskName(e.target.value)}
              required
              className="rounded-2xl h-14 bg-white/60 border-white/60 focus-visible:ring-primary/10 font-bold text-slate-800 shadow-sm border"
            />
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Kích hoạt tại Giai đoạn</Label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat, idx) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setProjectStatus(cat.name)}
                  className={cn(
                    "flex flex-col items-start p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 text-left relative overflow-hidden group",
                    projectStatus === cat.name 
                      ? cn("text-white shadow-xl shadow-primary/10 border-none", cat.color) 
                      : "bg-white/40 border-white/60 text-slate-400 hover:bg-white/80 hover:text-slate-600 shadow-sm"
                  )}
                >
                  <span className="opacity-40 mb-1">{idx + 1}.</span>
                  <span className="truncate w-full">{cat.name}</span>
                  {projectStatus === cat.name && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                       <Check className="h-3 w-3 text-white stroke-[4px]"></Check>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mức độ ưu tiên mặc định</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border-2",
                    priority === opt.value 
                      ? cn("shadow-sm border-current", opt.color)
                      : "bg-white/40 border-white/60 text-slate-400 hover:bg-white/80"
                  )}
                >
                  {opt.label}
                  {priority === opt.value && <div className="mt-1 h-1 w-4 rounded-full bg-current opacity-40" />}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading} className="w-full rounded-[2rem] h-16 font-black text-lg shadow-xl shadow-primary/20 bg-primary text-white hover:bg-primary/95 transition-all hover:scale-[1.02] active:scale-[0.98]">
              {loading ? 'Đang lưu...' : 'Lưu Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
