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
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, ShieldAlert, Layers, ListTodo } from 'lucide-react'

interface DeleteGroupDialogProps {
  group: { id: string, name: string }
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => void
  isUngrouped?: boolean
  taskIds?: string[]
}

export function DeleteGroupDialog({ group, open, onOpenChange, onRefresh, isUngrouped, taskIds }: DeleteGroupDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleDeleteUngroupedTasks = async () => {
    if (!taskIds || taskIds.length === 0) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', taskIds)
      
      if (error) throw error

      onOpenChange(false)
      onRefresh()
    } catch (err: any) {
      console.error("Error deleting ungrouped tasks:", err)
      alert(`Lỗi khi xoá tasks: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (deleteTasks: boolean) => {
    setLoading(true)
    try {
      if (!deleteTasks) {
        // Option 1: Only delete group, keep tasks (unassign them)
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ task_group_id: null })
          .eq('task_group_id', group.id)
        
        if (updateError) throw updateError
      } else {
        // Option 2: Delete both group and tasks
        const { error: tasksDeleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('task_group_id', group.id)
        
        if (tasksDeleteError) throw tasksDeleteError
      }

      // Finally delete the group
      const { error: groupDeleteError } = await supabase
        .from('task_groups')
        .delete()
        .eq('id', group.id)
      
      if (groupDeleteError) throw groupDeleteError

      onOpenChange(false)
      onRefresh()
    } catch (err: any) {
      console.error("Error deleting group:", err)
      alert(`Lỗi khi xoá nhóm: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // --- Ungrouped mode: only delete tasks, no group to delete ---
  if (isUngrouped) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none glass-premium p-0 flex flex-col overflow-hidden shadow-2xl">
          <div className="p-10 pb-6 text-center space-y-6">
            <div className="mx-auto h-20 w-20 rounded-[2rem] bg-rose-50 flex items-center justify-center text-rose-500 shadow-xl shadow-rose-200/20 ring-8 ring-rose-50/50">
              <Trash2 className="h-10 w-10 stroke-[1.5px]" />
            </div>
            
            <div className="space-y-2">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight text-center leading-tight">
                  Xoá tất cả task chưa phân nhóm?
                </DialogTitle>
                <DialogDescription className="text-center font-bold text-slate-400 text-sm uppercase tracking-widest pt-2">
                  SỐ LƯỢNG: <span className="text-slate-900">{taskIds?.length || 0} task(s)</span>
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 flex items-start gap-4 text-left">
              <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[13px] font-medium text-slate-600 leading-relaxed italic">
                Thao tác này sẽ xoá vĩnh viễn tất cả {taskIds?.length || 0} task không thuộc nhóm nào. Không thể hoàn tác.
              </p>
            </div>
          </div>

          <div className="px-10 pb-10 space-y-3">
            <Button
              onClick={handleDeleteUngroupedTasks}
              disabled={loading || !taskIds?.length}
              className="w-full h-16 rounded-[1.8rem] bg-rose-500 text-white hover:bg-rose-600 active:scale-95 transition-all shadow-xl shadow-rose-500/20 font-black text-sm uppercase tracking-[0.1em] gap-3"
            >
              <Trash2 className="h-5 w-5" />
              {loading ? 'Đang xoá...' : `Xoá ${taskIds?.length || 0} task`}
            </Button>
            
            <Button
              onClick={() => onOpenChange(false)}
              disabled={loading}
              variant="link"
              className="w-full h-10 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-800 transition-colors"
            >
              Huỷ bỏ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // --- Normal group mode ---
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none glass-premium p-0 flex flex-col overflow-hidden shadow-2xl">
        <div className="p-10 pb-6 text-center space-y-6">
          <div className="mx-auto h-20 w-20 rounded-[2rem] bg-rose-50 flex items-center justify-center text-rose-500 shadow-xl shadow-rose-200/20 ring-8 ring-rose-50/50">
            <Trash2 className="h-10 w-10 stroke-[1.5px]" />
          </div>
          
          <div className="space-y-2">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight text-center leading-tight">
                Xoá nhóm tasks?
              </DialogTitle>
              <DialogDescription className="text-center font-bold text-slate-400 text-sm uppercase tracking-widest pt-2">
                NHÓM: <span className="text-slate-900">{group.name}</span>
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 flex items-start gap-4 text-left">
            <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[13px] font-medium text-slate-600 leading-relaxed italic">
              Việc xoá nhóm này có thể ảnh hưởng đến các task bên trong. Vui lòng chọn cách thức xử lý các task liên quan.
            </p>
          </div>
        </div>

        <div className="px-10 pb-10 space-y-3">
          <Button
            onClick={() => handleDelete(true)}
            disabled={loading}
            className="w-full h-16 rounded-[1.8rem] bg-rose-500 text-white hover:bg-rose-600 active:scale-95 transition-all shadow-xl shadow-rose-500/20 font-black text-sm uppercase tracking-[0.1em] gap-3"
          >
            <ShieldAlert className="h-5 w-5" />
            Xoá sạch cả Task & Group
          </Button>

          <Button
            onClick={() => handleDelete(false)}
            disabled={loading}
            variant="ghost"
            className="w-full h-16 rounded-[1.8rem] bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all font-black text-[13px] uppercase tracking-widest gap-3"
          >
            <ListTodo className="h-5 w-5 opacity-60" />
            Chỉ xoá Group (Giữ Task)
          </Button>
          
          <Button
            onClick={() => onOpenChange(false)}
            disabled={loading}
            variant="link"
            className="w-full h-10 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-800 transition-colors"
          >
            Huỷ bỏ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
