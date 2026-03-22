'use client'

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Mail, Copy, Check, X, Clock, User, Tag, Layers } from 'lucide-react'
import { useState } from 'react'
import { EmailTemplate } from './email-template-card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface ViewEmailTemplateDialogProps {
  template: EmailTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCopySuccess: (id: string) => void
}

export function ViewEmailTemplateDialog({ 
  template, 
  open, 
  onOpenChange,
  onCopySuccess
}: ViewEmailTemplateDialogProps) {
  const [copiedType, setCopiedType] = useState<'subject' | 'body' | 'both' | null>(null)

  if (!template) return null

  const handleCopy = async (type: 'subject' | 'body' | 'both') => {
    let text = ''
    if (type === 'subject') text = template.subject
    if (type === 'body') text = template.body
    if (type === 'both') text = `Subject: ${template.subject}\n\n${template.body}`
    
    try {
      await navigator.clipboard.writeText(text)
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 1500)
      onCopySuccess(template.id)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] rounded-[2.5rem] border-none glass-premium p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="p-8 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                <Mail className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">
                  Chi tiết Email Mẫu
                </DialogTitle>
                <p className="text-slate-500 text-xs font-medium">Xem nội dung chi tiết và sao chép mẫu email.</p>
              </div>
            </div>
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)}
                className="h-10 w-10 rounded-full hover:bg-slate-100"
            >
                <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 custom-scrollbar">
          {/* Main Info */}
          <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tên mẫu</label>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-800 text-lg">
                    {template.title}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ngày tạo</label>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50/50 border border-slate-100 text-sm font-bold text-slate-600">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {format(new Date(template.created_at), 'dd/MM/yyyy')}
                    </div>
                </div>
                {template.stage && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Giai đoạn</label>
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 text-sm font-bold text-primary">
                            <Layers className="h-4 w-4 text-primary" />
                            {template.stage}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tiêu đề email</label>
                <div className="p-4 rounded-2xl bg-white border border-slate-100 font-bold text-slate-800 shadow-sm flex items-center justify-between group">
                    <span className="truncate mr-4">{template.subject}</span>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleCopy('subject')}
                        className={cn(
                            "h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2 transition-all",
                            copiedType === 'subject' ? "text-emerald-600 bg-emerald-50" : "text-primary hover:bg-primary/10"
                        )}
                    >
                        {copiedType === 'subject' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedType === 'subject' ? 'Đã chép' : 'Sao chép'}
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nội dung</label>
                <div className="relative group">
                    <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 text-slate-700 leading-relaxed font-medium whitespace-pre-wrap min-h-[200px]">
                        {template.body}
                    </div>
                    <Button 
                        onClick={() => handleCopy('body')}
                        className={cn(
                            "absolute top-4 right-4 h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg transition-all active:scale-95",
                            copiedType === 'body' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-primary hover:bg-primary-dark"
                        )}
                    >
                        {copiedType === 'body' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copiedType === 'body' ? 'Đã sao chép nội dung' : 'Sao chép nội dung'}
                    </Button>
                </div>
            </div>

            {template.tags.length > 0 && (
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-1.5">
                        <Tag className="h-3 w-3" /> Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {template.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="rounded-lg bg-white border-slate-100 text-slate-500 font-bold text-[10px] px-3 py-1 uppercase tracking-wider">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-8 pt-4 shrink-0 bg-slate-50/50 border-t border-slate-100">
          <Button 
            onClick={() => handleCopy('both')}
            className={cn(
                "w-full rounded-2xl h-14 font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95",
                copiedType === 'both' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-primary hover:bg-primary-dark shadow-primary/20"
            )}
          >
             {copiedType === 'both' ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
             {copiedType === 'both' ? 'Đã sao chép tất cả' : 'Sao chép tất cả'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
