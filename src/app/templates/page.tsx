'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Settings2, Trash2, ClipboardCheck, AlertCircle, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { NewTemplateDialog } from '@/components/templates/new-template-dialog'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const [{ data: tData }, { data: cData }] = await Promise.all([
      supabase.from('task_templates').select('*').order('project_status'),
      supabase.from('project_categories').select('*').order('order_index')
    ])
    
    if (tData) setTemplates(tData)
    if (cData) {
       setCategories(cData)
       if (cData.length > 0 && !activeCategoryId) {
         setActiveCategoryId(cData[0].name) // Using name as ID for filtering since data uses name
       }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const deleteTemplate = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa template này?')) return
    const { error } = await supabase.from('task_templates').delete().eq('id', id)
    if (!error) {
      setTemplates(templates.filter(t => t.id !== id))
    }
  }

  if (loading && categories.length === 0) return (
    <div className="p-8 space-y-10 animate-in fade-in duration-500">
      <div className="h-20 w-1/3 bg-slate-100 rounded-[2.5rem] animate-pulse" />
      <div className="h-14 w-full bg-slate-100 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-50 rounded-[2rem] animate-pulse" />)}
      </div>
    </div>
  )

  const activeStatuses = categories.length > 0 ? categories : []
  const currentCategory = activeStatuses.find(c => c.name === activeCategoryId)

  return (
    <div className="space-y-12 max-w-[1400px] mx-auto pb-20">
      {/* Header Section */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-[1.8rem] bg-white text-primary flex items-center justify-center shadow-2xl shadow-primary/10 ring-8 ring-primary/[0.03]">
            <Settings2 className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý Templates</h1>
            <p className="text-slate-500 text-sm font-medium">Cấu hình các task tự động khi bắt đầu giai đoạn mới.</p>
          </div>
        </div>
        
        <NewTemplateDialog onTemplateCreated={fetchData} trigger={
          <Button className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
            <Plus className="mr-2 h-5 w-5 stroke-[3px]"></Plus> Thêm Template mới
          </Button>
        } />
      </section>

      {/* Stage Switcher (Reused from Project Detail) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Chọn Giai đoạn để thiết lập</h3>
        </div>
        
        <div className="flex items-center w-full bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/60 overflow-hidden shadow-sm p-1.5">
          {activeStatuses.map((cat, index) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategoryId(cat.name)}
              className={cn(
                "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative group border-none outline-none rounded-2xl",
                activeCategoryId === cat.name 
                  ? cn("text-white z-10 shadow-lg", cat.color) 
                  : cn("bg-transparent text-slate-400 hover:bg-white hover:text-slate-600")
              )}
            >
              {cat.name}
              {activeCategoryId === cat.name && (
                 <span className="absolute inset-0 bg-white/10 animate-pulse rounded-2xl" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Content Section */}
      <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 px-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-black text-slate-800 tracking-tight">
            Danh sách Task của "{activeCategoryId}"
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.filter(t => t.project_status === activeCategoryId).length > 0 ? (
            templates.filter(t => t.project_status === activeCategoryId).map(t => (
              <Card key={t.id} className="border-none glass-premium shadow-none hover:shadow-xl hover:shadow-slate-200/50 transition-all group rounded-[2rem] overflow-hidden cursor-pointer">
                <CardContent className="p-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", currentCategory?.color || 'bg-slate-100')}>
                      <ClipboardCheck className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-slate-800 tracking-tight truncate">{t.task_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border-none">
                          Prio: {t.default_priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteTemplate(t.id)}
                    className="h-10 w-10 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-20 text-center glass-premium rounded-[3rem] border-dashed border-2 border-white/50 flex flex-col items-center gap-4">
               <div className="h-16 w-16 rounded-[2rem] bg-slate-50 flex items-center justify-center">
                 <AlertCircle className="h-8 w-8 text-slate-200" />
               </div>
               <div>
                 <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Chưa có template task nào</p>
                 <p className="text-slate-400 text-sm font-medium mt-1">Các task này sẽ tự động được gán khi Project sang giai đoạn này.</p>
               </div>
            </div>
          )}
          
          <NewTemplateDialog onTemplateCreated={fetchData} defaultStatus={activeCategoryId || undefined} trigger={
            <Button variant="ghost" className="h-full min-h-[90px] border-2 border-dashed border-white/60 rounded-[2rem] glass-premium text-slate-400 hover:border-primary/30 hover:bg-white hover:text-primary group transition-all">
              <div className="flex flex-col items-center gap-1">
                <Plus className="h-6 w-6 group-hover:scale-110 transition-transform font-bold"></Plus>
                <span className="text-[10px] font-black uppercase tracking-widest">Thêm task template</span>
              </div>
            </Button>
          } />
        </div>
      </section>
    </div>
  )
}
