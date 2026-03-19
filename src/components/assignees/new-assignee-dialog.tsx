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
import { Plus, UserPlus, Shield } from 'lucide-react'

export function NewAssigneeDialog({ 
  onAssigneeCreated,
  trigger
}: { 
  onAssigneeCreated?: () => void,
  trigger?: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Bạn chưa đăng nhập.")
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('assignees')
        .insert({ 
          full_name: fullName, 
          role: role,
          email: email,
          created_by: user.id
        })

      if (error) {
        console.error("Full Error Object:", error)
        alert(`Lỗi tạo nhân sự: ${error.message || 'Lỗi không xác định (RLS/Database)'}`)
      } else {
        setFullName('')
        setRole('')
        setEmail('')
        setOpen(false)
        if (onAssigneeCreated) onAssigneeCreated()
        else window.location.reload() // Fallback if no callback
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
      <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none glass-premium p-0 overflow-hidden shadow-2xl">
        <div className="p-8 pb-0">
          <DialogHeader className="space-y-3 text-left">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 mx-0 shadow-sm ring-4 ring-primary/[0.03]">
              <UserPlus className="h-7 w-7 text-primary"></UserPlus>
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">Mời Nhân Sự</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-sm">
              Đăng ký thông tin định danh cho thành viên mới trong hệ thống.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="a-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Họ và Tên</Label>
            <Input 
              id="a-name" 
              placeholder="v.d. Nguyễn Văn A" 
              value={fullName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
              required
              className="rounded-2xl h-14 bg-white/60 border-white/60 focus-visible:ring-primary/10 font-bold text-slate-800 shadow-sm border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-role" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vai trò / Chức danh</Label>
            <div className="relative group">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors"></Shield>
              <Input 
                id="a-role" 
                placeholder="v.d. Quản lý mua hàng, Kiểm kho..." 
                value={role}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRole(e.target.value)}
                className="pl-11 rounded-2xl h-14 bg-white/60 border-white/60 focus-visible:ring-primary/10 font-bold text-slate-800 shadow-sm border"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Địa chỉ Email</Label>
            <Input 
              id="a-email" 
              type="email"
              placeholder="v.d. nhanvien@congty.com" 
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className="rounded-2xl h-14 bg-white/60 border-white/60 focus-visible:ring-primary/10 font-medium shadow-sm border text-slate-800"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading} className="w-full rounded-[2rem] h-16 font-black text-lg shadow-xl shadow-primary/20 bg-primary text-white hover:bg-primary/95 transition-all hover:scale-[1.02] active:scale-[0.98]">
              {loading ? 'Đang lưu...' : 'Lưu thông tin'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
