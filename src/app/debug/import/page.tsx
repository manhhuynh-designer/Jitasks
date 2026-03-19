'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
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
      const data = JSON.parse(text)
      addLog('Bắt đầu quá trình import dữ liệu...')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Chưa đăng nhập!')
      const uid = user.id

      // 1. Map IDs
      const supplierMap = new Map<string, string>()
      const assigneeMap = new Map<string, string>()
      const projectMap = new Map<string, string>()

      // 2. Fetch Categories (to map status to ID if needed)
      const { data: categories } = await supabase.from('project_categories').select('*')
      addLog(`Tìm thấy ${categories?.length || 0} categories trong hệ thống.`)

      // 3. Import Suppliers
      if (data.suppliers?.length) {
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
            .select()
            .single()
          if (sErr) throw sErr
          supplierMap.set(s.old_id, newS.id)
        }
      }

      // 4. Import Assignees
      if (data.assignees?.length) {
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
            .select()
            .single()
          if (aErr) throw aErr
          assigneeMap.set(a.old_id, newA.id)
        }
      }

      // 5. Import Projects
      if (data.projects?.length) {
        addLog(`Đang import ${data.projects.length} dự án...`)
        for (const p of data.projects) {
          const { data: newP, error: pErr } = await supabase
            .from('projects')
            .insert({
              name: p.name,
              description: p.description,
              status: p.status,
              supplier_id: p.supplier_old_id ? supplierMap.get(p.supplier_old_id) : null,
              created_by: uid
            })
            .select()
            .single()
          if (pErr) throw pErr
          projectMap.set(p.old_id, newP.id)
        }
      }

      // 6. Import Tasks
      if (data.tasks?.length) {
        addLog(`Đang import ${data.tasks.length} công việc...`)
        for (const t of data.tasks) {
          const pid = projectMap.get(t.project_old_id)
          if (!pid) {
            addLog(`Bỏ qua task "${t.name}" vì không tìm thấy project ID.`)
            continue
          }

          // Calculate deadline relative to today
          let deadline = null
          if (t.deadline_offset_days !== undefined) {
             const d = new Date()
             d.setDate(d.getDate() + t.deadline_offset_days)
             deadline = d.toISOString()
          }

          const { error: tErr } = await supabase
            .from('tasks')
            .insert({
              project_id: pid,
              name: t.name,
              description: t.description,
              priority: t.priority,
              status: t.status,
              assignee_id: t.assignee_old_id ? assigneeMap.get(t.assignee_old_id) : null,
              deadline: deadline,
              created_by: uid
            })
          if (tErr) throw tErr
        }
      }

      // 7. Import Task Templates
      if (data.task_templates?.length) {
        addLog(`Đang import ${data.task_templates.length} task templates...`)
        for (const tt of data.task_templates) {
          const { error: ttErr } = await supabase
            .from('task_templates')
            .insert({
              project_status: tt.project_status,
              task_name: tt.task_name,
              default_priority: tt.default_priority,
              created_by: uid
            })
          if (ttErr) throw ttErr
        }
      }

      addLog('Import HOÀN TẤT THÀNH CÔNG! ✨')
      setIsDone(true)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi không xác định trong quá trình import.')
      addLog('DỪNG: Đã xảy ra lỗi.')
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
          <Button asChild className="w-full rounded-2xl h-12">
            <Link href="/">Quay về trang chủ</Link>
          </Button>
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
