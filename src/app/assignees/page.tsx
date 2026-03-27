'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Shield, Plus, MoreHorizontal, Users, AlertCircle, Trash2, Pencil, Search, X, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { NewAssigneeDialog } from '@/components/assignees/new-assignee-dialog'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function AssigneesPage() {
  const router = useRouter()
  const [assignees, setAssignees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [currentPage, setCurrentPage] = useState(1)

  const [editingAssignee, setEditingAssignee] = useState<any>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  useEffect(() => {
    document.title = 'Nhân sự | Jitasks'
  }, [])

  const fetchAssignees = useCallback(async () => {
    setLoading(true)
    // Lấy thông tin nhân sự kèm theo các task để đếm số project
    const { data } = await supabase
      .from('assignees')
      .select('*, tasks(project_id)')
      .is('deleted_at', null)
      .order('full_name')
    if (data) {
      const processed = data.map(a => {
        const projectIds = new Set((a.tasks || []).map((t: any) => t.project_id))
        return { ...a, projectCount: projectIds.size }
      })
      setAssignees(processed)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAssignees()
  }, [fetchAssignees])

  const deleteAssignee = async (id: string) => {
    if (!confirm('Xóa nhân sự này khỏi hệ thống?')) return
    const { error } = await supabase
      .from('assignees')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    
    if (!error) {
      setAssignees(assignees.filter(a => a.id !== id))
    }
  }

  const filteredAssignees = useMemo(() => {
    let result = [...assignees]
    if (searchQuery) {
      result = result.filter(a => 
        (a.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.role || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    result.sort((a, b) => {
      const cmp = (a.full_name || '').localeCompare(b.full_name || '')
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return result
  }, [assignees, searchQuery, sortOrder])

  const totalPages = Math.ceil(filteredAssignees.length / itemsPerPage)
  const paginatedAssignees = filteredAssignees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="space-y-12 max-w-[1400px] mx-auto pb-20">
      {/* Premium Header Section */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-[1.8rem] bg-white text-primary flex items-center justify-center shadow-2xl shadow-primary/10 ring-8 ring-primary/[0.03]">
            <Users className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý Staff</h1>
            <p className="text-slate-500 text-sm font-medium">Danh sách nhân sự và phân quyền thực hiện dự án.</p>
          </div>
        </div>
        
        <NewAssigneeDialog onAssigneeCreated={fetchAssignees} trigger={
          <Button className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
            <Plus className="mr-2 h-5 w-5 stroke-[3px]"></Plus> Thêm nhân sự mới
          </Button>
        } />
      </section>

      <section className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/40 glass-premium p-3 rounded-3xl border border-white/60 shadow-sm">
        <div className="relative w-full sm:w-[350px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Tìm kiếm Staff..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-10 h-10 bg-white/60 border-none rounded-2xl focus-visible:ring-primary/20 text-sm font-medium transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          <Button
            variant="outline"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="h-10 rounded-2xl bg-white/60 border-none hover:bg-white/100 flex items-center gap-2 whitespace-nowrap px-4 font-bold text-slate-600 shadow-sm"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortOrder === 'desc' ? 'Z - A' : 'A - Z'}
          </Button>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
             [1, 2, 3, 4, 5, 6].map(i => (
               <div key={i} className="h-56 glass-premium rounded-[2.5rem] animate-pulse" />
             ))
          ) : filteredAssignees.length > 0 ? (
            paginatedAssignees.map(p => (
              <Card key={p.id} className="border-none glass-premium hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2.5rem] overflow-hidden group relative">
                <CardHeader className="flex flex-row items-center justify-between pb-2 px-8 pt-8 relative z-10">
                  <div className="h-20 w-20 rounded-[2rem] bg-stone-100 flex items-center justify-center text-slate-400 text-3xl font-black shadow-inner overflow-hidden relative group-hover:scale-105 transition-transform duration-500">
                     {p.full_name?.[0] || 'U'}
                     <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => { setEditingAssignee(p); setIsEditOpen(true); }}
                      className="h-10 w-10 text-slate-300 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteAssignee(p.id)}
                      className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 px-8 pb-8 relative z-10 space-y-4">
                  <div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight mb-1">{p.full_name || 'Anonymous User'}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-primary" />
                      {p.role || 'Member'}
                    </p>
                  </div>
                  
                  <div 
                    className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors group/stats"
                    onClick={() => router.push(`/projects?assignee=${p.id}`)}
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black group-hover/stats:scale-110 transition-transform">
                      {p.projectCount || 0}
                    </div>
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">Dự án tham gia</span>
                  </div>

                  {p.email && (
                    <div className="flex items-center gap-3 p-3 bg-white/40 rounded-2xl border border-white/60 shadow-sm">
                      <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-sm whitespace-nowrap overflow-hidden">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-600 truncate">{p.email}</span>
                    </div>
                  )}
                </CardContent>
                
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors" />
              </Card>
            ))
          ) : (
            <div className="col-span-full py-24 text-center glass-premium rounded-[3rem] border-dashed border-2 border-white/50 flex flex-col items-center gap-4">
               <div className="h-16 w-16 rounded-[2rem] bg-white flex items-center justify-center shadow-sm">
                 <AlertCircle className="h-8 w-8 text-slate-200" />
               </div>
               <div>
                 <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Không có dữ liệu Staff</p>
                 <p className="text-slate-400 text-sm font-medium mt-1">Mời nhân sự mới để bắt đầu quản lý công việc.</p>
               </div>
            </div>
          )}
        </div>
        
        {totalPages >= 1 && (
          <div className="flex items-center justify-between bg-white/40 glass-premium p-2 rounded-2xl border border-white/60 mt-8 shadow-sm">
            <div className="flex items-center gap-4 pl-4">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:inline-block">
                 Trang {currentPage} / {totalPages}
               </span>
               <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                 <SelectTrigger className="h-8 border-none bg-white/60 focus:ring-0 text-xs font-bold w-[120px] rounded-xl">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent className="rounded-xl border-none glass-premium shadow-xl">
                   <SelectItem value="6" className="text-xs font-bold py-2">6 Staff/trang</SelectItem>
                   <SelectItem value="12" className="text-xs font-bold py-2">12 Staff/trang</SelectItem>
                   <SelectItem value="24" className="text-xs font-bold py-2">24 Staff/trang</SelectItem>
                   <SelectItem value="48" className="text-xs font-bold py-2">48 Staff/trang</SelectItem>
                 </SelectContent>
               </Select>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-white/80 shrink-0"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-white/80 shrink-0"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {editingAssignee && (
        <NewAssigneeDialog 
          assignee={editingAssignee}
          open={isEditOpen}
          onOpenChange={(v) => {
            setIsEditOpen(v)
            if (!v) setEditingAssignee(null)
          }}
          onAssigneeCreated={fetchAssignees}
        />
      )}
    </div>
  )
}
