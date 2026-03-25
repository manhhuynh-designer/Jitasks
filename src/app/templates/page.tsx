'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, ClipboardCheck, AlertCircle, Pencil, GripVertical, Check, X, Layers, ListChecks } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, getCategoryColorStyles } from '@/lib/utils'
import { NewTemplateDialog } from '@/components/templates/new-template-dialog'
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

type TaskTemplate = {
  id: string
  task_name: string
  project_status: string
  category_id: string
  task_group_id: string | null
  default_priority: string
}

type TaskGroup = {
  id: string
  name: string
  category_id: string
  order_index: number
}

type Category = {
  id: string
  name: string
  color: string
  order_index: number
  task_groups: TaskGroup[]
}

function SortableGroup({ 
  group, 
  templates, 
  onDeleteGroup, 
  onUpdateGroup, 
  onDeleteTemplate, 
  onRefresh,
  categoryId,
  categoryName
}: { 
  group: TaskGroup, 
  templates: TaskTemplate[], 
  onDeleteGroup: (id: string) => void,
  onUpdateGroup: (id: string, name: string) => void,
  onDeleteTemplate: (id: string) => void,
  onRefresh: () => void,
  categoryId: string,
  categoryName: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: group.id })

  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(group.name)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  const groupTemplates = templates.filter(t => t.task_group_id === group.id)

  return (
    <div ref={setNodeRef} style={style} className={cn("space-y-4", isDragging && "opacity-50")}>
      <div className="bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100 group/group shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 p-1">
              <GripVertical className="h-4 w-4" />
            </div>
            {isEditing ? (
              <Input 
                autoFocus
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={() => {
                  onUpdateGroup(group.id, editedName)
                  setIsEditing(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdateGroup(group.id, editedName)
                    setIsEditing(false)
                  }
                  if (e.key === 'Escape') {
                    setEditedName(group.name)
                    setIsEditing(false)
                  }
                }}
                className="h-8 py-0 font-black text-slate-800 bg-white border-slate-200 rounded-lg px-2 text-sm"
              />
            ) : (
              <h4 
                className="text-sm font-black text-slate-700 uppercase tracking-wider cursor-text px-2"
                onClick={() => setIsEditing(true)}
              >
                {group.name}
              </h4>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NewTemplateDialog 
              onTemplateCreated={onRefresh} 
              defaultStatus={categoryName}
              defaultCategoryId={categoryId}
              defaultGroupId={group.id}
              trigger={
                <Button variant="ghost" size="sm" className="h-8 px-3 rounded-xl text-primary font-bold text-[10px] uppercase tracking-widest gap-2 hover:bg-primary/10">
                  <Plus className="h-3.5 w-3.5" /> Thêm Task
                </Button>
              }
            />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onDeleteGroup(group.id)}
              className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover/group:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groupTemplates.map(t => (
            <Card key={t.id} className="border-none bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all group/item rounded-2xl overflow-hidden border border-white/50">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-slate-800 truncate">{t.task_name}</h5>
                  <Badge variant="secondary" className="text-[7px] font-black uppercase tracking-tight mt-1 bg-slate-100 text-slate-500 py-0 px-1.5 h-4">
                    {t.default_priority}
                  </Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onDeleteTemplate(t.id)}
                  className="h-7 w-7 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {groupTemplates.length === 0 && (
            <div className="col-span-full py-4 text-center border border-dashed border-slate-200 rounded-2xl">
              <p className="text-[10px] text-slate-400 font-medium italic">Chưa có task nào trong nhóm này</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TemplatesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [newGroupNames, setNewGroupNames] = useState<Record<string, string>>({})
  const [isAddingGroupTo, setIsAddingGroupTo] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Templates | Jitasks'
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchData = async () => {
    setLoading(true)
    try {
      const [catRes, groupRes, templateRes] = await Promise.all([
        supabase.from('project_categories').select('*').order('order_index'),
        supabase.from('task_groups').select('*').order('order_index'),
        supabase.from('task_templates').select('*')
      ])

      if (catRes.data && groupRes.data) {
        const catsWithGroups = catRes.data.map(cat => ({
          ...cat,
          task_groups: groupRes.data.filter((g: any) => g.category_id === cat.id)
        }))
        setCategories(catsWithGroups)
      }
      if (templateRes.data) setTemplates(templateRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleDragEnd = async (event: DragEndEvent, categoryId: string) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const category = categories.find(c => c.id === categoryId)
    if (!category) return

    const oldIndex = category.task_groups.findIndex(g => g.id === active.id)
    const newIndex = category.task_groups.findIndex(g => g.id === over.id)

    const updatedGroups = arrayMove(category.task_groups, oldIndex, newIndex)
    
    // Update local state
    setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, task_groups: updatedGroups } : c))

    // Persist to DB
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('Unauthorized user for reordering')
      return
    }
    
    const upsertData = updatedGroups.map((g, index) => ({
      id: g.id,
      name: g.name,
      order_index: index,
      category_id: categoryId,
      created_by: user.id
    }))

    const { error } = await supabase
      .from('task_groups')
      .upsert(upsertData, { onConflict: 'id' })

    if (error) {
      console.error('Error reordering groups:', error.message, error.code, error.details)
      fetchData()
    }
  }

  const handleAddGroup = async (categoryId: string) => {
    const name = newGroupNames[categoryId]
    if (!name) return

    const category = categories.find(c => c.id === categoryId)
    const maxOrder = category?.task_groups?.length ? Math.max(...category.task_groups.map(g => g.order_index)) : -1

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('task_groups').insert({
      name,
      category_id: categoryId,
      order_index: maxOrder + 1,
      created_by: user.id
    })

    if (!error) {
      setNewGroupNames(prev => ({ ...prev, [categoryId]: '' }))
      setIsAddingGroupTo(null)
      fetchData()
    }
  }

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Xóa nhóm này sẽ không xóa các template bên trong (chúng sẽ trở thành không có nhóm). Tiếp tục?')) return
    const { error } = await supabase.from('task_groups').delete().eq('id', id)
    if (!error) fetchData()
  }

  const handleUpdateGroup = async (id: string, name: string) => {
    const { error } = await supabase.from('task_groups').update({ name }).eq('id', id)
    if (!error) fetchData()
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Xóa template này?')) return
    const { error } = await supabase.from('task_templates').delete().eq('id', id)
    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== id))
    }
  }

  if (loading && categories.length === 0) return (
    <div className="p-8 space-y-12 animate-in fade-in duration-500">
      <div className="h-20 w-1/3 bg-slate-100 rounded-[2.5rem] animate-pulse" />
      <div className="space-y-8">
        {[1, 2].map(i => (
          <div key={i} className="h-64 bg-slate-50 rounded-[3rem] animate-pulse" />
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-16 max-w-[1400px] mx-auto pb-32">
      {/* Header Section */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-[2rem] bg-white text-primary flex items-center justify-center shadow-2xl shadow-primary/10 ring-8 ring-primary/[0.03]">
            <ListChecks className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Project DNA (Templates)</h1>
            <p className="text-slate-500 text-sm font-medium">Thiết lập cấu trúc nhóm và task template cho từng giai đoạn.</p>
          </div>
        </div>
        
        <NewTemplateDialog onTemplateCreated={fetchData} trigger={
          <Button className="rounded-[1.5rem] h-14 px-8 font-black uppercase tracking-widest text-xs bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all gap-2">
            <Plus className="h-5 w-5 stroke-[3px]" /> Thêm Template mới
          </Button>
        } />
      </section>

      {/* Categories Sections */}
      <div className="space-y-20">
        {categories.map((category) => (
          <section key={category.id} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Stage Header */}
            <div className="flex items-center justify-between group/header">
              <div className="flex items-center gap-4">
                {(() => {
                  const colorStyles = getCategoryColorStyles(category.color)
                  return (
                    <div 
                      className={cn("h-10 px-4 rounded-xl flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest shadow-lg", colorStyles.className || 'bg-slate-800')}
                      style={colorStyles.style}
                    >
                      Giai đoạn: {category.name}
                    </div>
                  )
                })()}
                <div className="h-[2px] w-20 bg-slate-100 rounded-full" />
              </div>
              <Button 
                onClick={() => setIsAddingGroupTo(category.id)}
                variant="outline"
                className="rounded-xl border-dashed border-2 border-slate-200 text-slate-400 hover:border-primary/50 hover:text-primary transition-all font-black text-[10px] uppercase tracking-widest gap-2 bg-transparent"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm nhóm task
              </Button>
            </div>

            <div className="space-y-6">
              {/* Groups with DnD */}
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, category.id)}
              >
                <SortableContext 
                  items={category.task_groups.map(g => g.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-6">
                    {category.task_groups.map((group) => (
                      <SortableGroup 
                        key={group.id}
                        group={group}
                        templates={templates}
                        onDeleteGroup={handleDeleteGroup}
                        onUpdateGroup={handleUpdateGroup}
                        onDeleteTemplate={deleteTemplate}
                        onRefresh={fetchData}
                        categoryId={category.id}
                        categoryName={category.name}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Add Group Inline */}
              {isAddingGroupTo === category.id && (
                <div className="bg-white rounded-[2rem] p-6 border-2 border-dashed border-primary/20 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <Input 
                      autoFocus
                      placeholder="Tên nhóm task mới (vd: Chuẩn bị hồ sơ, Kiểm tra...)" 
                      value={newGroupNames[category.id] || ''}
                      onChange={(e) => setNewGroupNames(prev => ({ ...prev, [category.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddGroup(category.id)}
                      className="h-12 border-none bg-slate-50 rounded-xl font-bold text-slate-800 focus-visible:ring-primary/10"
                    />
                    <div className="flex gap-2">
                       <Button onClick={() => handleAddGroup(category.id)} className="rounded-xl h-12 px-6 font-black shadow-lg shadow-primary/20">Lưu nhóm</Button>
                       <Button variant="ghost" onClick={() => setIsAddingGroupTo(null)} className="rounded-xl h-12 px-4 font-bold text-slate-400">Hủy</Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ungrouped Templates for this category */}
              {templates.filter(t => t.category_id === category.id && !t.task_group_id).length > 0 && (
                <div className="pl-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Tasks chưa phân nhóm</Label>
                    <div className="h-[1px] flex-1 bg-slate-50" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {templates.filter(t => t.category_id === category.id && !t.task_group_id).map(t => (
                      <Card key={t.id} className="border-none bg-white shadow-sm hover:shadow-md transition-all group/ungrouped rounded-2xl overflow-hidden border border-slate-100">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-slate-700 truncate">{t.task_name}</h5>
                            <Badge variant="secondary" className="text-[7px] font-black uppercase tracking-tight mt-1 bg-slate-50 text-slate-400 py-0 px-1.5 h-4">
                              {t.default_priority}
                            </Badge>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteTemplate(t.id)}
                            className="h-7 w-7 rounded-lg text-slate-200 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover/ungrouped:opacity-100 transition-opacity shrink-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {category.task_groups.length === 0 && templates.filter(t => t.category_id === category.id).length === 0 && !isAddingGroupTo && (
                <div className="py-12 text-center bg-slate-50/30 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-3">
                  <div className="h-12 w-12 rounded-[1.2rem] bg-white flex items-center justify-center shadow-sm">
                    <AlertCircle className="h-6 w-6 text-slate-200" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Giai đoạn này chưa có thiết lập</p>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
