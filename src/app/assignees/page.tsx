'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Shield, Plus, MoreHorizontal, Users, AlertCircle, Trash2 } from 'lucide-react'
import { NewAssigneeDialog } from '@/components/assignees/new-assignee-dialog'
import { cn } from '@/lib/utils'

export default function AssigneesPage() {
  const [assignees, setAssignees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssignees = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('assignees').select('*').order('full_name')
    if (data) setAssignees(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAssignees()
  }, [fetchAssignees])

  const deleteAssignee = async (id: string) => {
    if (!confirm('Xóa nhân sự này khỏi hệ thống?')) return
    const { error } = await supabase.from('assignees').delete().eq('id', id)
    if (!error) {
      setAssignees(assignees.filter(a => a.id !== id))
    }
  }

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

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
             [1, 2, 3, 4, 5, 6].map(i => (
               <div key={i} className="h-56 glass-premium rounded-[2.5rem] animate-pulse" />
             ))
          ) : assignees.length > 0 ? (
            assignees.map(p => (
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
                      onClick={() => deleteAssignee(p.id)}
                      className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 px-8 pb-8 relative z-10">
                  <h4 className="text-xl font-black text-slate-900 tracking-tight mb-1">{p.full_name || 'Anonymous User'}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-primary" />
                    {p.role || 'Member'}
                  </p>
                  
                  {p.email && (
                    <div className="flex items-center gap-3 p-3 bg-white/40 rounded-2xl border border-white/60 shadow-sm">
                      <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
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
      </section>
    </div>
  )
}
