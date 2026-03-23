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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Layers, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddGroupDialogProps {
  projectId: string
  categoryId: string
  onGroupCreated: () => void
  trigger?: React.ReactElement
}

export function AddGroupDialog({ projectId, categoryId, onGroupCreated, trigger }: AddGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [templates, setTemplates] = useState<{ id: string, name: string }[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      const fetchTemplates = async () => {
        // Fetch groups where project_id is null as templates
        const { data } = await supabase
          .from('task_groups')
          .select('id, name')
          .is('project_id', null)
          .eq('category_id', categoryId)
        if (data) setTemplates(data)
      }
      fetchTemplates()
    }
  }, [open, categoryId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name && !selectedTemplateId) return

    setLoading(true)
    try {
      const finalName = name.trim() || templates.find(t => t.id === selectedTemplateId)?.name || ''

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not logged in")

      // 1. Create the new group for this project
      const { data: newGroup, error: groupError } = await supabase
        .from('task_groups')
        .insert({
          name: finalName,
          category_id: categoryId,
          project_id: projectId,
          start_date: new Date().toISOString(),
          deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
          created_by: user.id
        })
        .select()
        .single()

      if (groupError) throw groupError

      // 2. If template was selected, copy associated tasks from task_templates
      if (selectedTemplateId) {
        const { data: taskTemplates } = await supabase
          .from('task_templates')
          .select('*')
          .eq('task_group_id', selectedTemplateId)

        if (taskTemplates && taskTemplates.length > 0) {
          const tasksToInsert = taskTemplates.map(t => ({
            project_id: projectId,
            category_id: categoryId,
            task_group_id: newGroup.id,
            name: t.task_name,
            priority: t.default_priority || 'medium',
            status: 'todo',
            start_date: new Date().toISOString(),
            deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
            created_by: user.id
          }))
          await supabase.from('tasks').insert(tasksToInsert)
        }
      }

      setOpen(false)
      setName('')
      setSelectedTemplateId(null)
      onGroupCreated()
    } catch (err) {
      console.error("Error creating group from template:", err)
      alert("Lỗi khi tạo nhóm từ template")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={trigger || (
          <Button className="rounded-2xl h-11 px-6 font-black uppercase tracking-widest text-[10px] bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all gap-2">
            <Plus className="h-4 w-4 stroke-[3px]" /> Thêm Group
          </Button>
        )}
      />
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none glass-premium p-0 flex flex-col max-h-[90dvh]">
        <div className="p-8 pb-0">
          <DialogHeader className="space-y-4">
            <div className="h-16 w-16 rounded-[1.8rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
               <Layers className="h-8 w-8" />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight leading-none">Thêm Nhóm Task</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-sm">
              Chọn từ template hoặc tạo nhóm mới cho giai đoạn này.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-6 custom-scrollbar">
          <form id="add-group-form" onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-5">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Chọn từ Templates</Label>
            <div className="grid grid-cols-2 gap-4">
              {templates.length > 0 ? (
                templates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                        setSelectedTemplateId(t.id)
                    }}
                    className={cn(
                        "flex items-center justify-between px-5 py-5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all border-2 text-left group/btn",
                        selectedTemplateId === t.id 
                        ? "bg-slate-900 text-white border-transparent shadow-2xl shadow-slate-200 scale-[1.05]" 
                        : "bg-white text-slate-500 border-slate-50 hover:border-primary/20 hover:bg-slate-50/50"
                    )}
                  >
                    <span className="truncate mr-2">{t.name}</span>
                    {selectedTemplateId === t.id ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                        <Plus className="h-4 w-4 shrink-0 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    )}
                  </button>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Không có template nào</p>
                </div>
              )}
            </div>
          </div>

          <div className="relative">
             <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100" />
             </div>
             <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="bg-white/80 backdrop-blur-md px-4 text-slate-300">Hoặc tự nhập tên</span>
             </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="g-name" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Tên Nhóm Mới</Label>
            <Input
              id="g-name"
              placeholder="v.d. Thiết kế, CODE Backend..."
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              className="rounded-[1.5rem] h-14 bg-slate-50/50 border-none focus-visible:ring-primary/20 font-black text-slate-800 placeholder:text-slate-300 px-6 shadow-inner"
            />
          </div>
          </form>
        </div>

        <div className="p-8 pt-2 border-t border-slate-100 shrink-0">
          <DialogFooter>
            <Button 
              form="add-group-form"
              type="submit" 
              disabled={loading || (!name && !selectedTemplateId)} 
              className="w-full rounded-[2rem] h-16 font-black text-lg shadow-2xl shadow-primary/30 bg-primary text-white hover:bg-primary/95 transition-all hover:scale-[1.02] active:scale-95"
            >
              {loading ? 'Đang tạo...' : 'Tạo Nhóm & Task'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
