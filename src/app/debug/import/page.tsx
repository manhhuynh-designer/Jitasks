'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle2, FileJson, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function DebugImportPage() {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [isDev, setIsDev] = useState(true)

  useEffect(() => {
    // Basic check for environment
    if (process.env.NODE_ENV !== 'development') {
      setIsDev(false)
    }
  }, [])

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setLogs([])
    setIsDone(false)

    try {
      const text = await file.text()
      addLog(`Đã đọc file: ${file.name} (${text.length} bytes)`)
      
      let data: any
      try {
        data = JSON.parse(text)
        addLog('Giải mã JSON thành công.')
      } catch (pe) {
        throw new Error(`Lỗi định dạng JSON: ${(pe as any).message}`)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Chưa đăng nhập!')
      const uid = user.id
      addLog(`User authenticated: ${uid}`)

      // Safety checks
      data.suppliers = data.suppliers || []
      data.assignees = data.assignees || []
      data.projects = data.projects || []
      data.tasks = data.tasks || []
      data.task_groups = data.task_groups || []
      data.task_templates = data.task_templates || []

      // 1. Map IDs
      const supplierMap = new Map<string, string>()
      const assigneeMap = new Map<string, string>()
      const projectMap = new Map<string, string>()
      const taskGroupMap = new Map<string, string>()

      // 2. Fetch Categories
      addLog('Đang tải Project Categories...')
      const { data: categories, error: catFetchErr } = await supabase.from('project_categories').select('*')
      if (catFetchErr) throw catFetchErr
      
      addLog(`Tìm thấy ${categories?.length || 0} categories trong hệ thống.`)
      const categoryMap = new Map<string, string>()
      if (categories) {
        categories.forEach(c => categoryMap.set(c.name, c.id))
      }

      // 3. Import Task Groups (Idempotent: Reuse existing ones)
      if (data.task_groups.length) {
        addLog(`Đang xử lý ${data.task_groups.length} nhóm task...`)
        
        // Fetch existing batches to avoid duplicates and RLS errors
        const { data: existingGroups, error: groupFetchErr } = await supabase.from('task_groups').select('*')
        if (groupFetchErr) {
          addLog(`⚠️ Cảnh báo: Không thể tải danh sách nhóm hiện tại: ${groupFetchErr.message}`)
        }

        const existingGroupMap = new Map<string, string>() 
        existingGroups?.forEach(eg => {
          // Normalise key: lowercase category-name
          const key = `${eg.category_id}-${eg.name.toLowerCase().trim()}`
          existingGroupMap.set(key, eg.id)
        })

        for (const g of data.task_groups) {
          const categoryNameNormalized = g.category_name.trim()
          const categoryId = categoryMap.get(categoryNameNormalized)
          
          if (!categoryId) {
             addLog(`⚠️ Bỏ qua nhóm "${g.name}" vì không thấy category "${g.category_name}"`)
             continue
          }

          const cacheKey = `${categoryId}-${g.name.toLowerCase().trim()}`
          if (existingGroupMap.has(cacheKey)) {
            taskGroupMap.set(g.old_id, existingGroupMap.get(cacheKey)!)
            continue
          }

          addLog(`  + Tạo mới nhóm: ${g.name}`)
          const { data: newG, error: gErr } = await supabase
            .from('task_groups')
            .insert({
              name: g.name,
              category_id: categoryId,
              order_index: data.task_groups.indexOf(g),
              created_by: uid
            })
            .select().single()
          
          if (gErr) {
            addLog(`❌ Lỗi RLS/DB tại nhóm "${g.name}": ${gErr.message}`)
            throw gErr
          }
          taskGroupMap.set(g.old_id, newG.id)
          existingGroupMap.set(cacheKey, newG.id)
        }
        addLog(`✅ Đã xong nhóm task (${taskGroupMap.size})`)
      }



      // 4. Import Suppliers
      if (data.suppliers.length) {
        addLog(`Đang import ${data.suppliers.length} nhà cung cấp...`)
        for (const s of data.suppliers) {
          const { data: newS, error: sErr } = await supabase
            .from('suppliers')
            .insert({
              name: s.name,
              contact_info: s.contact_info,
              address: s.address,
              notes: s.notes,
              created_by: uid
            })
            .select().single()
          if (sErr) throw sErr
          supplierMap.set(s.old_id, newS.id)
        }
        addLog(`✅ Đã xong nhà cung cấp (${supplierMap.size})`)
      }

      // 5. Import Assignees
      if (data.assignees.length) {
        addLog(`Đang import ${data.assignees.length} nhân sự...`)
        for (const a of data.assignees) {
          const { data: newA, error: aErr } = await supabase
            .from('assignees')
            .insert({
              full_name: a.full_name,
              role: a.role,
              email: a.email,
              created_by: uid
            })
            .select().single()
          if (aErr) throw aErr
          assigneeMap.set(a.old_id, newA.id)
        }
        addLog(`✅ Đã xong nhân sự (${assigneeMap.size})`)
      }

      // 6. Import Projects
      const projectStatusMap = new Map<string, string>()
      const statusNormalizer = (s: string) => {
        const map: Record<string, string> = {
          'Tracking': 'Active',
          'Listing': 'Active',
          'Archived': 'Archive',
          'Archive': 'Archive'
        }
        return map[s] || s
      }

      const timeToMinutes = (val: any) => {
        if (typeof val === 'number') return val
        if (typeof val === 'string' && val.includes(':')) {
          const [h, m] = val.split(':').map(Number)
          return (h || 0) * 60 + (m || 0)
        }
        return 0
      }

      if (data.projects.length) {
        addLog(`Đang import ${data.projects.length} dự án...`)
        for (const p of data.projects) {
          const normalizedStatus = statusNormalizer(p.status)
          const { data: newP, error: pErr } = await supabase
            .from('projects')
            .insert({
              name: p.name,
              description: p.description,
              status: normalizedStatus,
              supplier_id: p.supplier_old_id ? supplierMap.get(p.supplier_old_id) : null,
              created_by: uid
            })
            .select().single()
          if (pErr) throw pErr
          projectMap.set(p.old_id, newP.id)
          projectStatusMap.set(p.old_id, normalizedStatus)
        }
        addLog(`✅ Đã xong dự án (${projectMap.size})`)
      }

      // 7. Import Tasks
      if (data.tasks.length) {
        addLog(`Đang import ${data.tasks.length} công việc...`)
        let tCount = 0
        for (const t of data.tasks) {
          const pid = projectMap.get(t.project_old_id)
          if (!pid) continue

          let deadline = null
          if (t.deadline_offset_days !== undefined) {
             const d = new Date()
             d.setDate(d.getDate() + t.deadline_offset_days)
             deadline = d.toISOString()
          }

          const pStatus = projectStatusMap.get(t.project_old_id)
          const catId = pStatus ? categoryMap.get(pStatus) : null

          const { error: tErr } = await supabase
            .from('tasks')
            .insert({
              project_id: pid,
              category_id: catId,
              task_group_id: t.task_group_old_id ? taskGroupMap.get(t.task_group_old_id) : null,
              name: t.name,
              description: t.description,
              priority: t.priority,
              status: t.status,
              assignee_id: t.assignee_old_id ? assigneeMap.get(t.assignee_old_id) : null,
              deadline: deadline,
              task_time: timeToMinutes(t.task_time),
              order_index: t.order_index || 0,
              created_by: uid
            })

          if (tErr) {
            addLog(`❌ Lỗi task "${t.name}": ${tErr.message}`)
            throw tErr
          }
          tCount++
        }
        addLog(`✅ Đã xong công việc (${tCount})`)
      }

      // 8. Import Task Templates
      if (data.task_templates && data.task_templates.length) {
        addLog(`Đang import ${data.task_templates.length} mẫu công việc...`)
        for (const tt of data.task_templates) {
          const { error: ttErr } = await supabase
            .from('task_templates')
            .insert({
              project_status: statusNormalizer(tt.project_status),
              task_name: tt.task_name,
              category_id: tt.category_name ? categoryMap.get(tt.category_name) : null,
              default_priority: tt.default_priority || 'medium',
              created_by: uid
            })
          if (ttErr) {
            addLog(`❌ Lỗi template "${tt.task_name}": ${ttErr.message}`)
            throw ttErr
          }
        }
        addLog(`✅ Đã xong mẫu công việc`)
      }

      addLog('Import HOÀN TẤT THÀNH CÔNG! ✨')
      setIsDone(true)
    } catch (err: any) {
      console.error('CRITICAL IMPORT ERROR:', err)
      let msg = 'Unknown Error'
      if (typeof err === 'string') msg = err
      else if (err && err.message) msg = err.message
      else if (err && err.details) msg = err.details
      else {
        try {
          msg = JSON.stringify(err, Object.getOwnPropertyNames(err))
        } catch (e) {
          msg = String(err)
        }
      }
      setError(msg)
      addLog(`❌ LỖI: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isDev) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full glass-premium border-none p-8 text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-rose-500 mx-auto" />
          <CardTitle className="text-2xl font-black">Truy cập bị từ chối</CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            Công cụ này chỉ khả dụng trong môi trường local development.
          </CardDescription>
          <Link 
            href="/" 
            className={cn(buttonVariants({ variant: 'default', size: 'default' }), "w-full rounded-2xl h-12")}
          >
            Quay về trang chủ
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-primary transition-colors gap-1 mb-2">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Link>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <FileJson className="h-10 w-10 text-primary" />
            Nhập dữ liệu JSON
          </h1>
          <p className="text-slate-500 font-medium">Công cụ hỗ trợ nạp dữ liệu kiểm thử (Chỉ dành cho Dev).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 rounded-[2.5rem] border-none glass-premium shadow-2xl overflow-hidden self-start">
          <CardHeader className="p-8">
            <CardTitle className="text-xl font-bold">Chọn tệp tin</CardTitle>
            <CardDescription className="font-medium">Tải nạp file .json mẫu</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
             <div className="relative group">
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                />
                <div className={cn(
                  "p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center group-hover:border-primary/50 group-hover:bg-primary/5 transition-all",
                  loading && "opacity-50"
                )}>
                  <FileJson className="h-12 w-12 text-slate-300 mx-auto mb-2 group-hover:text-primary transition-colors" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Click hoặc kéo thả</p>
                </div>
             </div>

             {loading && (
               <div className="flex items-center justify-center gap-2 text-primary font-bold animate-pulse">
                 <Loader2 className="h-5 w-5 animate-spin" />
                 Đang xử lý...
               </div>
             )}

             {isDone && (
               <div className="p-4 bg-emerald-50 rounded-2xl flex items-center gap-3 text-emerald-600 font-bold border border-emerald-100">
                 <CheckCircle2 className="h-6 w-6" />
                 Nhập hoàn tất!
               </div>
             )}

             {error && (
               <div className="p-4 bg-rose-50 rounded-2xl flex items-center gap-3 text-rose-600 font-bold border border-rose-100">
                 <AlertCircle className="h-6 w-6" />
                 Lỗi: {error}
               </div>
             )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 rounded-[2.5rem] border-none bg-slate-900 shadow-2xl overflow-hidden min-h-[400px]">
          <CardHeader className="p-8 border-b border-white/5">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Tiến trình Import
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 bg-black/40 font-mono text-[13px]">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-slate-600 italic">Chờ tải tệp tin...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={cn(
                    "border-l-2 pl-3 py-1",
                    log.includes('Lỗi') || log.includes('DỪNG') ? "border-rose-500 text-rose-400 bg-rose-500/5" : 
                    log.includes('THÀNH CÔNG') ? "border-emerald-500 text-emerald-400 bg-emerald-500/5" :
                    "border-primary/30 text-slate-300"
                  )}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
