'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Upload, FileJson, AlertCircle, Check, Download, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { EmailTemplate } from './email-template-card'

interface ImportEmailTemplatesDialogProps {
  onImported: () => void
}

export function ImportEmailTemplatesDialog({ onImported }: ImportEmailTemplatesDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [stages, setStages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchStages = async () => {
      const { data } = await supabase.from('project_categories').select('name')
      if (data) {
        setStages(data.map(s => s.name))
      }
    }
    if (open) fetchStages()
  }, [open])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/json') {
        setError('Vui lòng chọn tệp JSON hợp lệ.')
        return
      }
      setFile(selectedFile)
      setError(null)
      setSuccess(false)
      
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string)
          if (Array.isArray(json)) {
            // Basic validation
            const isValid = json.every(item => 
              item.title && item.subject && item.body && item.recipient_type
            )
            if (!isValid) {
              setError('Dữ liệu JSON không đúng định dạng. Cần có title, subject, body và recipient_type.')
              setPreview(null)
            } else {
              setPreview(json)
            }
          } else {
            setError('Dữ liệu JSON phải là một mảng.')
            setPreview(null)
          }
        } catch (err) {
          setError('Không thể đọc tệp JSON. Vui lòng kiểm tra lại định dạng.')
          setPreview(null)
        }
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleImport = async () => {
    if (!preview || preview.length === 0) return
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Người dùng chưa đăng nhập')

      const templatesToInsert = preview.map(t => ({
        ...t,
        stage: stages.includes(t.stage) ? t.stage : null,
        created_by: user.id,
        use_count: 0
      }))

      const { error: insertError } = await supabase
        .from('email_templates')
        .insert(templatesToInsert)

      if (insertError) throw insertError

      setSuccess(true)
      onImported()
      setTimeout(() => {
        setOpen(false)
        resetState()
      }, 1500)
    } catch (err: any) {
      console.error("Lỗi khi import:", err)
      setError(err.message || 'Đã có lỗi xảy ra khi tải lên.')
    } finally {
      setLoading(false)
    }
  }

  const resetState = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    setSuccess(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const downloadSample = () => {
    const link = document.createElement('a')
    link.href = '/src/components/email-templates/email-templates-sample.json' // This won't work directly in prod usually, but for local/nextjs public is better
    // Actually better to just provide the content as a blob
    const sampleData = [
      {
        "title": "Mẫu Tiêu Đề",
        "subject": "Tiêu đề Email",
        "body": "Nội dung email chi tiết...",
        "recipient_type": "supplier",
        "stage": "Sourcing",
        "tags": ["tag1", "tag2"]
      }
    ]
    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = 'email-templates-sample.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v)
      if (!v) resetState()
    }}>
      <DialogTrigger
        render={
          <Button variant="outline" className="rounded-xl border-slate-200 gap-2 h-10 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
            <FileJson className="h-4 w-4" />
            Tải lên JSON
          </Button>
        }
      />
      <DialogContent className="max-w-xl rounded-[2.5rem] border-none glass-premium p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
              <Upload className="h-5 w-5" />
            </div>
            Import Email Mẫu
          </DialogTitle>
          <p className="text-slate-500 text-sm font-medium mt-2">Tải tệp tin JSON của bạn lên để thêm hàng loạt email mẫu.</p>
        </DialogHeader>

        <div className="px-8 pb-8 space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-[2rem] p-12 text-center transition-all cursor-pointer group",
              file ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"
            )}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".json" 
              className="hidden" 
            />
            {file ? (
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-white text-emerald-500 flex items-center justify-center mx-auto shadow-sm">
                  <FileJson className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{file.name}</p>
                  <p className="text-slate-400 text-xs mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-white text-slate-300 flex items-center justify-center mx-auto shadow-sm group-hover:text-primary transition-colors">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-500 group-hover:text-slate-700">Nhấn để chọn hoặc kéo thả tệp JSON</p>
                  <p className="text-slate-400 text-xs mt-1">Hỗ trợ tệp định dạng .json theo cấu trúc chuẩn</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 text-red-600 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-xs font-bold leading-relaxed">{error}</p>
            </div>
          )}

          {preview && preview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Xem trước ({preview.length} mẫu)</h4>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {preview.slice(0, 5).map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/60 border border-white/40 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-sm leading-none">{item.title}</p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-tighter shrink-0 bg-slate-100 rounded-full px-2 py-0.5 w-fit">
                        {item.recipient_type === 'supplier' ? 'Nhà cung cấp' : item.recipient_type === 'internal' ? 'Nội bộ' : 'Cả hai'}
                      </p>
                    </div>
                  </div>
                ))}
                {preview.length > 5 && (
                  <p className="text-center text-[10px] text-slate-400 font-black italic">... và {preview.length - 5} mẫu khác</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 gap-4">
            <Button 
              variant="ghost" 
              onClick={downloadSample}
              className="rounded-xl text-slate-500 hover:text-primary gap-2 h-10 font-bold text-[10px] uppercase tracking-widest px-4 shrink-0 transition-all active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              Tải mẫu chuẩn
            </Button>

            <Button 
              onClick={handleImport}
              disabled={!preview || loading || success}
              className={cn(
                "flex-1 rounded-2xl h-12 font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95",
                success ? "bg-emerald-500 hover:bg-emerald-600" : "bg-primary hover:bg-primary-dark"
              )}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : success ? (
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  Đã tải lên thành công
                </div>
              ) : (
                'Bắt đầu tải lên'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
