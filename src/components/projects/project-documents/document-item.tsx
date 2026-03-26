'use client'

import { FileText, Link as LinkIcon, Image as ImageIcon, File, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { ProjectDocument } from '@/hooks/use-project-documents'

export function DocumentItem({ 
  doc, 
  size = 'md', 
  onClick 
}: { 
  doc: ProjectDocument, 
  size?: 'sm' | 'md',
  onClick?: () => void
}) {
  const Icon = doc.type === 'note' ? FileText : doc.type === 'link' ? LinkIcon : doc.type === 'image' ? ImageIcon : File
  
  return (
    <div 
      className={cn(
        "flex items-center gap-3 hover:bg-slate-50 transition-all cursor-pointer group/item",
        size === 'sm' ? "p-3 px-4" : "p-4"
      )}
      onClick={onClick}
    >
      <div className={cn(
        "rounded-xl flex items-center justify-center shrink-0",
        size === 'sm' ? "h-9 w-9" : "h-11 w-11",
        doc.type === 'note' ? "bg-amber-50 text-amber-500 ring-1 ring-amber-100" : 
        doc.type === 'link' ? "bg-blue-50 text-blue-500 ring-1 ring-blue-100" : 
        doc.type === 'image' ? "bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100" : 
        "bg-slate-50 text-slate-500 ring-1 ring-slate-100"
      )}>
        <Icon className={size === 'sm' ? "h-4 w-4" : "h-5 w-5"} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={cn(
          "font-bold text-slate-800 truncate leading-snug group-hover/item:text-primary transition-colors",
          size === 'sm' ? "text-[12px]" : "text-sm"
        )}>
          {doc.title}
        </h4>
        {doc.type === 'note' && doc.content && size === 'md' && (
          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5 opacity-80 line-clamp-1">
            {doc.content}
          </p>
        )}
        {doc.type === 'link' && doc.url && size === 'md' && (
          <p className="text-[11px] text-blue-500/70 font-medium truncate mt-0.5 line-clamp-1">
             {doc.url.replace(/^https?:\/\/(www\.)?/, '')}
          </p>
        )}
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter flex items-center gap-1 opacity-70 mt-1">
          {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: vi })}
          {doc.file_size !== undefined && doc.file_size !== null && (
             <>
                <span className="opacity-40">•</span>
                <span>{(doc.file_size / 1024 / 1024).toFixed(1)} MB</span>
             </>
          )}
        </p>
      </div>
      <ExternalLink className="h-3 w-3 text-slate-300 opacity-0 group-hover/item:opacity-100 transition-opacity" />
    </div>
  )
}
