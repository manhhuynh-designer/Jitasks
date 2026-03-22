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
import { Textarea } from '@/components/ui/textarea'
import { Mail, X, Check, Building2, Users, Globe, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NewEmailTemplateDialogProps {
  onCreated: () => void
  trigger?: React.ReactElement
  defaultRecipientType?: 'supplier' | 'internal' | 'both'
}

export function NewEmailTemplateDialog({ 
  onCreated, 
  trigger, 
  defaultRecipientType = 'supplier' 
}: NewEmailTemplateDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [recipientType, setRecipientType] = useState<'supplier' | 'internal' | 'both'>(defaultRecipientType)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [stage, setStage] = useState<string | null>(null)
  const [stages, setStages] = useState<{id: string, name: string, color: string}[]>([])

  useEffect(() => {
    const fetchStages = async () => {
      const { data } = await supabase.from('project_categories').select('id, name, color').order('order_index')
      if (data) setStages(data)
    }
    if (open) fetchStages()
  }, [open])

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim()) && tags.length < 10) {
        setTags([...tags, tagInput.trim()])
      }
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !subject.trim() || !body.trim()) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Bạn cần đăng nhập để thực hiện tác vụ này.")
        setLoading(false)
        return
      }

      const { error } = await supabase.from('email_templates').insert({
        title: title.trim(),
        subject: subject.trim(),
        body: body.trim(),
        recipient_type: recipientType,
        tags,
        stage: stage,
        created_by: user.id
      })

      if (error) throw error

      onCreated()
      resetForm()
      setOpen(false)
    } catch (err) {
      console.error("Lỗi khi tạo email mẫu:", err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setSubject('')
    setBody('')
    setRecipientType(defaultRecipientType)
    setTags([])
    setTagInput('')
    setStage(null)
  }

  const recipientTypes = [
    { value: 'supplier', label: 'Nhà cung cấp', icon: Building2 },
    { value: 'internal', label: 'Nội bộ', icon: Users },
    { value: 'both', label: 'Cả hai', icon: Globe },
  ] as const

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger || (
            <Button className="rounded-[1.5rem] h-14 px-8 font-black uppercase tracking-widest text-xs bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all gap-2">
              <Mail className="h-5 w-5 stroke-[3px]" /> Tạo Email Mẫu mới
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-[580px] rounded-[2.5rem] border-none glass-premium p-0 overflow-hidden shadow-2xl flex flex-col max-h-[96vh]">
        <div className="p-8 pb-4 shrink-0">
          <DialogHeader className="space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 shadow-sm ring-4 ring-primary/5">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
              Tạo Email Mẫu mới
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-xs">
              Lưu lại mẫu email để sử dụng lại nhanh chóng cho các công việc thường xuyên.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 pb-8 space-y-6 custom-scrollbar">
          <div className="space-y-3">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
              Gửi cho:
            </Label>
            <div className="flex gap-2">
              {recipientTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setRecipientType(type.value)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ring-1 ring-inset",
                    recipientType === type.value
                      ? "bg-primary text-white ring-primary shadow-lg shadow-primary/20"
                      : "bg-white/60 text-slate-400 ring-slate-100 hover:bg-white"
                  )}
                >
                  <type.icon className={cn("h-3 w-3", recipientType === type.value ? "text-white" : "text-slate-400")} />
                  {type.label}
                  {recipientType === type.value && <Check className="h-3 w-3 stroke-[4px]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
              Tên mẫu *
            </Label>
            <Input 
              id="title" 
              placeholder="v.d. Yêu cầu báo giá, Nhắc deadline..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="rounded-xl h-12 bg-white/90 border-none focus-visible:ring-primary/20 font-medium shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
              Tiêu đề email *
            </Label>
            <Input 
              id="subject" 
              placeholder="Nhập tiêu đề email..." 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="rounded-xl h-12 bg-white/90 border-none focus-visible:ring-primary/20 font-medium shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
              Nội dung email *
            </Label>
            <Textarea 
              id="body" 
              placeholder={`Chào [Tên người nhận],\n\nChúng tôi đang cần [Sản phẩm]...\n\nTrân trọng,\n[Tên bạn]`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              className="min-h-[180px] rounded-2xl bg-white/90 border-none focus-visible:ring-primary/20 font-medium shadow-sm resize-none p-4"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
              Giai đoạn liên quan (Tùy chọn)
            </Label>
            <div className="flex flex-wrap gap-2">
              {stages.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStage(stage === s.name ? null : s.name)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border outline-none",
                    stage === s.name 
                      ? cn("text-white border-transparent shadow-lg", s.color)
                      : "bg-white/60 text-slate-400 border-white hover:bg-white"
                  )}
                >
                  <Layers className={cn("h-3 w-3", stage === s.name ? "text-white" : "text-slate-400")} />
                  {s.name}
                  {stage === s.name && <Check className="h-3 w-3 stroke-[4px]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
              Tags (tối đa 10)
            </Label>
            <div className="space-y-3">
              <Input 
                placeholder="Nhập tag và nhấn Enter..." 
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                disabled={tags.length >= 10}
                className="rounded-xl h-10 bg-white/60 border-none focus-visible:ring-primary/20 font-medium shadow-sm"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest"
                    >
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => removeTag(tag)}
                        className="hover:text-rose-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 sticky bottom-0 bg-transparent">
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full rounded-[2rem] h-14 font-black text-base shadow-xl shadow-primary/20 bg-primary text-white hover:bg-primary/95 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? 'Đang lưu mẫu...' : 'Lưu Email Mẫu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
