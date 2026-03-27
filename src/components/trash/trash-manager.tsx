'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { format, formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { 
  Trash2, 
  RotateCcw, 
  Search, 
  X, 
  LayoutGrid, 
  ListTodo, 
  Briefcase,
  AlertCircle,
  Loader2,
  Calendar,
  CheckCircle2,
  FilterX,
  FileText,
  Truck,
  UserCheck,
  ChevronRight,
  RefreshCw,
  Clock,
  ClipboardCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CARD_GLASS, LABEL_XS } from '@/constants/ui-tokens'
import { Checkbox } from '@/components/ui/checkbox'

export type DeletedItem = {
  id: string
  name: string
  type: 'task' | 'group' | 'project' | 'document' | 'supplier' | 'assignee' | 'template'
  deleted_at: string
  project_name?: string
}

// --- Sub-components ---

function TrashStatCard({ label, value, icon: Icon, color, onClick, active }: { 
  label: string, value: number, icon: any, color: string, onClick?: () => void, active?: boolean 
}) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        CARD_GLASS,
        "p-5 transition-all group cursor-pointer active:scale-95 border-white/40 overflow-hidden",
        active ? "bg-white/80 ring-2 ring-primary/20" : "hover:bg-white/60"
      )}
    >
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <div className={cn("p-2 rounded-xl bg-white/80 transition-colors group-hover:bg-white shadow-sm", color)}>
            <Icon className="h-4 w-4" />
          </div>
          <span className={cn(LABEL_XS, "text-[9px]")}>{label}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className={cn("text-2xl font-black tracking-tighter", color)}>
            {value}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0" />
        </div>
      </div>
      {/* Background Accent */}
      <div className={cn("absolute -right-4 -bottom-4 h-16 w-16 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity", color)}>
        <Icon className="h-full w-full" />
      </div>
    </div>
  )
}

function TrashItemRow({ item, onRestore, onDelete, isSelected, onToggle }: { 
  item: DeletedItem, 
  onRestore: (item: DeletedItem) => void, 
  onDelete: (item: DeletedItem) => void,
  isSelected?: boolean,
  onToggle?: (id: string) => void
}) {
  const Icon = 
    item.type === 'task' ? ListTodo : 
    item.type === 'group' ? LayoutGrid : 
    item.type === 'project' ? Briefcase :
    item.type === 'document' ? FileText :
    item.type === 'supplier' ? Truck :
    item.type === 'assignee' ? UserCheck :
    item.type === 'template' ? ClipboardCheck :
    ListTodo

  const colorConfig = {
    task: 'text-blue-500 bg-blue-50',
    group: 'text-amber-500 bg-amber-50',
    project: 'text-rose-500 bg-rose-50',
    document: 'text-indigo-500 bg-indigo-50',
    supplier: 'text-emerald-500 bg-emerald-50',
    assignee: 'text-violet-500 bg-violet-50',
    template: 'text-orange-500 bg-orange-50',
  }

  const color = colorConfig[item.type] || 'text-slate-500 bg-slate-50'
  const timeAgo = formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true, locale: vi })

  return (
    <div className="group relative flex items-center gap-3 md:gap-4">
      <Checkbox 
        checked={isSelected} 
        onChange={() => onToggle?.(item.id)}
        className="h-5 w-5 rounded-lg border-2 border-slate-200 checked:bg-primary checked:border-primary transition-all ml-1 md:ml-2 shrink-0"
      />
      <div className={cn(
        "flex-1 flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/40 hover:bg-white/70 backdrop-blur-sm rounded-3xl md:rounded-[2rem] border border-white/60 transition-all duration-500 gap-4",
        isSelected ? "ring-2 ring-primary bg-white/80" : "hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1"
      )}>
        <div className="flex items-center gap-4 md:gap-5 min-w-0">
          <div className={cn("h-10 w-10 md:h-12 md:w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3", color)}>
            <Icon className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-[13px] md:text-sm font-black text-slate-800 tracking-tight truncate">{item.name}</h4>
              <Badge variant="outline" className="text-[7px] md:text-[8px] font-black uppercase tracking-tighter h-3.5 md:h-4 px-1 md:px-1.5 border-slate-200 text-slate-400 bg-slate-50/50">
                {item.type}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span className="text-[9px] md:text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" />
                Đã xoá {timeAgo}
              </span>
              {item.project_name && (
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary/40 flex items-center gap-1.5 bg-primary/5 px-2 py-0.5 rounded-full">
                  <Briefcase className="h-2 w-2 md:h-2.5 md:w-2.5" />
                  {item.project_name}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 pr-0 sm:pr-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRestore(item)}
            className="h-9 md:h-10 px-3 md:px-4 rounded-xl bg-white/80 hover:bg-primary hover:text-white transition-all font-black text-[9px] md:text-[10px] uppercase tracking-wider shadow-sm active:scale-90"
          >
            <RotateCcw className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" />
            Khôi phục
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(item)}
            className="h-9 w-9 md:h-10 md:w-10 rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90"
            title="Xoá vĩnh viễn"
          >
            <Trash2 className="h-4 w-4 md:h-4.5 md:w-4.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- Main Component ---

export function TrashManager() {
  const [tasks, setTasks] = useState<DeletedItem[]>([])
  const [groups, setGroups] = useState<DeletedItem[]>([])
  const [projects, setProjects] = useState<DeletedItem[]>([])
  const [documents, setDocuments] = useState<DeletedItem[]>([])
  const [suppliers, setSuppliers] = useState<DeletedItem[]>([])
  const [assignees, setAssignees] = useState<DeletedItem[]>([])
  const [templates, setTemplates] = useState<DeletedItem[]>([])
  const [allData, setAllData] = useState<DeletedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isPolicyOpen, setIsPolicyOpen] = useState(false)

  const fetchDeletedItems = useCallback(async () => {
    setLoading(true)
    try {
      const [
        { data: taskData },
        { data: groupData },
        { data: projectData },
        { data: docData },
        { data: supplierData },
        { data: assigneeData },
        { data: templateData }
      ] = await Promise.all([
        supabase.from('tasks').select('id, name, deleted_at, projects(name)').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('task_groups').select('id, name, deleted_at, projects(name)').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('projects').select('id, name, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('project_documents').select('id, title, deleted_at, projects(name)').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('suppliers').select('id, name, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('assignees').select('id, full_name, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('task_templates').select('id, task_name, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
      ])

      setTasks(taskData?.map(t => ({ id: t.id, name: t.name, deleted_at: t.deleted_at, type: 'task', project_name: (t as any).projects?.name })) || [])
      setGroups(groupData?.map(g => ({ id: g.id, name: g.name, deleted_at: g.deleted_at, type: 'group', project_name: (g as any).projects?.name })) || [])
      setProjects(projectData?.map(p => ({ id: p.id, name: p.name, deleted_at: p.deleted_at, type: 'project' })) || [])
      setDocuments(docData?.map(d => ({ id: d.id, name: d.title, deleted_at: d.deleted_at, type: 'document', project_name: (d as any).projects?.name })) || [])
      setSuppliers(supplierData?.map(s => ({ id: s.id, name: s.name, deleted_at: s.deleted_at, type: 'supplier' })) || [])
      setAssignees(assigneeData?.map(a => ({ id: a.id, name: a.full_name, deleted_at: a.deleted_at, type: 'assignee' })) || [])
      setTemplates(templateData?.map(t => ({ id: t.id, name: t.task_name, deleted_at: t.deleted_at, type: 'template' })) || [])

      // Combine all
      const combined = [
        ...(taskData?.map(t => ({ id: t.id, name: t.name, deleted_at: t.deleted_at, type: 'task' as const, project_name: (t as any).projects?.name })) || []),
        ...(groupData?.map(g => ({ id: g.id, name: g.name, deleted_at: g.deleted_at, type: 'group' as const, project_name: (g as any).projects?.name })) || []),
        ...(projectData?.map(p => ({ id: p.id, name: p.name, deleted_at: p.deleted_at, type: 'project' as const })) || []),
        ...(docData?.map(d => ({ id: d.id, name: d.title, deleted_at: d.deleted_at, type: 'document' as const, project_name: (d as any).projects?.name })) || []),
        ...(supplierData?.map(s => ({ id: s.id, name: s.name, deleted_at: s.deleted_at, type: 'supplier' as const })) || []),
        ...(assigneeData?.map(a => ({ id: a.id, name: a.full_name, deleted_at: a.deleted_at, type: 'assignee' as const })) || []),
        ...(templateData?.map(t => ({ id: t.id, name: t.task_name, deleted_at: t.deleted_at, type: 'template' as const })) || []),
      ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime())
      
      setAllData(combined)

    } catch (error) {
      console.error('Error fetching trash items:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDeletedItems()
  }, [fetchDeletedItems])

  const handleRestore = async (item: DeletedItem) => {
    try {
      const table = 
        item.type === 'task' ? 'tasks' : 
        item.type === 'group' ? 'task_groups' : 
        item.type === 'project' ? 'projects' : 
        item.type === 'document' ? 'project_documents' :
        item.type === 'supplier' ? 'suppliers' :
        item.type === 'assignee' ? 'assignees' :
        'task_templates'

      const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', item.id)
      if (error) throw error
      fetchDeletedItems()
    } catch (error: any) {
      console.error("Restore error:", error)
      alert(`Lỗi phục hồi: ${error.message}`)
    }
  }

  const handlePermanentDelete = async (item: DeletedItem) => {
    if (!confirm(`Bạn có chắc muốn xoá vĩnh viễn ${item.name}? Hành động này không thể hoàn tác.`)) return

    try {
      const table = 
        item.type === 'task' ? 'tasks' : 
        item.type === 'group' ? 'task_groups' : 
        item.type === 'project' ? 'projects' : 
        item.type === 'document' ? 'project_documents' :
        item.type === 'supplier' ? 'suppliers' :
        item.type === 'assignee' ? 'assignees' :
        'task_templates'

      const { error } = await supabase.from(table).delete().eq('id', item.id)
      if (error) throw error
      fetchDeletedItems()
    } catch (error: any) {
      console.error("Delete error:", error)
      alert(`Lỗi xoá vĩnh viễn: ${error.message}`)
    }
  }

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Phục hồi ${selectedIds.length} mục đã chọn?`)) return

    try {
      setLoading(true)
      // We need to know the type for each ID to hit the right table.
      // Easiest is to filter from allData
      const itemsToRestore = allData.filter(i => selectedIds.includes(i.id))
      
      for (const item of itemsToRestore) {
        const table = 
          item.type === 'task' ? 'tasks' : 
          item.type === 'group' ? 'task_groups' : 
          item.type === 'project' ? 'projects' : 
          item.type === 'document' ? 'project_documents' :
          item.type === 'supplier' ? 'suppliers' :
          item.type === 'assignee' ? 'assignees' :
          'task_templates'
        
        await supabase.from(table).update({ deleted_at: null }).eq('id', item.id)
      }
      
      setSelectedIds([])
      fetchDeletedItems()
    } catch (error) {
       console.error("Bulk restore error:", error)
    } finally {
       setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`XOÁ VĨNH VIỄN ${selectedIds.length} mục đã chọn? Hành động này KHÔNG THỂ hoàn tác.`)) return

    try {
      setLoading(true)
      const itemsToDelete = allData.filter(i => selectedIds.includes(i.id))
      
      for (const item of itemsToDelete) {
        const table = 
          item.type === 'task' ? 'tasks' : 
          item.type === 'group' ? 'task_groups' : 
          item.type === 'project' ? 'projects' : 
          item.type === 'document' ? 'project_documents' :
          item.type === 'supplier' ? 'suppliers' :
          item.type === 'assignee' ? 'assignees' :
          'task_templates'
        
        await supabase.from(table).delete().eq('id', item.id)
      }
      
      setSelectedIds([])
      fetchDeletedItems()
    } catch (error) {
       console.error("Bulk delete error:", error)
    } finally {
       setLoading(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const selectAllInTab = () => {
    const currentItems = 
      activeTab === 'all' ? allData :
      activeTab === 'tasks' ? tasks :
      activeTab === 'groups' ? groups :
      activeTab === 'projects' ? projects :
      activeTab === 'documents' ? documents :
      activeTab === 'suppliers' ? suppliers :
      activeTab === 'assignees' ? assignees :
      templates

    const filtered = filterItems(currentItems).map(i => i.id)
    const allSelected = filtered.every(id => selectedIds.includes(id))
    
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filtered.includes(id)))
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...filtered])))
    }
  }

  const filterItems = (items: DeletedItem[]) => {
    if (!searchQuery) return items
    const query = searchQuery.toLowerCase()
    return items.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.project_name?.toLowerCase().includes(query)
    )
  }

  const renderEmptyState = (type: string) => (
    <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
      <div className="h-24 w-24 rounded-[2rem] bg-white/40 glass-premium flex items-center justify-center relative">
        <FilterX className="h-10 w-10 text-slate-300" />
        <div className="absolute -right-1 -bottom-1 h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm border-2 border-white">
          <CheckCircle2 className="h-4 w-4" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest leading-none">Thùng rác sạch sẽ</h3>
        <p className="text-[12px] font-bold text-slate-400 italic">Không tìm thấy {type} nào đang chờ xử lý.</p>
      </div>
    </div>
  )

  const statsList = useMemo(() => [
    { id: 'tasks', label: 'Tasks', value: tasks.length, icon: ListTodo, color: 'text-blue-500' },
    { id: 'projects', label: 'Projects', value: projects.length, icon: Briefcase, color: 'text-rose-500' },
    { id: 'groups', label: 'Groups', value: groups.length, icon: LayoutGrid, color: 'text-amber-500' },
    { id: 'others', label: 'Khác', value: documents.length + suppliers.length + assignees.length + templates.length, icon: FileText, color: 'text-indigo-500' },
  ], [tasks.length, projects.length, groups.length, documents.length, suppliers.length, assignees.length, templates.length])

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 py-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="h-14 w-14 md:h-16 md:w-16 rounded-[1.5rem] md:rounded-[2rem] bg-slate-900 flex items-center justify-center text-white shadow-2xl shadow-slate-300 relative group transition-transform hover:scale-110 active:scale-95 cursor-pointer overflow-hidden shrink-0">
               <Trash2 className="h-6 w-6 md:h-8 md:w-8 relative z-10" />
               <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none mb-2">Thùng rác</h1>
              <p className="text-[12px] md:text-sm font-bold text-slate-400 max-w-md">Khu vực quản lý dữ liệu lưu trữ tạm thời. Bạn có thể khôi phục hoặc xoá vĩnh viễn.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 flex-1 max-w-2xl w-full">
          {statsList.map(stat => (
            <TrashStatCard 
              key={stat.id}
              {...stat}
              active={activeTab === stat.id || (stat.id === 'others' && !['tasks', 'projects', 'groups'].includes(activeTab))}
              onClick={() => {
                if (stat.id === 'others') setActiveTab('documents')
                else setActiveTab(stat.id)
              }}
            />
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-row items-center gap-2 md:gap-4 bg-white/30 backdrop-blur-xl p-2 md:p-3 rounded-2xl md:rounded-[2.5rem] border border-white/60 shadow-xl shadow-slate-200/20">
        <div className="relative group flex-1">
          <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 h-4 md:h-4.5 w-4 md:w-4.5 text-slate-400 group-focus-within:text-primary transition-all group-focus-within:scale-110" />
          <Input 
            placeholder="Tìm theo tên hoặc project..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 md:pl-14 h-12 md:h-14 w-full rounded-xl md:rounded-3xl border-none bg-white/60 font-black text-[12px] md:text-sm shadow-inner transition-all placeholder:text-slate-300 focus-visible:ring-0 focus-visible:bg-white"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 h-6 md:h-8 w-6 md:w-8 rounded-lg md:rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-400 transition-all active:scale-90"
            >
              <X className="h-3 md:h-4 w-3 md:w-4" />
            </button>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={fetchDeletedItems}
          disabled={loading}
          className="h-12 w-12 md:h-14 md:w-14 rounded-xl md:rounded-3xl bg-white/60 hover:bg-white text-slate-600 transition-all active:scale-90 shadow-sm shrink-0"
        >
          <RefreshCw className={cn("h-4 md:h-5 w-4 md:w-5", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
         <div className="fixed bottom-6 md:bottom-10 left-4 md:left-1/2 -translate-x-0 md:-translate-x-1/2 right-4 md:right-auto z-50 animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-slate-900 text-white rounded-3xl md:rounded-[2.5rem] p-2 md:p-3 pl-5 md:pl-8 pr-3 md:pr-4 flex items-center justify-between md:justify-start gap-4 md:gap-8 shadow-2xl shadow-primary/20 ring-1 ring-white/10 backdrop-blur-3xl">
               <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl md:rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg text-xs md:text-base font-black">
                      {selectedIds.length}
                  </div>
                  <div className="hidden xs:block">
                     <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/50 leading-none mb-0.5 md:mb-1">Đã chọn</p>
                     <p className="text-[11px] md:text-sm font-black text-white">Mục</p>
                  </div>
               </div>
               
               <div className="hidden xs:block h-6 md:h-8 w-[1px] bg-white/10" />
               
               <div className="flex items-center gap-2 md:gap-3">
                  <Button 
                    onClick={handleBulkRestore}
                    disabled={loading}
                    className="rounded-xl md:rounded-2xl h-10 md:h-12 px-3 md:px-6 bg-white text-slate-900 hover:bg-primary hover:text-white font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all gap-2"
                  >
                     <RotateCcw className="h-3.5 w-3.5 md:h-4 md:w-4" /> <span className="hidden sm:inline">Phục hồi tất cả</span><span className="sm:hidden">Phục hồi</span>
                  </Button>
                  <Button 
                    onClick={handleBulkDelete}
                    disabled={loading}
                    variant="ghost"
                    className="rounded-xl md:rounded-2xl h-10 md:h-12 px-3 md:px-6 text-rose-500 hover:bg-rose-500/10 font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all gap-2"
                  >
                     <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" /> <span className="hidden sm:inline">Xoá vĩnh viễn</span><span className="sm:hidden">Xoá</span>
                  </Button>
                  <Button 
                    onClick={() => setSelectedIds([])}
                    variant="ghost" 
                    className="h-9 w-9 md:h-12 md:w-12 rounded-xl md:rounded-2xl text-white/30 hover:text-white shrink-0"
                  >
                    <X className="h-4 md:h-5 w-4 md:w-5" />
                  </Button>
               </div>
            </div>
         </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-14 w-full justify-start bg-transparent p-0 rounded-none gap-8 mb-8 overflow-x-auto no-scrollbar border-b border-slate-100">
          {[
            { id: 'all', label: 'Tất cả', count: allData.length },
            { id: 'tasks', label: 'Tasks', count: tasks.length },
            { id: 'projects', label: 'Projects', count: projects.length },
            { id: 'groups', label: 'Groups', count: groups.length },
            { id: 'documents', label: 'Tài liệu', count: documents.length },
            { id: 'suppliers', label: 'Suppliers', count: suppliers.length },
            { id: 'assignees', label: 'Nhân sự', count: assignees.length },
            { id: 'templates', label: 'Templates', count: templates.length },
          ].map(t => (
            <TabsTrigger 
              key={t.id}
              value={t.id} 
              className={cn(
                "h-full px-1 rounded-none bg-transparent shadow-none border-b-2 border-transparent transition-all",
                "text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap",
                "data-[state=active]:border-primary data-[state=active]:text-slate-900 data-[state=active]:bg-transparent"
              )}
            >
              {t.label} 
              <span className="ml-2 px-1.5 py-0.5 rounded-md bg-slate-100 text-[9px] group-data-[state=active]:bg-primary/10 transition-colors">
                {t.count}
              </span>
            </TabsTrigger>
          ))}
          <div className="flex-1" />
          <Button 
            variant="ghost" 
            onClick={selectAllInTab}
            className="text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-xl h-9 px-4"
          >
            {(() => {
                const currentItems = 
                  activeTab === 'all' ? allData :
                  activeTab === 'tasks' ? tasks :
                  activeTab === 'groups' ? groups :
                  activeTab === 'projects' ? projects :
                  activeTab === 'documents' ? documents :
                  activeTab === 'suppliers' ? suppliers :
                  activeTab === 'assignees' ? assignees :
                  templates
                const filtered = filterItems(currentItems)
                const isAllSelected = filtered.length > 0 && filtered.every(id => selectedIds.includes(id.id))
                return isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"
            })()}
          </Button>
        </TabsList>

        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">Đang nạp dữ liệu rác...</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <TabsContent value="all" className="mt-0 space-y-3">
                {filterItems(allData).length > 0 ? filterItems(allData).map(item => (
                  <TrashItemRow 
                    key={`${item.type}-${item.id}`} 
                    item={item} 
                    onRestore={handleRestore} 
                    onDelete={handlePermanentDelete}
                    isSelected={selectedIds.includes(item.id)}
                    onToggle={toggleSelection}
                  />
                )) : renderEmptyState('mục')}
              </TabsContent>

              <TabsContent value="tasks" className="mt-0 space-y-3">
                {filterItems(tasks).length > 0 ? filterItems(tasks).map(item => (
                  <TrashItemRow 
                    key={item.id} 
                    item={item} 
                    onRestore={handleRestore} 
                    onDelete={handlePermanentDelete}
                    isSelected={selectedIds.includes(item.id)}
                    onToggle={toggleSelection}
                  />
                )) : renderEmptyState('task')}
              </TabsContent>

              <TabsContent value="groups" className="mt-0 space-y-3">
                {filterItems(groups).length > 0 ? filterItems(groups).map(item => (
                  <TrashItemRow 
                    key={item.id} 
                    item={item} 
                    onRestore={handleRestore} 
                    onDelete={handlePermanentDelete}
                    isSelected={selectedIds.includes(item.id)}
                    onToggle={toggleSelection}
                  />
                )) : renderEmptyState('nhóm')}
              </TabsContent>

              <TabsContent value="projects" className="mt-0 space-y-3">
                {filterItems(projects).length > 0 ? filterItems(projects).map(item => (
                  <TrashItemRow 
                    key={item.id} 
                    item={item} 
                    onRestore={handleRestore} 
                    onDelete={handlePermanentDelete}
                    isSelected={selectedIds.includes(item.id)}
                    onToggle={toggleSelection}
                  />
                )) : renderEmptyState('project')}
              </TabsContent>

              <TabsContent value="documents" className="mt-0 space-y-3">
                {filterItems(documents).length > 0 ? filterItems(documents).map(item => (
                  <TrashItemRow 
                    key={item.id} 
                    item={item} 
                    onRestore={handleRestore} 
                    onDelete={handlePermanentDelete}
                    isSelected={selectedIds.includes(item.id)}
                    onToggle={toggleSelection}
                  />
                )) : renderEmptyState('tài liệu')}
              </TabsContent>

              <TabsContent value="suppliers" className="mt-0 space-y-3">
                {filterItems(suppliers).length > 0 ? filterItems(suppliers).map(item => (
                  <TrashItemRow 
                    key={item.id} 
                    item={item} 
                    onRestore={handleRestore} 
                    onDelete={handlePermanentDelete}
                    isSelected={selectedIds.includes(item.id)}
                    onToggle={toggleSelection}
                  />
                )) : renderEmptyState('nhà cung cấp')}
              </TabsContent>

              <TabsContent value="assignees" className="mt-0 space-y-3">
                {filterItems(assignees).length > 0 ? filterItems(assignees).map(item => (
                  <TrashItemRow 
                    key={item.id} 
                    item={item} 
                    onRestore={handleRestore} 
                    onDelete={handlePermanentDelete}
                    isSelected={selectedIds.includes(item.id)}
                    onToggle={toggleSelection}
                  />
                )) : renderEmptyState('nhân sự')}
              </TabsContent>

              <TabsContent value="templates" className="mt-0 space-y-3">
                {filterItems(templates).length > 0 ? filterItems(templates).map(item => (
                  <TrashItemRow 
                    key={item.id} 
                    item={item} 
                    onRestore={handleRestore} 
                    onDelete={handlePermanentDelete}
                    isSelected={selectedIds.includes(item.id)}
                    onToggle={toggleSelection}
                  />
                )) : renderEmptyState('template')}
              </TabsContent>
            </div>
          )}
        </div>
      </Tabs>
      
      {/* Policy Tip Section */}
      <div className="p-8 bg-slate-900 rounded-[3rem] text-white flex flex-col lg:flex-row items-center gap-8 shadow-2xl shadow-slate-300 relative overflow-hidden group">
         {/* Decorative Background Elements */}
         <div className="absolute top-0 right-0 h-40 w-40 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-primary/20 transition-all" />
         <div className="absolute bottom-0 left-0 h-32 w-32 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

         <div className="h-20 w-20 rounded-[2rem] bg-white/10 flex items-center justify-center shrink-0 relative z-10">
           <AlertCircle className="h-10 w-10 text-amber-400 group-hover:scale-110 transition-transform" />
         </div>
         <div className="space-y-2 text-center lg:text-left relative z-10 flex-1">
           <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white/50 mb-3">Chính sách Bảo trì Dữ liệu</h4>
           <p className="text-sm font-bold text-slate-300 leading-relaxed max-w-4xl">
             Ứng dụng lưu trữ mọi thành phần bị xoá trong Thùng rác vĩnh viễn cho đến khi thao tác "Xoá vĩnh viễn" được thực hiện thủ công. 
             Điều này giúp bảo vệ bạn khỏi việc mất dữ liệu ngoài ý muốn. Khi khôi phục, hệ thống sẽ cố gắng đưa mục đó trở về vị trí cũ kèm theo tất cả các liên kết dữ liệu ban đầu. 
             <span className="text-primary ml-1 italic font-medium">Lưu ý: Một dự án cha bị xoá sẽ ngăn việc hiển thị các task con của nó trong giao diện chính dù đã khôi phục task đó.</span>
           </p>
         </div>
          <div className="shrink-0 relative z-10">
            <Dialog open={isPolicyOpen} onOpenChange={setIsPolicyOpen}>
              <DialogTrigger render={<Button variant="outline" className="h-12 border-white/20 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest px-8" />}>
                Đọc chi tiết
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none glass-premium p-0 overflow-hidden shadow-2xl">
                <div className="p-8 bg-slate-900 text-white">
                  <DialogHeader className="space-y-4">
                    <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center mb-2 shadow-sm ring-4 ring-white/5">
                      <AlertCircle className="h-8 w-8 text-amber-400" />
                    </div>
                    <DialogTitle className="text-2xl text-white font-black tracking-tight uppercase">
                      Chính sách Bảo trì Dữ liệu
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 font-medium text-sm">
                      Mọi thứ bạn cần biết về cách Jitasks bảo vệ dữ liệu đã xoá của bạn.
                    </DialogDescription>
                  </DialogHeader>
                </div>
                
                <div className="p-8 space-y-6 bg-white/90 backdrop-blur-xl">
                  <div className="space-y-4">
                    <h5 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                       <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                       Cơ chế hoạt động
                    </h5>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">
                      Khi bạn xoá một mục (Task, Project, Supplier...), mục đó không biến mất ngay lập tức mà được gắn nhãn <span className="font-bold text-slate-900">Soft Delete</span>. 
                      Hệ thống sẽ ẩn mục này khỏi giao diện làm việc chính và chuyển nó vào Thùng rác.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                       <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                       Thời hạn lưu trữ
                    </h5>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">
                      Hiện tại, Jitasks <span className="font-bold text-slate-900">không giới hạn thời gian</span> lưu trữ mục trong thùng rác. 
                      Bạn có thể khôi phục chúng bất cứ lúc nào trừ khi bạn chủ động chọn "Xoá vĩnh viễn".
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-xs font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
                       <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                       Lưu ý quan trọng
                    </h5>
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 space-y-2">
                      <p className="text-[12px] font-bold text-rose-600 leading-relaxed">
                        • Một Task/Group thuộc về một Project đã bị xoá vĩnh viễn sẽ không thể hiển thị lại trong giao diện Project Detail dù bạn đã khôi phục Task đó.
                      </p>
                      <p className="text-[12px] font-bold text-rose-600 leading-relaxed">
                        • Xoá vĩnh viễn Project sẽ xoá toàn bộ dữ liệu liên quan (Tasks, Documents) đi kèm. Hành động này KHÔNG THỂ hoàn tác.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                     <Button onClick={() => setIsPolicyOpen(false)} className="rounded-xl h-11 px-6 font-black uppercase tracking-widest text-[10px]">Đã hiểu</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
         </div>
      </div>
    </div>
  )
}
