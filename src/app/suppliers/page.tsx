'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Plus, Phone, MapPin, FileText, FileSignature, Trash2, AlertCircle } from 'lucide-react'
import { NewSupplierDialog } from '@/components/suppliers/new-supplier-dialog'
import { cn } from '@/lib/utils'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('suppliers').select('*').order('name')
    if (data) setSuppliers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const deleteSupplier = async (id: string) => {
    if (!confirm('Xóa nhà cung cấp này?')) return
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (!error) {
      setSuppliers(suppliers.filter(s => s.id !== id))
    }
  }

  return (
    <div className="space-y-12 max-w-[1400px] mx-auto pb-20">
      {/* Premium Header Section */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-[1.8rem] bg-white text-primary flex items-center justify-center shadow-2xl shadow-primary/10 ring-8 ring-primary/[0.03]">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Nhà Cung Cấp</h1>
            <p className="text-slate-500 text-sm font-medium">Quản lý danh sách đối tác cung ứng và thông tin liên hệ.</p>
          </div>
        </div>
        
        <NewSupplierDialog onSupplierCreated={fetchSuppliers} trigger={
          <Button className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
            <Plus className="mr-2 h-5 w-5 stroke-[3px]"></Plus> Thêm Đối Tác Mới
          </Button>
        } />
      </section>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
             [1, 2, 3, 4, 5, 6].map(i => (
               <div key={i} className="h-64 glass-premium rounded-[2.5rem] animate-pulse" />
             ))
          ) : suppliers.length > 0 ? (
            suppliers.map(s => (
              <Card key={s.id} className="border-none glass-premium hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2.5rem] overflow-hidden group relative">
                <CardHeader className="flex flex-row items-center justify-between pb-4 px-8 pt-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                      <Building2 className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors">{s.name}</CardTitle>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteSupplier(s.id)}
                      className="h-10 w-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="px-8 pb-8 space-y-5 relative z-10">
                  <div className="flex items-start gap-3 p-4 bg-white/40 rounded-2xl border border-white/60 shadow-sm">
                    <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                      <Phone className="h-4 w-4 text-slate-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-600 truncate pt-2">{s.contact_info || 'Chưa cập nhật'}</span>
                  </div>

                  <div className="space-y-3 pl-1">
                    {s.address && (
                      <div className="flex items-start gap-3 text-[11px] font-bold text-slate-400">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="line-clamp-2 leading-relaxed uppercase tracking-wider">{s.address}</span>
                      </div>
                    )}
                    {s.tax_code && (
                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400">
                        <FileSignature className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>MST: <span className="text-slate-600">{s.tax_code}</span></span>
                      </div>
                    )}
                  </div>

                  {s.notes && (
                    <div className="mt-4 p-4 bg-primary/[0.03] rounded-2xl border border-primary/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1">Ghi chú</p>
                      <p className="text-xs font-medium text-slate-500 line-clamp-2 italic leading-relaxed">
                        &quot;{s.notes}&quot;
                      </p>
                    </div>
                  )}
                </CardContent>
                
                {/* Decorative element - higher resolution gradient approach */}
                <div className="absolute top-0 right-0 h-40 w-40 bg-[radial-gradient(circle_at_70%_30%,oklch(0.7_0.12_15_/_0.12)_0%,oklch(0.7_0.12_15_/_0.05)_40%,transparent_70%)] rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
              </Card>
            ))
          ) : (
            <div className="col-span-full py-24 text-center glass-premium rounded-[3rem] border-dashed border-2 border-white/50 flex flex-col items-center gap-4">
               <div className="h-16 w-16 rounded-[2rem] bg-white flex items-center justify-center shadow-sm">
                 <AlertCircle className="h-8 w-8 text-slate-200" />
               </div>
               <div>
                 <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Không có dữ liệu NCC</p>
                 <p className="text-slate-400 text-sm font-medium mt-1">Thêm đối tác cung ứng để bắt đầu liên kết dự án.</p>
               </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
