'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Plus, 
  Trash2, 
  Pencil, 
  GripVertical, 
  Check, 
  X,
  Settings2,
  ListTree
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type ProjectCategory = {
  id: string
  name: string
  color: string
  order_index: number
}

const COLORS = [
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Amber', value: 'bg-amber-500' },
  { name: 'Emerald', value: 'bg-emerald-500' },
  { name: 'Pink', value: 'bg-pink-500' },
  { name: 'Indigo', value: 'bg-indigo-500' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Slate', value: 'bg-slate-500' },
  { name: 'Rose', value: 'bg-rose-500' },
  { name: 'Cyan', value: 'bg-cyan-500' },
  { name: 'Violet', value: 'bg-violet-500' },
]

export default function CategoryManagement() {
  const [categories, setCategories] = useState<ProjectCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('bg-blue-500')
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  const fetchCategories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('project_categories')
      .select('*')
      .order('order_index', { ascending: true })
    
    if (data) setCategories(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleAdd = async () => {
    if (!newName) return
    setSaving(true)
    
    try {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order_index)) : 0
      
      const { error } = await supabase
        .from('project_categories')
        .insert({
          name: newName,
          color: newColor,
          order_index: maxOrder + 1
        })
      
      if (error) {
        console.error('Error adding category:', error)
        alert(`Lỗi: ${error.message}`)
      } else {
        setNewName('')
        setIsAdding(false)
        fetchCategories()
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Đã xảy ra lỗi không xác định.')
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
      
      if (error) {
        console.error('Error updating category:', error)
        alert(`Lỗi cập nhật: ${error.message}`)
      } else {
        setEditingId(null)
        fetchCategories()
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Lỗi cập nhật không xác định.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_categories')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Error deleting category:', error)
        alert(`Lỗi xóa: ${error.message}`)
      } else {
        setConfirmingDeleteId(null)
        fetchCategories()
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Lỗi xóa không xác định.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Settings2 className="h-10 w-10 text-primary" />
            Quản lý Giai đoạn
          </h1>
          <p className="text-slate-500 font-medium">Tùy chỉnh các giai đoạn (status) cho project của bạn.</p>
        </div>
        <Button 
          onClick={() => setIsAdding(true)}
          className="rounded-2xl px-6 h-12 font-black shadow-xl shadow-primary/30 transition-all active:scale-95 text-white bg-primary hover:bg-primary/90 gap-2"
        >
          <Plus className="h-5 w-5" />
          Thêm giai đoạn
        </Button>
      </div>

      <div className="grid gap-4">
        {isAdding && (
          <Card className="rounded-[2.5rem] border-none glass-premium shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Tên giai đoạn</Label>
                  <Input 
                    placeholder="VD: Sourcing, Review..." 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="rounded-2xl h-14 bg-white/50 border-none focus-visible:ring-primary/20 font-bold text-lg"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Màu sắc</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setNewColor(c.value)}
                        className={cn(
                          "h-10 w-10 rounded-xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center",
                          c.value,
                          newColor === c.value ? "ring-4 ring-primary/20 scale-110 rotate-3" : "opacity-80"
                        )}
                      >
                        {newColor === c.value && <Check className="h-5 w-5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setIsAdding(false)} className="rounded-xl px-6 h-12 font-bold">Hủy</Button>
                <Button 
                  onClick={handleAdd} 
                  disabled={saving || !newName}
                  className="rounded-xl px-8 h-12 font-black shadow-lg shadow-primary/20"
                >
                  {saving ? 'Đang lưu...' : 'Lưu giai đoạn'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="py-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-sm">Đang tải danh sách...</div>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <Card key={category.id} className="rounded-3xl border-none bg-white shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/50 transition-all group overflow-visible">
                <CardContent className="p-4 flex items-center gap-6">
                  <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 transition-colors">
                    <GripVertical className="h-6 w-6" />
                  </div>
                  
                  <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg", category.color)}>
                    <ListTree className="h-6 w-6" />
                  </div>

                  <div className="flex-1">
                    {editingId === category.id ? (
                      <Input 
                        autoFocus
                        value={category.name}
                        onChange={(e) => {
                          const newCategories = categories.map(c => c.id === category.id ? { ...c, name: e.target.value } : c)
                          setCategories(newCategories)
                        }}
                        onBlur={() => handleUpdate(category.id, { name: category.name })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(category.id, { name: category.name })
                          if (e.key === 'Escape') fetchCategories()
                        }}
                        className="h-10 text-xl font-black text-slate-800 border-none bg-slate-50 rounded-xl px-3"
                      />
                    ) : (
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">{category.name}</h3>
                    )}
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {confirmingDeleteId === category.id ? (
                      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Button 
                          size="sm" 
                          onClick={() => handleDelete(category.id)}
                          className="rounded-xl font-bold h-10 px-4 bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-200 hover:shadow-pink-300 transition-all active:scale-95 border-none"
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
                      <>
                        <div className="flex gap-1 mr-4">
                          {COLORS.slice(0, 5).map(c => (
                            <button 
                              key={c.value}
                              onClick={() => handleUpdate(category.id, { color: c.value })}
                              className={cn("h-5 w-5 rounded-full transition-transform hover:scale-125", c.value, category.color === c.value && "ring-2 ring-offset-2 ring-primary")}
                            />
                          ))}
                        </div>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setEditingId(category.id)}
                          className="h-10 w-10 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10"
                        >
                          <Pencil className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setConfirmingDeleteId(category.id)}
                          className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {categories.length === 0 && !isAdding && (
              <div className="py-20 text-center glass-premium rounded-[2.5rem] border-dashed border-2 border-slate-200">
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No phases found</p>
                <p className="text-slate-400 text-sm font-medium mt-1">Bắt đầu bằng cách thêm giai đoạn đầu tiên.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
