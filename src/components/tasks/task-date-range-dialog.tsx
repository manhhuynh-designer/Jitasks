'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Clock, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Task } from '@/hooks/use-tasks'

interface TaskDateRangeDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskUpdated: () => void
}

export function TaskDateRangeDialog({ 
  task, 
  open, 
  onOpenChange, 
  onTaskUpdated 
}: TaskDateRangeDialogProps) {
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [deadline, setDeadline] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && task) {
      setStartDate(task.start_date ? new Date(task.start_date) : new Date())
      setDeadline(new Date(task.deadline))
    }
  }, [open, task])

  const handleSubmit = async () => {
    if (!task) return
    setLoading(true)

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          start_date: startDate.toISOString(),
          deadline: deadline.toISOString(),
        })
        .eq('id', task.id)

      if (error) {
        console.error("Supabase Error:", error)
        alert(`Lỗi cập nhật ngày: ${error.message}`)
        return
      }

      onTaskUpdated()
      onOpenChange(false)
    } catch (err) {
      console.error("Unexpected error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-[2rem] border-none glass-premium p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 bg-white/80 border-b border-slate-100/50 backdrop-blur-xl shrink-0">
          <DialogTitle className="text-xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Thay đổi thời gian
          </DialogTitle>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{task.name}</p>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ngày bắt đầu</label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full h-12 justify-start text-left font-bold rounded-xl bg-white/50 border-slate-100 hover:bg-white hover:border-primary/20 transition-all",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary/60" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                    className="rounded-2xl"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Hạn chót</label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full h-12 justify-start text-left font-bold rounded-xl bg-white/50 border-slate-100 hover:bg-white hover:border-primary/20 transition-all",
                        !deadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-rose-400/60" />
                      {deadline ? format(deadline, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={(date) => date && setDeadline(date)}
                    initialFocus
                    className="rounded-2xl"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 flex gap-2 sm:justify-end">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-12 font-bold text-slate-500 hover:bg-slate-100"
          >
            Hủy
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl h-12 px-6 font-black uppercase tracking-widest bg-primary text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            {loading ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
