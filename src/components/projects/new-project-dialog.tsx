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
import { Plus, Check, Building2, Briefcase } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
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


export function NewProjectDialog({ onProjectCreated }: { onProjectCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [status, setStatus] = useState('')
  const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([])
  const [categories, setCategories] = useState<{id: string, name: string, color: string}[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date>(new Date())
  const router = useRouter()

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: sData } = await supabase.from('suppliers').select('id, name')
      if (sData) setSuppliers(sData)

      const { data: cData } = await supabase.from('project_categories').select('*').order('order_index', { ascending: true })
      if (cData) {
        setCategories(cData)
        if (cData.length > 0) setStatus(cData[0].name)
      }
    }
    fetchInitialData()
  }, [])

  const selectedSupplier = suppliers.find(s => s.id === supplierId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Not logged in.")
        setLoading(false)
        return
      }

      let { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // Auto-create profile if missing (trigger might have failed or user existed before trigger)
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url
          }, { onConflict: 'id' })
          .select()
          .single()
        
        if (profileError) {
          console.error("Chi tiết lỗi Profile:", JSON.stringify(profileError, null, 2))
          alert(`Không thể xác thực profile: ${profileError.message || 'Lỗi bảo mật RLS'}`)
          setLoading(false)
          return
        }
        profile = newProfile
      }

      const { data: project, error: pError } = await supabase
        .from('projects')
        .insert({
          name,
          supplier_id: supplierId || null,
          status: status as any,
          created_by: user.id,
          created_at: startDate.toISOString()
        })
        .select()
        .single()

      if (pError) {
        console.error("Supabase Error:", pError)
        alert(`Error tạo project: ${pError.message}`)
        setLoading(false)
        return
      }

      // 1. Fetch global task groups (templates)
      const { data: globalGroups } = await supabase
        .from('task_groups')
        .select('*')
        .is('project_id', null)

      const groupMapping: Record<string, string> = {}
      
      if (globalGroups && globalGroups.length > 0) {
        // 2. Create project-specific groups
        const groupsToCreate = globalGroups.map(g => ({
          name: g.name,
          category_id: g.category_id,
          project_id: project.id,
          order_index: g.order_index,
          start_date: startDate.toISOString(),
          deadline: new Date(startDate.getTime() + 86400000 * 7).toISOString(),
          created_by: user.id
        }))
        
        const { data: createdGroups, error: groupError } = await supabase
          .from('task_groups')
          .insert(groupsToCreate)
          .select()
        
        if (groupError) {
          console.error("Error creating project groups:", groupError)
        } else if (createdGroups) {
          // Map global group IDs to the new project-specific group IDs
          // Since we inserted in order, we can map back if createdGroups is also sorted
          // but safer to match by name and category_id
          globalGroups.forEach(og => {
            const ng = createdGroups.find(n => n.name === og.name && n.category_id === og.category_id)
            if (ng) groupMapping[og.id] = ng.id
          })
        }
      }

      const { data: templates } = await supabase
        .from('task_templates')
        .select('*')

      if (templates && templates.length > 0) {
        const tasksToCreate = templates.map(t => {
          const cat = categories.find(c => c.name === t.project_status)
          return {
            project_id: project.id,
            category_id: t.category_id || cat?.id || null,
            name: t.task_name,
            priority: t.default_priority || 'medium',
            status: 'todo',
            start_date: startDate.toISOString(),
            deadline: new Date(startDate.getTime() + 86400000 * 7).toISOString(),
            task_group_id: t.task_group_id ? groupMapping[t.task_group_id] : null,
            created_by: user.id
          }
        })
        const { error: taskError } = await supabase.from('tasks').insert(tasksToCreate)
        if (taskError) console.error("Error automating tasks:", taskError)
      }

      setLoading(false)
      setOpen(false)
      setName('')
      setSupplierId('')
      if (onProjectCreated) onProjectCreated()
      router.refresh()
    } catch (err) {
      console.error("Unexpected error:", err)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="rounded-[1.25rem] px-6 h-12 font-bold text-base shadow-xl shadow-primary/30 transition-all hover:-translate-y-0.5 active:scale-95 bg-primary hover:bg-primary/90 text-white whitespace-nowrap">
          <Plus className="mr-2 h-5 w-5"></Plus> Tạo project
        </Button>
      } />
      <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none glass-premium p-8">
        <DialogHeader className="space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Briefcase className="h-6 w-6 text-primary"></Briefcase>
          </div>
          <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">Create Project</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Bắt đầu project mới với quy trình tự động.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="p-name" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Project Name</Label>
            <Input 
              id="p-name" 
              placeholder="e.g. Tet 2026 Purchase" 
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
                    className={cn(
                      "w-full h-12 justify-start text-left font-medium rounded-2xl bg-white/90 border-none hover:bg-white/100 px-4",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                  className="rounded-2xl"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nhà cung cấp</Label>
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="outline" className="w-full justify-between h-12 rounded-2xl bg-white/90 border-none hover:bg-white/100 px-4">
                  <span className="flex items-center gap-2 overflow-hidden">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0"></Building2>
                    <span className="truncate">{selectedSupplier?.name || "Select Supplier"}</span>
                  </span>
                  <Plus className="h-4 w-4 text-slate-400 rotate-45 shrink-0"></Plus>
                </Button>
              } />
              <DropdownMenuContent className="w-[300px] rounded-2xl border-none glass-premium shadow-2xl p-2">
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
            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Starting Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {categories.length > 0 ? categories.map((cat, idx) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setStatus(cat.name)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                    status === cat.name 
                      ? cn("text-white shadow-xl border-none", cat.color) 
                      : "bg-white/90 border-transparent text-slate-500 hover:bg-white/100"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="opacity-50">{idx + 1}.</span>
                    {cat.name}
                  </span>
                  {status === cat.name && <Check className="h-3 w-3"></Check>}
                </button>
              )) : (
                <div className="col-span-2 p-4 text-center glass-premium border-dashed border-2 border-white/50 rounded-2xl">
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
                     ⚠️ Vui lòng chạy SQL setup_dynamic_categories
                   </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button type="submit" disabled={loading} className="w-full rounded-2xl h-14 font-black text-lg shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90 transition-all active:scale-[0.98]">
              {loading ? 'Đang tạo...' : 'Create Project & Tasks'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
