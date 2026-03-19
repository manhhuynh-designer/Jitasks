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
import { Check, Building2, Pencil, Text } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from '../ui/textarea'
import { Project } from '@/hooks/use-projects'

// Removed static STATUS_OPTIONS

export function EditProjectDialog({ 
  project, 
  open, 
  onOpenChange, 
  onProjectUpdated 
}: { 
  project: Project, 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  onProjectUpdated: () => void 
}) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  const [supplierId, setSupplierId] = useState(project.supplier_id || '')
  const [status, setStatus] = useState(project.status)
  const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([])
  const [categories, setCategories] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(false)

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
        setName(project.name)
        setDescription(project.description || '')
        setSupplierId(project.supplier_id || '')
        setStatus(project.status)
    }
  }, [open, project])

  const selectedSupplier = suppliers.find(s => s.id === supplierId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    setLoading(true)
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name,
          description,
          supplier_id: supplierId || null,
          status: status as any,
        })
        .eq('id', project.id)

      if (error) {
        console.error("Supabase Error:", error)
        alert(`Lỗi cập nhật project: ${error.message}`)
        setLoading(false)
        return
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
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none glass-premium p-8">
        <DialogHeader className="space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Pencil className="h-6 w-6 text-primary"></Pencil>
          </div>
          <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">Sửa Project</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium">
            Cập nhật thông tin chi tiết cho project của bạn.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-6">
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
            <Label htmlFor="p-desc" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Mô tả</Label>
            <Textarea 
              id="p-desc" 
              placeholder="Nhập mô tả chi tiết..." 
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              className="rounded-2xl min-h-[100px] bg-white/90 border-none focus-visible:ring-primary/20 font-medium resize-none"
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
              {categories.map((opt, idx) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatus(opt.name as any)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                    status === opt.name 
                      ? "bg-primary/20 border-primary text-primary shadow-sm" 
                      : "bg-white/90 border-transparent text-slate-400 hover:bg-white/100"
                  )}
                >
                  {idx + 1}. {opt.name}
                  {status === opt.name && <Check className="h-3 w-3 shadow-lg"></Check>}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button type="submit" disabled={loading} className="w-full rounded-2xl h-14 font-black text-lg shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90 transition-all active:scale-[0.98]">
              {loading ? 'Đang cập nhật...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
