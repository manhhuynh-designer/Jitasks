'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Check, 
  X,
  Settings2,
  Layers
} from 'lucide-react'
import { cn, getCategoryColorStyles } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export type ProjectCategory = {
  id: string
  name: string
  color: string
  order_index: number
}

const COLORS = [
  { name: 'Blue', value: 'bg-blue-500', hex: '#3b82f6' },
  { name: 'Amber', value: 'bg-amber-500', hex: '#f59e0b' },
  { name: 'Emerald', value: 'bg-emerald-500', hex: '#10b981' },
  { name: 'Pink', value: 'bg-pink-500', hex: '#ec4899' },
  { name: 'Indigo', value: 'bg-indigo-500', hex: '#6366f1' },
  { name: 'Orange', value: 'bg-orange-500', hex: '#f97316' },
  { name: 'Slate', value: 'bg-slate-500', hex: '#64748b' },
  { name: 'Rose', value: 'bg-rose-500', hex: '#f43f5e' },
  { name: 'Cyan', value: 'bg-cyan-500', hex: '#06b6d4' },
  { name: 'Violet', value: 'bg-violet-500', hex: '#8b5cf6' },
]



function SortableItem({ 
  category, 
  editingId, 
  setEditingId, 
  handleUpdate, 
  confirmingDeleteId, 
  setConfirmingDeleteId, 
  handleDelete,
  updateCategoryLocal
}: { 
  category: ProjectCategory,
  editingId: string | null,
  setEditingId: (id: string | null) => void,
  handleUpdate: (id: string, updates: Partial<ProjectCategory>) => void,
  confirmingDeleteId: string | null,
  setConfirmingDeleteId: (id: string | null) => void,
  handleDelete: (id: string) => void,
  updateCategoryLocal: (id: string, name: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.id })

  const [stagedColor, setStagedColor] = useState(category.color)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  useEffect(() => {
    setStagedColor(category.color)
  }, [category.color])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      <Card className="rounded-3xl border-none bg-white shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/50 transition-all group overflow-visible">
        <CardContent className="p-4 flex items-center gap-6">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 transition-colors p-2">
            <GripVertical className="h-6 w-6" />
          </div>
          
          <div 
            className={cn("h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110", getCategoryColorStyles(category.color).className)}
            style={getCategoryColorStyles(category.color).style}
          >
            <Layers className="h-6 w-6" />
          </div>

          <div className="flex-1">
            {editingId === category.id ? (
              <Input 
                autoFocus
                value={category.name}
                onChange={(e) => updateCategoryLocal(category.id, e.target.value)}
                onBlur={() => handleUpdate(category.id, { name: category.name })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdate(category.id, { name: category.name })
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="h-10 text-xl font-black text-slate-800 border-none bg-slate-50 rounded-xl px-3"
              />
            ) : (
              <h3 
                className="text-xl font-black text-slate-800 tracking-tight cursor-text"
                onClick={() => setEditingId(category.id)}
              >
                {category.name}
              </h3>
            )}
          </div>

          <div className={cn(
            "flex items-center gap-2 transition-opacity",
            (isPopoverOpen || stagedColor !== category.color) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            {confirmingDeleteId === category.id ? (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <Button 
                  size="sm" 
                  onClick={() => handleDelete(category.id)}
                  className="rounded-xl font-bold h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200 hover:shadow-rose-300 transition-all active:scale-95 border-none"
                >
                  Xác nhận xóa
                </Button>
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => setConfirmingDeleteId(null)}
                  className="h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger
                      className={cn(
                        "h-10 w-10 rounded-xl cursor-pointer transition-all hover:scale-110 flex items-center justify-center border-none shadow-md ring-2 ring-white", 
                        getCategoryColorStyles(stagedColor).className
                      )}
                      style={getCategoryColorStyles(stagedColor).style}
                    >
                      <Plus className="h-4 w-4 text-white opacity-0 hover:opacity-100 transition-opacity" />
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-4 rounded-3xl bg-white shadow-2xl border-none">
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chọn màu sắc</Label>
                        <div className="grid grid-cols-5 gap-2">
                          {COLORS.map((c) => (
                            <button
                              key={c.value}
                              onClick={() => {
                                setStagedColor(c.hex)
                              }}
                              className={cn(
                                "h-8 w-8 rounded-lg transition-all hover:scale-110 flex items-center justify-center border-none shadow-sm",
                                c.value,
                                stagedColor === c.hex || stagedColor === c.value ? "ring-2 ring-primary/20 scale-110" : "opacity-80"
                              )}
                            >
                              {(stagedColor === c.hex || stagedColor === c.value) && <Check className="h-4 w-4 text-white" />}
                            </button>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg overflow-hidden relative shadow-sm">
                              <input 
                                type="color"
                                className="absolute inset-0 w-12 h-12 -translate-x-1 -translate-y-1 cursor-pointer"
                                value={stagedColor.startsWith('#') ? stagedColor : '#3b82f6'}
                                onChange={(e) => setStagedColor(e.target.value)}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Màu tùy chỉnh</span>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {stagedColor !== category.color && (
                    <div className="flex gap-1 animate-in slide-in-from-right-2 duration-300">
                      <Button 
                        size="icon" 
                        onClick={() => handleUpdate(category.id, { color: stagedColor })}
                        className="h-8 w-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-100"
                        title="Xác nhận đổi màu"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => setStagedColor(category.color)}
                        className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                        title="Hủy"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setConfirmingDeleteId(category.id)}
                  className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<ProjectCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('bg-blue-500')
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchCategories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('project_categories')
      .select('*')
      .order('order_index', { ascending: true })
    
    if (data) {
      setCategories(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id)
      const newIndex = categories.findIndex((c) => c.id === over.id)
      
      const newCategories = arrayMove(categories, oldIndex, newIndex)
      setCategories(newCategories)

      // Update order_index in DB
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('Unauthorized user for reordering')
        return
      }
      
      const upsertData = newCategories.map((cat, index) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        order_index: index,
        created_by: user.id,
      }))

      const { error } = await supabase
        .from('project_categories')
        .upsert(upsertData, { onConflict: 'id' })

      if (error) {
        console.error('Error updating order:', error.message, error.code, error.details)
        fetchCategories() // Revert on error
      }
    }
  }

  const handleAdd = async () => {
    if (!newName) return
    setSaving(true)
    
    try {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order_index)) : -1
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Unauthorized")

      const { error } = await supabase
        .from('project_categories')
        .insert({
          name: newName,
          color: newColor,
          order_index: maxOrder + 1,
          created_by: user.id
        })
      
      if (error) throw error
      
      setNewName('')
      setIsAdding(false)
      fetchCategories()
    } catch (err: any) {
      console.error('Error adding category:', err)
      alert(`Lỗi: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string, updates: Partial<ProjectCategory>) => {
    try {
      const { error } = await supabase
        .from('project_categories')
        .update(updates)
        .eq('id', id)
      
      if (error) throw error
      setEditingId(null)
      fetchCategories()
    } catch (err: any) {
      console.error('Error updating category:', err)
      alert(`Lỗi: ${err.message}`)
      fetchCategories()
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_categories')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      setConfirmingDeleteId(null)
      fetchCategories()
    } catch (err: any) {
      console.error('Error deleting category:', err)
      alert(`Lỗi: ${err.message}`)
    }
  }

  const updateCategoryLocal = (id: string, name: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Settings2 className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Quản lý Giai đoạn
            </h1>
          </div>
          <p className="text-slate-500 font-medium ml-16">Chỉ cấu hình các giai đoạn (Stages) chính của dự án.</p>
        </div>
        <Button 
          onClick={() => setIsAdding(true)}
          className="rounded-[1.5rem] px-8 h-14 font-black shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 text-white bg-primary hover:bg-primary/90 gap-3 ml-16 sm:ml-0"
        >
          <Plus className="h-6 w-6 stroke-[3px]" />
          Thêm giai đoạn
        </Button>
      </div>

      <div className="grid gap-6">
        {isAdding && (
          <Card className="rounded-[2.5rem] border-none glass-premium shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Tên giai đoạn</Label>
                  <Input 
                    placeholder="VD: Sourcing, Review..." 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="rounded-2xl h-14 bg-white/50 border-white/60 focus-visible:ring-primary/20 font-bold text-lg shadow-sm"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Màu sắc</Label>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="relative">
                      <input 
                        type="color"
                        id="new-color-picker"
                        className="sr-only"
                        value={newColor.startsWith('#') ? newColor : '#3b82f6'}
                        onChange={(e) => setNewColor(e.target.value)}
                      />
                      <label 
                        htmlFor="new-color-picker"
                        className={cn(
                          "h-14 w-14 rounded-2xl cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center border-none shadow-lg ring-4 ring-white",
                          getCategoryColorStyles(newColor).className
                        )}
                        style={getCategoryColorStyles(newColor).style}
                      >
                        <Plus className="h-6 w-6 text-white" />
                      </label>
                    </div>

                    <div className="h-10 w-px bg-slate-100 mx-1" />

                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setNewColor(c.hex)}
                          className={cn(
                            "h-10 w-10 rounded-xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center border-none shadow-sm",
                            c.value,
                            newColor === c.hex || newColor === c.value ? "ring-4 ring-primary/20 scale-110 rotate-3 shadow-lg" : "opacity-80"
                          )}
                        >
                          {(newColor === c.hex || newColor === c.value) && <Check className="h-5 w-5 text-white stroke-[3px]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <Button variant="ghost" onClick={() => setIsAdding(false)} className="rounded-xl px-8 h-12 font-black text-slate-500 hover:bg-slate-100">Hủy</Button>
                <Button 
                  onClick={handleAdd} 
                  disabled={saving || !newName}
                  className="rounded-xl px-10 h-12 font-black shadow-lg shadow-primary/20"
                >
                  {saving ? 'Đang lưu...' : 'Lưu giai đoạn'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Đang tải danh sách...</p>
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={categories.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {categories.map((category) => (
                  <SortableItem 
                    key={category.id} 
                    category={category}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    handleUpdate={handleUpdate}
                    confirmingDeleteId={confirmingDeleteId}
                    setConfirmingDeleteId={setConfirmingDeleteId}
                    handleDelete={handleDelete}
                    updateCategoryLocal={updateCategoryLocal}
                  />
                ))}

                {categories.length === 0 && !isAdding && (
                  <div className="py-24 text-center glass-premium rounded-[3rem] border-dashed border-2 border-slate-200 flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-[2rem] bg-slate-50 flex items-center justify-center">
                      <Layers className="h-8 w-8 text-slate-200" />
                    </div>
                    <div>
                      <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Chưa có giai đoạn nào</p>
                      <p className="text-slate-400 text-sm font-medium mt-1">Bắt đầu bằng cách thêm giai đoạn đầu tiên cho dự án.</p>
                    </div>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
