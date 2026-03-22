'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Building2, 
  Users, 
  Globe, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Check, 
  Copy,
  Layers 
} from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type EmailTemplate = {
  id: string
  title: string
  subject: string
  body: string
  recipient_type: 'supplier' | 'internal' | 'both'
  tags: string[]
  use_count: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  created_by: string
  stage: string | null
}

interface EmailTemplateCardProps {
  template: EmailTemplate
  onEdit: (template: EmailTemplate) => void
  onDelete: (id: string) => void
  onCopySuccess: (id: string) => void
  onViewDetails: (template: EmailTemplate) => void
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
}

export function EmailTemplateCard({ 
  template, 
  onEdit, 
  onDelete, 
  onCopySuccess,
  onViewDetails,
  isSelected = false,
  onSelect
}: EmailTemplateCardProps) {
  const [copiedType, setCopiedType] = useState<'subject' | 'body' | 'both' | null>(null)

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
      
      await supabase
        .from('email_templates')
        .update({ use_count: template.use_count + 1 })
        .eq('id', template.id)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const getRecipientBadge = (type: string) => {
    switch (type) {
      case 'supplier':
        return (
          <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 border-none gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <Building2 className="h-3 w-3" /> Nhà cung cấp
          </Badge>
        )
      case 'internal':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <Users className="h-3 w-3" /> Nội bộ
          </Badge>
        )
      case 'both':
        return (
          <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <Globe className="h-3 w-3" /> Cả hai
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div 
      className={cn(
        "group relative rounded-[2.5rem] bg-white border-none shadow-xl shadow-slate-200/50 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/70 transition-all duration-300 flex flex-col h-full ring-1 ring-slate-100 cursor-pointer",
        isSelected && "ring-2 ring-primary bg-primary/[0.02] shadow-primary/10"
      )}
      onClick={() => onViewDetails(template)}
    >
      {/* Selection Checkbox */}
      <div 
        className={cn(
          "absolute top-6 left-6 z-10 transition-all duration-300",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          onClick={() => onSelect?.(template.id, !isSelected)}
          className={cn(
            "h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer",
            isSelected 
              ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
              : "bg-white/80 border-slate-200 hover:border-primary/50 text-transparent"
          )}
        >
          <Check className="h-3 w-3 stroke-[4px]" />
        </div>
      </div>

      {/* Card Header Content */}
      <div className="p-8 pt-12 flex-1 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {getRecipientBadge(template.recipient_type)}
            <div className="h-1 w-1 rounded-full bg-slate-200" />
            
            {template.stage && (
              <>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/5 text-primary border border-primary/10">
                  <Layers className="h-3 w-3" />
                  <span className="text-[9px] font-black uppercase tracking-widest">{template.stage}</span>
                </div>
                <div className="h-1 w-1 rounded-full bg-slate-200" />
              </>
            )}

            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {template.use_count} lượt dùng
            </span>
          </div>
          
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl glass-premium p-2">
                <DropdownMenuItem 
                  onClick={() => onViewDetails(template)}
                  className="rounded-xl px-4 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary gap-2 font-bold text-xs"
                >
                  <Globe className="h-3.5 w-3.5" /> Xem chi tiết
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onEdit(template)}
                  className="rounded-xl px-4 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary gap-2 font-bold text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(template.id)}
                  className="rounded-xl px-4 py-2 cursor-pointer focus:bg-rose-50 focus:text-rose-600 gap-2 font-bold text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Xoá mẫu
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight group-hover:text-primary transition-colors duration-300">
            {template.title}
          </h3>
          
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wide">
              <span className="opacity-50">Subject:</span> {template.subject}
            </p>
          </div>

          <div className="relative">
            <p className="text-[13px] text-slate-600 leading-relaxed font-medium line-clamp-6 whitespace-pre-wrap">
              {template.body}
            </p>
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>

          <div className="flex flex-wrap gap-1 pt-2">
            {template.tags.slice(0, 3).map((tag) => (
              <span 
                key={tag} 
                className="text-[9px] bg-slate-50 text-slate-400 font-black uppercase tracking-widest rounded-lg px-2 py-1 ring-1 ring-slate-100"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="text-[10px] font-black text-slate-300">+{template.tags.length - 3}</span>
            )}
          </div>
        </div>
      </div>

      {/* Copy Actions Footer */}
      <div 
        className="mt-auto border-t border-slate-50 grid grid-cols-3 divide-x divide-slate-50"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={() => handleCopy('subject')}
          className={cn(
            "flex flex-col items-center justify-center h-14 gap-1 text-[9px] font-black uppercase tracking-widest transition-all",
            copiedType === 'subject' ? "text-emerald-500 bg-emerald-50/50" : "text-slate-400 hover:text-primary hover:bg-primary/5"
          )}
        >
          {copiedType === 'subject' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Subject
        </button>
        <button 
          onClick={() => handleCopy('body')}
          className={cn(
            "flex flex-col items-center justify-center h-14 gap-1 text-[9px] font-black uppercase tracking-widest transition-all",
            copiedType === 'body' ? "text-emerald-500 bg-emerald-50/50" : "text-slate-400 hover:text-primary hover:bg-primary/5"
          )}
        >
          {copiedType === 'body' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Body
        </button>
        <button 
          onClick={() => handleCopy('both')}
          className={cn(
            "flex flex-col items-center justify-center h-14 gap-1 text-[9px] font-black uppercase tracking-widest transition-all",
            copiedType === 'both' ? "text-emerald-500 bg-emerald-50/50" : "text-slate-400 hover:text-primary hover:bg-primary/5"
          )}
        >
          {copiedType === 'both' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Cả hai
        </button>
      </div>
    </div>
  )
}
