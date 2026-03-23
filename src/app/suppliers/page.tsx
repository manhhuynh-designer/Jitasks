'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Plus, Phone, MapPin, FileSignature, Trash2, AlertCircle, Pencil, Search, X, ArrowUpDown, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { NewSupplierDialog } from '@/components/suppliers/new-supplier-dialog'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function SuppliersPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [currentPage, setCurrentPage] = useState(1)

  const [editingSupplier, setEditingSupplier] = useState<any>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  useEffect(() => {
    document.title = 'Nhà cung cấp | Jitasks'
  }, [])

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('suppliers').select('*, projects(id)').order('name')
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

  const filteredSuppliers = useMemo(() => {
    let result = [...suppliers]
    if (searchQuery) {
      result = result.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    result.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name)
      return sortOrder === 'asc' ? cmp : -cmp
    })
    return result
  }, [suppliers, searchQuery, sortOrder])

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage)
  const paginatedSuppliers = filteredSuppliers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

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

      <section className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/40 glass-premium p-3 rounded-3xl border border-white/60 shadow-sm">
        <div className="relative w-full sm:w-[350px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Tìm kiếm NCC..." 
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
               <div key={i} className="h-64 glass-premium rounded-[2.5rem] animate-pulse" />
             ))
          ) : filteredSuppliers.length > 0 ? (
            paginatedSuppliers.map(s => (
              <Card key={s.id} className="border-none glass-premium hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2.5rem] overflow-hidden group relative">
                <CardHeader className="flex flex-row items-center justify-between pb-4 px-8 pt-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                      <Building2 className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors">{s.name}</CardTitle>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => { setEditingSupplier(s); setIsEditOpen(true); }}
                      className="h-10 w-10 text-slate-300 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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
                
                <CardContent className="px-8 pb-8 space-y-4 relative z-10">
                  <div 
                    className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 mb-4 cursor-pointer hover:bg-primary/10 transition-colors group/stats"
                    onClick={() => router.push(`/projects?status=&supplier=${s.id}`)}
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black group-hover/stats:scale-110 transition-transform">
                      {s.projects?.length || 0}
                    </div>
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">Dự án tham gia</span>
                  </div>

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
                   <SelectItem value="6" className="text-xs font-bold py-2">6 NCC/trang</SelectItem>
                   <SelectItem value="12" className="text-xs font-bold py-2">12 NCC/trang</SelectItem>
                   <SelectItem value="24" className="text-xs font-bold py-2">24 NCC/trang</SelectItem>
                   <SelectItem value="48" className="text-xs font-bold py-2">48 NCC/trang</SelectItem>
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

      {editingSupplier && (
        <NewSupplierDialog 
          supplier={editingSupplier}
          open={isEditOpen}
          onOpenChange={(v) => {
            setIsEditOpen(v)
            if (!v) setEditingSupplier(null)
          }}
          onSupplierCreated={fetchSuppliers}
        />
      )}
    </div>
  )
}
