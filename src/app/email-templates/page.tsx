'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Mail, Search, X, Filter, Download, Trash2, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EmailTemplateCard, EmailTemplate } from '@/components/email-templates/email-template-card'
import { NewEmailTemplateDialog } from '@/components/email-templates/new-email-template-dialog'
import { EditEmailTemplateDialog } from '@/components/email-templates/edit-email-template-dialog'
import { ImportEmailTemplatesDialog } from '@/components/email-templates/import-email-templates-dialog'
import { ViewEmailTemplateDialog } from '@/components/email-templates/view-email-template-dialog'

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'supplier' | 'internal' | 'both'>('all')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [viewingTemplate, setViewingTemplate] = useState<EmailTemplate | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .is('deleted_at', null)
        .order('use_count', { ascending: false })
      
      if (error) throw error
      if (data) setTemplates(data)
    } catch (err) {
      console.error("Lỗi khi tải danh sách email mẫu:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()

    // Real-time subscription
    const channel = supabase
      .channel('email_templates_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_templates'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTemplate = payload.new as EmailTemplate
            if (!newTemplate.deleted_at) {
              setTemplates(prev => {
                if (prev.find(t => t.id === newTemplate.id)) return prev
                return [newTemplate, ...prev].sort((a, b) => b.use_count - a.use_count)
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedTemplate = payload.new as EmailTemplate
            if (updatedTemplate.deleted_at) {
              setTemplates(prev => prev.filter(t => t.id !== updatedTemplate.id))
            } else {
              setTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t).sort((a, b) => b.use_count - a.use_count))
            }
          } else if (payload.eventType === 'DELETE') {
            setTemplates(prev => prev.filter(t => t.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá mẫu email này?')) return

    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch (err: any) {
      console.error("Lỗi khi xoá email mẫu:", err)
      alert(`Lỗi khi xoá email mẫu: ${err.message || 'Vui lòng thử lại sau.'}`)
    }
  }

  const handleCopySuccess = (id: string) => {
    setTemplates(prev => prev.map(t => 
      t.id === id ? { ...t, use_count: t.use_count + 1 } : t
    ))
  }

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTemplates.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTemplates.map(t => t.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Bạn có chắc chắn muốn xoá ${selectedIds.size} mẫu email này?`)) return

    try {
      const idsToDelete = Array.from(selectedIds)
      const { error } = await supabase
        .from('email_templates')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', idsToDelete)

      if (error) throw error
      
      setTemplates(prev => prev.filter(t => !selectedIds.has(t.id)))
      setSelectedIds(new Set())
    } catch (err: any) {
      console.error("Lỗi khi xoá hàng loạt email mẫu:", err)
      alert(`Lỗi khi xoá hàng loạt email mẫu: ${err.message || 'Vui lòng thử lại sau.'}`)
    }
  }

  const filteredTemplates = useMemo(() => {
    return templates
      .filter(t => activeFilter === 'all' || t.recipient_type === activeFilter)
      .filter(t => !activeTag || t.tags.includes(activeTag))
      .filter(t =>
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.body.toLowerCase().includes(searchQuery.toLowerCase())
      )
  }, [templates, activeFilter, activeTag, searchQuery])

  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredTemplates.slice(start, start + itemsPerPage)
  }, [filteredTemplates, currentPage])

  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter, activeTag, searchQuery])

  const allTags = useMemo(() => {
    const tags = templates.flatMap(t => t.tags)
    return [...new Set(tags)].sort()
  }, [templates])

  const filterTabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'supplier', label: 'Nhà cung cấp' },
    { id: 'internal', label: 'Nội bộ' },
    { id: 'both', label: 'Cả hai' },
  ] as const

  return (
    <div className="space-y-12 max-w-[1400px] mx-auto pb-32 animate-in fade-in duration-700">
      {/* Header Section */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-[2rem] bg-white text-primary flex items-center justify-center shadow-2xl shadow-primary/10 ring-8 ring-primary/[0.03]">
            <Mail className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Email Mẫu</h1>
            <p className="text-slate-500 text-sm font-medium">Lưu trữ và tái sử dụng các mẫu email để làm việc hiệu quả hơn.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {templates.length > 0 && (
            <Button
              variant="outline"
              onClick={toggleSelectAll}
              className="rounded-xl border-slate-200 gap-2 h-10 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              {selectedIds.size === filteredTemplates.length && filteredTemplates.length > 0 ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {selectedIds.size === filteredTemplates.length && filteredTemplates.length > 0 ? 'Bỏ chọn hết' : 'Chọn hết'}
            </Button>
          )}
          <ImportEmailTemplatesDialog onImported={fetchTemplates} />
          <NewEmailTemplateDialog onCreated={fetchTemplates} />
        </div>
      </section>

      {/* Search and Filters */}
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Tìm kiếm theo tiêu đề, subject hoặc nội dung..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 rounded-[1.5rem] h-12 bg-white border-none shadow-sm focus-visible:ring-primary/20 font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  "px-4 h-9 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                  activeFilter === tab.id 
                    ? "bg-white text-primary shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar scroll-smooth">
            <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
              <Filter className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest ml-1">Tags:</span>
            </div>
            <div className="flex items-center gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ring-1 shrink-0",
                    activeTag === tag
                      ? "bg-primary text-white ring-primary shadow-lg shadow-primary/20"
                      : "bg-white text-slate-400 ring-slate-100 hover:bg-slate-50"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Grid of Templates */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-[2.5rem] bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredTemplates.length > 0 ? (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {paginatedTemplates.map((template) => (
              <EmailTemplateCard 
                key={template.id} 
                template={template}
                onEdit={setEditingTemplate}
                onDelete={handleDelete}
                onCopySuccess={handleCopySuccess}
                onViewDetails={setViewingTemplate}
                isSelected={selectedIds.has(template.id)}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-8 pb-12">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-12 w-12 rounded-[1.25rem] border-slate-200 hover:bg-white hover:text-primary hover:border-primary/30 transition-all shadow-sm disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-2 px-6 h-12 bg-white/50 backdrop-blur-sm border border-slate-100 rounded-[1.25rem] shadow-sm">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Trang</span>
                <span className="text-sm font-black text-primary">{currentPage}</span>
                <span className="text-xs font-black text-slate-300 uppercase tracking-widest mx-1">/</span>
                <span className="text-sm font-black text-slate-400">{totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-12 w-12 rounded-[1.25rem] border-slate-200 hover:bg-white hover:text-primary hover:border-primary/30 transition-all shadow-sm disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
          <div className="h-20 w-20 rounded-[2.5rem] bg-white flex items-center justify-center shadow-sm">
            <Mail className="h-10 w-10 text-slate-200" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">
              {searchQuery || activeFilter !== 'all' || activeTag ? 'Không tìm thấy mẫu phù hợp' : 'Chưa có email mẫu nào'}
            </h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              {searchQuery || activeFilter !== 'all' || activeTag 
                ? 'Hãy thử điều chỉnh lại bộ lọc hoặc từ khoá tìm kiếm.' 
                : 'Bắt đầu bằng cách tạo mẫu email đầu tiên của bạn.'}
            </p>
          </div>
          {(searchQuery || activeFilter !== 'all' || activeTag) ? (
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('')
                setActiveFilter('all')
                setActiveTag(null)
              }}
              className="rounded-xl border-slate-200 font-bold text-xs uppercase tracking-widest"
            >
              Xoá bộ lọc
            </Button>
          ) : (
            <div className="flex gap-4">
              <ImportEmailTemplatesDialog onImported={fetchTemplates} />
              <NewEmailTemplateDialog onCreated={fetchTemplates} />
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      {editingTemplate && (
        <EditEmailTemplateDialog 
          template={editingTemplate}
          open={!!editingTemplate}
          onOpenChange={(open) => !open && setEditingTemplate(null)}
          onUpdated={fetchTemplates}
        />
      )}

      <ViewEmailTemplateDialog
        template={viewingTemplate}
        open={!!viewingTemplate}
        onOpenChange={(open) => !open && setViewingTemplate(null)}
        onCopySuccess={handleCopySuccess}
      />

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-12 duration-500">
          <div className="px-8 py-5 bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100/50 flex items-center gap-10">
            <div className="flex items-center gap-5 border-r border-slate-100 pr-10">
              <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-lg shadow-xl shadow-primary/20 scale-110">
                {selectedIds.size}
              </div>
              <div className="space-y-0.5">
                <p className="text-slate-900 text-[10px] font-black uppercase tracking-widest leading-none">Mẫu đã chọn</p>
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest leading-none">Phân phối hàng loạt</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleBulkDelete}
                className="h-14 px-8 rounded-[1.5rem] bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-500/20 transition-all gap-3 font-black uppercase tracking-widest text-xs active:scale-95"
              >
                <Trash2 className="h-5 w-5" />
                Xoá hàng loạt
              </Button>
              
              <Button 
                onClick={() => setSelectedIds(new Set())}
                variant="ghost"
                className="h-14 px-6 rounded-[1.5rem] text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all gap-2 font-black uppercase tracking-widest text-[10px]"
              >
                <X className="h-4 w-4" />
                Huỷ thao tác
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
