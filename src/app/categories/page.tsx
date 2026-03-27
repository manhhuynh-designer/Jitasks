'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Plus, 
  Trash2, 
  Pencil, 
  GripVertical, 
  ListChecks,
  PlusCircle,
  MoreVertical,
  Settings2,
  Layers,
  LayoutGrid,
  Zap
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn, getCategoryColorStyles } from '@/lib/utils'
import { NewTemplateDialog } from '@/components/templates/new-template-dialog'
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// --- Types ---

type TaskTemplate = {
  id: string
  task_name: string
  project_status: string
  category_id: string
  task_group_id: string | null
  default_priority: string
  order_index: number
}

type TaskGroup = {
  id: string
  name: string
  category_id: string
  order_index: number
  auto_create?: boolean
}

type Category = {
  id: string
  name: string
  color: string
  order_index: number
}

// --- Components ---

function DraggableTemplate({ 
    template, 
    onDelete,
    onUpdated
}: { 
    template: TaskTemplate, 
    onDelete: (id: string) => void,
    onUpdated: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: template.id,
    data: {
        type: 'Template',
        template,
        containerId: template.task_group_id || 'ungrouped'
    }
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/item relative bg-white border border-slate-100 rounded-2xl p-3 transition-all active:scale-95 cursor-default",
        isDragging && "opacity-30 border-primary/20 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-primary transition-colors">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h5 className="text-[13px] font-bold text-slate-700 truncate tracking-tight">{template.task_name}</h5>
          <div className="flex items-center gap-2 mt-1">
             <Badge variant="secondary" className={cn(
                "text-[8px] font-black uppercase tracking-wide px-1.5 h-4 py-0",
                template.default_priority === 'High' ? "bg-rose-50 text-rose-500" :
                template.default_priority === 'Medium' ? "bg-amber-50 text-amber-500" :
                "bg-emerald-50 text-emerald-500"
             )}>
                {template.default_priority}
             </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <NewTemplateDialog 
            template={template}
            onTemplateUpdated={onUpdated}
            trigger={
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg text-slate-300 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onDelete(template.id)}
            className="h-7 w-7 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function GroupCard({ 
    group, 
    templates, 
    onDeleteGroup, 
    onUpdateGroup, 
    onDeleteTemplate,
    onRefresh,
    activeStage,
    isUngrouped = false,
    onToggleAutoCreate
}: { 
    group: TaskGroup | { id: string, name: string, auto_create?: boolean }, 
    templates: TaskTemplate[], 
    onDeleteGroup?: (id: string) => void,
    onUpdateGroup?: (id: string, name: string) => void,
    onDeleteTemplate: (id: string) => void,
    onRefresh: () => void,
    activeStage: Category,
    isUngrouped?: boolean,
    onToggleAutoCreate?: (id: string, value: boolean) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ 
    id: group.id,
    data: {
        type: 'Group',
        group
    }
  })

  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(group.name)

  return (
    <Card 
        ref={setNodeRef}
        className={cn(
            "rounded-[2.5rem] border-none flex flex-col min-h-[400px] transition-all duration-500",
            isUngrouped ? "bg-slate-100/50 ring-1 ring-slate-200/50" : "bg-white",
            isOver && "ring-2 ring-primary ring-offset-4 ring-offset-slate-50 bg-primary/[0.02]"
        )}
    >
      <CardContent className="p-6 flex flex-col h-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center",
                isUngrouped ? "bg-slate-400 text-white" : "bg-primary/10 text-primary"
            )}>
              {isUngrouped ? <LayoutGrid className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
            </div>
            
            {isEditing && !isUngrouped ? (
              <Input 
                autoFocus
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={() => {
                  onUpdateGroup?.(group.id, editedName)
                  setIsEditing(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdateGroup?.(group.id, editedName)
                    setIsEditing(false)
                  }
                  if (e.key === 'Escape') {
                    setEditedName(group.name)
                    setIsEditing(false)
                  }
                }}
                className="h-8 py-0 font-black text-slate-800 bg-slate-50 border-none rounded-lg px-2 text-sm"
              />
            ) : (
              <h4 
                className="text-sm font-black text-slate-800 uppercase tracking-wider truncate"
                onClick={() => !isUngrouped && setIsEditing(true)}
              >
                {group.name}
              </h4>
            )}
          </div>

          {!isUngrouped && (() => {
            const isAutoCreate = (group as any).auto_create !== false
            return (
            <div className="flex items-center gap-1">
              {/* Auto-create toggle */}
              <button
                title={isAutoCreate ? 'Tự động tạo khi tạo Project' : 'Không tự tạo khi tạo Project'}
                onClick={() => onToggleAutoCreate?.(group.id, !isAutoCreate)}
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                  isAutoCreate
                    ? "bg-amber-50 text-amber-500 hover:bg-amber-100"
                    : "bg-slate-100 text-slate-300 hover:text-amber-500 hover:bg-amber-50"
                )}
              >
                <Zap className="h-3.5 w-3.5" />
              </button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 rounded-lg text-slate-300 hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onDeleteGroup?.(group.id)}
                className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            )
          })()}
        </div>

        {/* Templates List */}
        <div className="flex-1 space-y-3 min-h-[50px]">
            <SortableContext 
                id={group.id}
                items={templates.map(t => t.id)}
                strategy={verticalListSortingStrategy}
            >
                {templates.map(t => (
                    <DraggableTemplate 
                        key={t.id} 
                        template={t} 
                        onDelete={onDeleteTemplate} 
                        onUpdated={onRefresh}
                    />
                ))}
            </SortableContext>
            
            {templates.length === 0 && (
                <div className="h-24 rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center">
                    <p className="text-[11px] text-slate-300 font-bold italic uppercase tracking-widest">Kéo task vào đây</p>
                </div>
            )}
        </div>

        {/* Footer Action */}
        <div className="pt-2 shrink-0">
            {activeStage?.id && activeStage?.name && (
                <NewTemplateDialog 
                    onTemplateCreated={onRefresh} 
                    defaultStatus={activeStage.name}
                    defaultCategoryId={activeStage.id}
                    defaultGroupId={isUngrouped ? null : group.id}
                    trigger={
                       <Button variant="ghost" className="w-full h-11 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-[11px] uppercase tracking-widest gap-2 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all">
                          <PlusCircle className="h-4 w-4" /> Thêm nhanh Task
                       </Button>
                    }
                />
            )}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Main Page ---

export default function TemplatesOverhaul() {
  const [categories, setCategories] = useState<Category[]>([])
  const [activeStageId, setActiveStageId] = useState<string | null>(null)
  const [groups, setGroups] = useState<TaskGroup[]>([])
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  useEffect(() => {
    document.title = 'Giai đoạn | Jitasks'
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchData = async () => {
    setLoading(true)
    try {
      const [catRes, groupRes, templateRes] = await Promise.all([
        supabase.from('project_categories').select('*').is('deleted_at', null).order('order_index'),
        supabase.from('task_groups').select('*').is('project_id', null).is('deleted_at', null).order('order_index'),
        supabase.from('task_templates').select('*').is('deleted_at', null).order('order_index', { ascending: true })
      ])

      if (catRes.data) {
        setCategories(catRes.data)
        setActiveStageId(prev => {
          if (prev) return prev
          return catRes.data!.length > 0 ? catRes.data![0].id : null
        })
      }
      if (groupRes.data) setGroups(groupRes.data)
      if (templateRes.data) setTemplates(templateRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filtered data based on active stage
  const activeStage = categories.find(c => c.id === activeStageId)
  const isStageReady = !!activeStage
  const stageGroups = useMemo(() => groups.filter(g => g.category_id === activeStageId), [groups, activeStageId])
  const stageTemplatesByGroup = useMemo(() => {
      const map: Record<string, TaskTemplate[]> = { ungrouped: [] }
      stageGroups.forEach(g => { map[g.id] = [] })
      
      templates.filter(t => t.category_id === activeStageId).forEach(t => {
          const groupId = t.task_group_id || 'ungrouped'
          if (!map[groupId]) map[groupId] = []
          map[groupId].push(t)
      })
      return map
  }, [templates, stageGroups, activeStageId])

  // --- Handlers ---

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find containers
    const activeData = active.data.current
    const activeContainer = activeData?.sortable?.containerId || activeData?.containerId || 'ungrouped'
    
    const overData = over.data.current
    const overContainer = overData?.sortable?.containerId || overId

    // Validate overContainer
    const isValidContainer = overContainer === 'ungrouped' || groups.some(g => g.id === overContainer)
    if (!isValidContainer) return

    if (activeContainer !== overContainer) {
      setTemplates((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId)
        const overIndex = prev.findIndex((t) => t.id === overId)
        
        const newGroupId = overContainer === 'ungrouped' ? null : overContainer
        
        let newIndex
        if (overIndex >= 0) {
          newIndex = overIndex
        } else {
          newIndex = prev.length // simplistic, will be refined in filter
        }

        const updated = [...prev]
        updated[activeIndex] = { ...updated[activeIndex], task_group_id: newGroupId }
        
        return arrayMove(updated, activeIndex, newIndex)
      })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // 1. Calculate new state synchronously
    let nextTemplates = [...templates]
    if (activeId !== overId) {
      const oldIndex = nextTemplates.findIndex((t) => t.id === activeId)
      const newIndex = nextTemplates.findIndex((t) => t.id === overId)
      if (oldIndex !== -1 && newIndex !== -1) {
        nextTemplates = arrayMove(nextTemplates, oldIndex, newIndex)
        setTemplates(nextTemplates)
      }
    }

    // Determine target group
    const overContainer = over.data.current?.sortable?.containerId || over.id
    
    // 2. Persist order for the affected group
    const containerTemplates = nextTemplates
      .filter(t => (t.task_group_id || 'ungrouped') === overContainer)
    
    // Only persist items with valid UUIDs 
    const validTemplates = containerTemplates.filter(t => t.id.length === 36)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const upsertData = validTemplates.map((t, index) => ({
      id: t.id,
      task_name: t.task_name,
      project_status: t.project_status,
      category_id: t.category_id,
      task_group_id: t.task_group_id,
      default_priority: t.default_priority,
      order_index: index,
      created_by: user.id,
      updated_at: new Date().toISOString()
    }))

    if (upsertData.length === 0) return

    const { error } = await supabase
      .from('task_templates')
      .upsert(upsertData, { onConflict: 'id' })

    if (error) {
      console.error('Error persisting reorder:', error)
      alert('Lỗi khi lưu thứ tự: ' + error.message)
      fetchData() // Rollback
    }
  }

  const handleAddGroup = async () => {
    try {
        if (!newGroupName || !activeStageId) return
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const maxOrder = stageGroups.length > 0 ? Math.max(...stageGroups.map(g => g.order_index)) : -1

        const { error } = await supabase.from('task_groups').insert({
          name: newGroupName,
          category_id: activeStageId,
          order_index: maxOrder + 1,
          created_by: user.id,
          project_id: null   // tường minh: đây là template group, không thuộc project nào
        })

        if (error) throw error

        setNewGroupName('')
        setIsAddingGroup(false)
        fetchData()
    } catch (err: any) {
        alert("Lỗi khi thêm nhóm: " + err.message)
    }
  }

  const handleDeleteGroup = async (id: string) => {
    try {
        if (!confirm('Xóa nhóm này sẽ đồng nghĩa với việc đưa toàn bộ các template bên trong vào thùng rác. Tiếp tục?')) return

        const deleteTime = new Date().toISOString()
        
        // 1. Soft delete the group
        const { error: groupError } = await supabase
            .from('task_groups')
            .update({ deleted_at: deleteTime })
            .eq('id', id)
        
        if (groupError) throw groupError

        // 2. Cascaded soft delete templates in this group
        const { error: templateError } = await supabase
            .from('task_templates')
            .update({ deleted_at: deleteTime })
            .eq('task_group_id', id)
        
        if (templateError) console.error("Error soft deleting child templates:", templateError)
        
        fetchData()
    } catch (err: any) {
        alert("Lỗi khi xóa nhóm: " + err.message)
    }
  }

  const handleUpdateGroup = async (id: string, name: string) => {
    try {
        const { error } = await supabase.from('task_groups').update({ name }).eq('id', id)
        if (error) throw error
        fetchData()
    } catch (err: any) {
        alert("Lỗi khi đổi tên nhóm: " + err.message)
    }
  }

  const handleToggleAutoCreate = async (id: string, newValue: boolean) => {
    // Optimistic update
    setGroups(prev => prev.map(g => g.id === id ? { ...g, auto_create: newValue } : g))
    try {
        const { error } = await supabase.from('task_groups').update({ auto_create: newValue }).eq('id', id)
        if (error) throw error
    } catch (err: any) {
        // Rollback
        setGroups(prev => prev.map(g => g.id === id ? { ...g, auto_create: !newValue } : g))
        alert("Lỗi khi cập nhật auto-create: " + err.message)
    }
  }

  const deleteTemplate = async (id: string) => {
    try {
        if (!confirm('Xóa template này?')) return
        const { error } = await supabase
            .from('task_templates')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
        if (error) throw error
        setTemplates(prev => prev.filter(t => t.id !== id))
    } catch (err: any) {
        alert("Lỗi khi xóa template: " + err.message)
    }
  }

  if (loading && categories.length === 0) return (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* 1. Stage Navigation (Tabs) */}
      <div className="sticky top-0 z-20 -mx-8 px-8 py-5 bg-slate-50/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 px-1 flex-1">
            {categories.map((stage) => {
              const colorStyles = getCategoryColorStyles(stage.color)
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStageId(stage.id)}
                  className={cn(
                    "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap text-white shadow-sm",
                    colorStyles.className,
                    activeStageId === stage.id 
                      ? "opacity-100 scale-105" 
                      : "opacity-50 hover:opacity-70"
                  )}
                  style={colorStyles.style}
                >
                  {stage.name}
                </button>
              )
            })}
          </div>

          <NewTemplateDialog onTemplateCreated={fetchData} trigger={
            <Button className="rounded-2xl h-11 px-6 font-black uppercase tracking-widest text-[10px] bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all gap-2 ml-4">
              <Plus className="h-4 w-4 stroke-[3px]" /> Thêm Template
            </Button>
          } />
        </div>
      </div>

      {/* 2. Kanban Grid */}
      <div className="max-w-[1400px] mx-auto">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {!isStageReady ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[400px] rounded-[2.5rem] bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {/* Existing Groups */}
              {stageGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  activeStage={activeStage}
                  templates={stageTemplatesByGroup[group.id] || []}
                  onDeleteGroup={handleDeleteGroup}
                  onUpdateGroup={handleUpdateGroup}
                  onDeleteTemplate={deleteTemplate}
                  onRefresh={fetchData}
                  onToggleAutoCreate={handleToggleAutoCreate}
                />
              ))}

              {/* Ungrouped Tasks */}
              {activeStage && (
                  <GroupCard
                      isUngrouped
                      group={{ id: 'ungrouped', name: 'Tasks chưa phân nhóm' }}
                      activeStage={activeStage}
                      templates={stageTemplatesByGroup.ungrouped || []}
                      onDeleteTemplate={deleteTemplate}
                      onRefresh={fetchData}
                  />
              )}

              {/* Add New Group Action */}
              <div className="space-y-4 h-full">
                  {isAddingGroup ? (
                      <Card className="rounded-[2.5rem] bg-white border-2 border-primary/20 shadow-2xl p-6 animate-in slide-in-from-top-4 duration-300">
                           <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                      <Plus className="h-5 w-5 text-primary" />
                                  </div>
                                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Tạo nhóm mới</span>
                              </div>
                              <Input 
                                  autoFocus
                                  placeholder="Tên nhóm task..."
                                  value={newGroupName}
                                  onChange={(e) => setNewGroupName(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                                  className="h-12 border-none bg-slate-50 rounded-2xl font-bold text-slate-800"
                              />
                              <div className="flex gap-2">
                                  <Button onClick={handleAddGroup} className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-primary/20">Lưu</Button>
                                  <Button variant="ghost" onClick={() => setIsAddingGroup(false)} className="rounded-xl h-12 font-bold text-slate-400">Hủy</Button>
                              </div>
                           </div>
                      </Card>
                  ) : (
                      <button 
                          onClick={() => setIsAddingGroup(true)}
                          className="group w-full h-[400px] border-4 border-dashed border-slate-200/60 rounded-[3rem] flex flex-col items-center justify-center gap-4 hover:border-primary/30 hover:bg-white transition-all duration-500"
                      >
                          <div className="h-16 w-16 rounded-[2rem] bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                               <Plus className="h-8 w-8 text-slate-300 group-hover:text-primary transition-colors" />
                          </div>
                          <div className="text-center">
                              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 group-hover:text-primary transition-colors">Thêm nhóm mới</p>
                              <p className="text-[10px] text-slate-300 font-medium mt-1">Phân loại template tốt hơn</p>
                          </div>
                      </button>
                  )}
              </div>
            </div>
          )}

          {/* DnD Drag Overlay for smooth visuals */}
          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
                styles: {
                    active: {
                        opacity: '0.5',
                    },
                },
            }),
          }}>
            {activeId ? (
                <div className="bg-white border-2 border-primary/20 rounded-2xl p-3 shadow-2xl ring-4 ring-primary/5 cursor-grabbing scale-105 rotate-2">
                    <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-primary" />
                        <h5 className="text-[13px] font-bold text-slate-700 tracking-tight">
                            {templates.find(t => t.id === activeId)?.task_name}
                        </h5>
                    </div>
                </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
