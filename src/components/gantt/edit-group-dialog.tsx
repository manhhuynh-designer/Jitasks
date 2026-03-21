'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Layers, Save, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from '@/lib/utils'

interface EditGroupDialogProps {
  groupId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onGroupUpdated: () => void
}

export function EditGroupDialog({ groupId, open, onOpenChange, onGroupUpdated }: EditGroupDialogProps) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (open && groupId) {
      const fetchGroup = async () => {
        setFetching(true)
        const { data, error } = await supabase
          .from('task_groups')
          .select('*')
          .eq('id', groupId)
          .single()
        
        if (data) {
          setName(data.name)
          setStartDate(data.start_date ? new Date(data.start_date) : null)
          setDeadline(data.deadline ? new Date(data.deadline) : null)
        }
        setFetching(false)
      }
      fetchGroup()
    }
  }, [open, groupId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupId || !name) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('task_groups')
        .update({
          name,
          start_date: startDate ? startDate.toISOString() : null,
          deadline: deadline ? deadline.toISOString() : null,
        })
        .eq('id', groupId)

      if (error) throw error

      onOpenChange(false)
      onGroupUpdated()
    } catch (err) {
      console.error("Error updating group:", err)
      alert("Lỗi khi cập nhật nhóm")
    } finally {
      setLoading(false)
    }
  }

  if (!groupId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] rounded-[3.5rem] border-none glass-premium p-10 shadow-2xl overflow-hidden">
        <DialogHeader className="space-y-4">
          <div className="h-16 w-16 rounded-[1.8rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
             <Layers className="h-8 w-8" />
          </div>
          <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight leading-none">Chỉnh sửa Nhóm</DialogTitle>
          <DialogDescription className="text-slate-500 font-medium text-sm">
            Cập nhật tên nhóm hoặc điều chỉnh timeline thủ công.
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
             <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8 pt-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="eg-name" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Tên Nhóm</Label>
                <Input
                  id="eg-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-[1.5rem] h-14 bg-slate-50/50 border-none focus-visible:ring-primary/20 font-black text-slate-800 px-6 shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Ngày Bắt Đầu</Label>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-14 justify-start text-left font-black rounded-[1.5rem] bg-slate-50/50 border-none hover:bg-slate-100 transition-all px-6 text-slate-800 shadow-inner",
                            !startDate && "text-slate-400"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-4 w-4 text-slate-400" />
                          {startDate ? format(startDate, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                        </Button>
                      }
                    />
                    <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate || undefined}
                        onSelect={(date) => setStartDate(date || null)}
                        initialFocus
                        className="rounded-2xl"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Hạn Chót</Label>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-14 justify-start text-left font-black rounded-[1.5rem] bg-slate-50/50 border-none hover:bg-slate-100 transition-all px-6 text-slate-800 shadow-inner",
                            !deadline && "text-slate-400"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-4 w-4 text-slate-400" />
                          {deadline ? format(deadline, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                        </Button>
                      }
                    />
                    <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                      <Calendar
                        mode="single"
                        selected={deadline || undefined}
                        onSelect={(date) => setDeadline(date || null)}
                        initialFocus
                        className="rounded-2xl"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                disabled={loading || !name} 
                className="w-full rounded-[2rem] h-16 font-black text-lg bg-primary text-white hover:bg-primary/95 transition-all hover:scale-[1.02] active:scale-95 gap-2"
              >
                <Save className="h-5 w-5" />
                {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
