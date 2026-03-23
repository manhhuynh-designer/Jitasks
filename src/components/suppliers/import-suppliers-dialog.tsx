'use client'

import { useState, useRef } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Upload, FileJson, AlertCircle, Check, Download, Loader2, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface ImportSuppliersDialogProps {
  onImported: () => void
}

export function ImportSuppliersDialog({ onImported }: ImportSuppliersDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/json' && !selectedFile.name.endsWith('.json')) {
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
            // Basic validation: name is required
            const isValid = json.every(item => item.name)
            if (!isValid) {
              setError('Dữ liệu JSON không đúng định dạng. Cần có trường "name" cho mỗi nhà cung cấp.')
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
      const { error: insertError } = await supabase
        .from('suppliers')
        .insert(preview.map(s => ({
          name: s.name,
          contact_info: s.contact_info || null,
          address: s.address || null,
          tax_code: s.tax_code || null,
          notes: s.notes || null
        })))

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
    const sampleData = [
      {
        "name": "Công ty TNHH MTV A",
        "contact_info": "0901 234 567 - Anh Bình",
        "address": "123 Đường ABC, Quận 1, TP.HCM",
        "tax_code": "0101234567",
        "notes": "Nhà cung cấp vật liệu xây dựng uy tín"
      },
      {
        "name": "Đại lý Nội thất B",
        "contact_info": "daily-b@email.com",
        "address": "456 Đường XYZ, Đà Nẵng",
        "tax_code": "0307654321",
        "notes": "Chuyên bàn ghế văn phòng"
      }
    ]
    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'suppliers-sample.json'
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
          <Button variant="outline" className="rounded-2xl border-slate-200 gap-2 h-14 px-6 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 shadow-sm transition-all active:scale-95">
            <FileJson className="h-4 w-4 text-primary" />
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
            Import Nhà Cung Cấp
          </DialogTitle>
          <p className="text-slate-500 text-sm font-medium mt-2">Tải tệp tin JSON của bạn lên để thêm hàng loạt đối tác cung ứng.</p>
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
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Xem trước ({preview.length} NCC)</h4>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {preview.slice(0, 5).map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/60 border border-white/40 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm shrink-0">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm leading-none truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                          {item.contact_info || 'Không có liên hệ'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {preview.length > 5 && (
                  <p className="text-center text-[10px] text-slate-400 font-black italic">... và {preview.length - 5} đối tác khác</p>
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
                success ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
              )}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              ) : success ? (
                <div className="flex items-center justify-center gap-2">
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
