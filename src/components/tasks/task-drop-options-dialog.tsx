'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Layers, X, Plus, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Task } from '@/hooks/use-tasks'

interface TaskDropOptionsDialogProps {
  task: Task | null
  projectId: string
  categoryId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionComplete: () => void
  position?: { x: number, y: number }
  initialStep?: 'options' | 'create_group'
}

export function TaskDropOptionsDialog({
  task,
  projectId,
  categoryId,
  open,
  onOpenChange,
  onActionComplete,
  position,
  initialStep = 'options'
}: TaskDropOptionsDialogProps) {
  const [step, setStep] = useState<'options' | 'create_group'>(initialStep)
  const [newGroupName, setNewGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)

  // Sync step with initialStep when opening
  useEffect(() => {
    if (open) {
      setStep(initialStep)
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
      const timer = setTimeout(() => {
        setStep(initialStep)
        setNewGroupName('')
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open, initialStep])

  if (!open && !visible) return null
  if (!task) return null

  const close = () => {
    setVisible(false)
    setTimeout(() => onOpenChange(false), 200)
  }

  const handleMoveToUngrouped = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ task_group_id: null })
        .eq('id', task.id)
      
      if (error) throw error
      onActionComplete()
      close()
    } catch (err: any) {
      console.error("Error moving task to ungrouped:", err)
      alert(`Lỗi khi chuyển task: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!confirm('Bạn có chắc muốn xoá task này?')) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id)
      
      if (error) throw error
      onActionComplete()
      close()
    } catch (err: any) {
      console.error("Error deleting task:", err)
      alert(`Lỗi khi xoá task: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroupAndMove = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newGroupName.trim()) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not logged in")

      const { data: newGroup, error: groupError } = await supabase
        .from('task_groups')
        .insert({
          name: newGroupName.trim(),
          category_id: categoryId,
          project_id: projectId,
          start_date: new Date().toISOString(),
          deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
          created_by: user.id
        })
        .select()
        .single()

      if (groupError) throw groupError

      const { error: taskError } = await supabase
        .from('tasks')
        .update({ task_group_id: newGroup.id })
        .eq('id', task.id)

      if (taskError) throw taskError

      onActionComplete()
      close()
    } catch (err: any) {
      console.error("Error creating group and moving task:", err)
      alert(`Lỗi khi tạo nhóm mới: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] pointer-events-none transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div
        style={{
          position: 'fixed',
          left: position ? position.x : '50%',
          top: position ? position.y : '50%',
          transform: position ? (visible ? 'translate(-50%, calc(-100% - 24px))' : 'translate(-50%, -100%)') : 'translate(-50%, -50%)',
        }}
        className={cn(
          "pointer-events-auto w-[280px] bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/50 border border-white/80 overflow-hidden transition-all duration-300 ease-out",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
      >
          {step === 'options' ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-slate-900 truncate tracking-tight">{task.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">Lựa chọn hành động</p>
                </div>
                <button
                  onClick={close}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0 ml-2 shadow-sm bg-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Actions */}
              <div className="px-3 pb-4 pt-2 space-y-1">
                <button
                  onClick={() => setStep('create_group')}
                  disabled={loading}
                  className="w-full group flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all disabled:opacity-50 hover:bg-primary/5 active:scale-[0.98]"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-700 leading-none">Tạo nhóm mới</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Di chuyển task vào nhóm mới</p>
                  </div>
                </button>

                <button
                  onClick={handleMoveToUngrouped}
                  disabled={loading}
                  className="w-full group flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all disabled:opacity-50 hover:bg-slate-50 active:scale-[0.98]"
                >
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 transition-colors shadow-sm">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-700 leading-none">Chưa phân nhóm</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Đưa về khu vực mặc định</p>
                  </div>
                </button>

                <div className="h-[1px] bg-slate-100/60 mx-4 my-2" />

                <button
                  onClick={handleDeleteTask}
                  disabled={loading}
                  className="w-full group flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all disabled:opacity-50 hover:bg-rose-50 active:scale-[0.98]"
                >
                  <div className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors shadow-sm">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-rose-500 leading-none">Xoá vĩnh viễn</p>
                    <p className="text-[10px] text-rose-300 font-medium mt-1">Thao tác không thể hoàn tác</p>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                <button
                  onClick={() => setStep('options')}
                  disabled={loading}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shrink-0 bg-white shadow-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <p className="text-[13px] font-black text-slate-900 tracking-tight">Tạo nhóm mới</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 opacity-60">Nhập tên nhóm</p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateGroupAndMove} className="px-4 pb-5 pt-1 space-y-3">
                <Input
                  placeholder="v.d. Thiết kế, Backend..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  className="rounded-xl h-11 bg-slate-50 border-none focus-visible:ring-primary/20 font-bold text-slate-800 placeholder:text-slate-300 px-4 text-xs shadow-inner"
                />
                <Button
                  type="submit"
                  disabled={loading || !newGroupName.trim()}
                  className="w-full h-11 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                >
                  {loading ? 'Đang xử lý...' : 'Xác nhận ngay'}
                </Button>
              </form>
            </>
          )}
      </div>
    </div>
  )
}
