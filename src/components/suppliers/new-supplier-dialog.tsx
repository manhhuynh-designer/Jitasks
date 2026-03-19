'use client'

import { useState } from 'react'
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
import { Plus, Building2, Phone, MapPin, FileSignature, FileText } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

export function NewSupplierDialog({ 
  onSupplierCreated,
  trigger
}: { 
  onSupplierCreated?: () => void,
  trigger?: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [address, setAddress] = useState('')
  const [taxCode, setTaxCode] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Not logged in.")
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('suppliers')
        .insert({ 
          name, 
          contact_info: contactInfo,
          address,
          tax_code: taxCode,
          notes,
          created_by: user.id
        })

      if (error) {
        console.error("Error creating supplier:", error)
        alert(`Error: ${error.message}`)
      } else {
        setName('')
        setContactInfo('')
        setAddress('')
        setTaxCode('')
        setNotes('')
        setOpen(false)
        if (onSupplierCreated) onSupplierCreated()
      }
    } catch (err) {
      console.error("Unexpected error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        trigger || (
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary transition-colors font-bold">
            <Plus className="h-4 w-4"></Plus>
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none glass-premium p-0 overflow-hidden shadow-2xl">
        <div className="p-8 pb-0">
          <DialogHeader className="space-y-3 text-left">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 mx-0 shadow-sm ring-4 ring-primary/[0.03]">
              <Building2 className="h-7 w-7 text-primary"></Building2>
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">Thêm Nhà Cung Cấp</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-sm">
              Thông tin nhà cung cấp sẽ được dùng để phân loại và quản lý dự án.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="s-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tên Nhà Cung Cấp</Label>
            <Input 
              id="s-name" 
              placeholder="v.d. Công ty Ánh Dương..." 
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
              className="rounded-2xl h-14 bg-white/60 border-white/60 focus-visible:ring-primary/10 font-bold text-slate-800 shadow-sm border"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="s-contact" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Liên hệ</Label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors"></Phone>
                <Input 
                  id="s-contact" 
                  placeholder="SĐT hoặc Email" 
                  value={contactInfo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactInfo(e.target.value)}
                  className="pl-11 rounded-2xl h-14 bg-white/60 border-white/60 focus-visible:ring-primary/10 font-bold text-slate-800 shadow-sm border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-tax" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">MST</Label>
              <div className="relative group">
                <FileSignature className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors"></FileSignature>
                <Input 
                  id="s-tax" 
                  placeholder="Mã số thuế..." 
                  value={taxCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaxCode(e.target.value)}
                  className="pl-11 rounded-2xl h-14 bg-white/60 border-white/60 focus-visible:ring-primary/10 font-bold text-slate-800 shadow-sm border"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-address" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Địa chỉ</Label>
            <div className="relative group">
              <MapPin className="absolute left-4 top-5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors"></MapPin>
              <Input 
                id="s-address" 
                placeholder="v.d. 123 Nguyễn Văn Linh..." 
                value={address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
                className="pl-11 rounded-2xl h-14 bg-white/60 border-white/60 focus-visible:ring-primary/10 font-bold text-slate-800 shadow-sm border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-notes" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ghi chú thêm</Label>
            <div className="relative group">
              <FileText className="absolute left-4 top-4 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors"></FileText>
              <Textarea 
                id="s-notes" 
                placeholder="Kinh nghiệm, thế mạnh..." 
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                className="pl-11 min-h-[100px] py-4 rounded-2xl bg-white/60 border-white/60 focus-visible:ring-primary/10 font-medium shadow-sm border text-slate-800 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading} className="w-full rounded-[2rem] h-16 font-black text-lg shadow-xl shadow-primary/20 bg-primary text-white hover:bg-primary/95 transition-all hover:scale-[1.02] active:scale-[0.98]">
              {loading ? 'Đang lưu...' : 'Lưu Nhà Cung Cấp'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
