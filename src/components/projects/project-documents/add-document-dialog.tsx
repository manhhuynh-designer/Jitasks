'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProjectDocuments } from '@/hooks/use-project-documents'
import { FileText, Link as LinkIcon, Upload, Loader2, X } from 'lucide-react'

export function AddDocumentDialog({ 
  projectId, 
  isOpen, 
  onOpenChange 
}: { 
  projectId: string, 
  isOpen: boolean, 
  onOpenChange: (open: boolean) => void 
}) {
  const { addDocument, uploadFile } = useProjectDocuments(projectId)
  const [loading, setLoading] = useState(false)
  
  // Note State
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  
  // Link State
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  const handleAddNote = async () => {
    if (!noteTitle) return
    setLoading(true)
    try {
      await addDocument({
        title: noteTitle,
        content: noteContent,
        type: 'note'
      })
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      alert('Lỗi: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddLink = async () => {
    if (!linkTitle || !linkUrl) return
    setLoading(true)
    try {
      // Ensure URL has protocol
      let finalUrl = linkUrl
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl
      }
      
      await addDocument({
        title: linkTitle,
        url: finalUrl,
        type: 'link'
      })
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      alert('Lỗi: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoading(true)
    try {
      await uploadFile(file)
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      alert('Lỗi: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setNoteTitle('')
    setNoteContent('')
    setLinkTitle('')
    setLinkUrl('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[500px] bg-white border border-slate-200 shadow-lg rounded-[2.5rem] overflow-hidden p-0">
        <div className="p-8 pb-4">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-xl font-black uppercase tracking-widest text-slate-800">Thêm tài liệu mới</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full h-10 w-10 hover:bg-slate-100 active:scale-90 transition-all">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>
        </div>
        
        <Tabs defaultValue="file" className="w-full">
          <div className="px-8">
            <TabsList className="grid w-full grid-cols-3 bg-slate-100/50 p-1.5 rounded-2xl h-12">
              <TabsTrigger value="file" className="rounded-xl data-[state=active]:bg-white data-[state=active]:border-slate-200 data-[state=active]:border gap-2 text-[10px] font-black uppercase tracking-widest transition-all">
                <Upload className="h-3.5 w-3.5" /> File
              </TabsTrigger>
              <TabsTrigger value="link" className="rounded-xl data-[state=active]:bg-white data-[state=active]:border-slate-200 data-[state=active]:border gap-2 text-[10px] font-black uppercase tracking-widest transition-all">
                <LinkIcon className="h-3.5 w-3.5" /> Link
              </TabsTrigger>
              <TabsTrigger value="note" className="rounded-xl data-[state=active]:bg-white data-[state=active]:border-slate-200 data-[state=active]:border gap-2 text-[10px] font-black uppercase tracking-widest transition-all">
                <FileText className="h-3.5 w-3.5" /> Note
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-8 pt-2">
            <TabsContent value="file" className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] p-12 hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer relative overflow-hidden">
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                  onChange={handleFileUpload}
                  disabled={loading}
                />
                <div className="h-16 w-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-8 w-8 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm font-bold text-slate-600">Click hoặc kéo thả để upload</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-2 opacity-60">Dung lượng tối đa 25MB</p>
              </div>
              {loading && (
                <div className="flex items-center justify-center gap-3 py-2 animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Đang tải tệp lên...</span>
                </div>
              )}
            </TabsContent>

            <TabsContent value="link" className="space-y-5 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tiêu đề liên kết</Label>
                <Input 
                  placeholder="VD: Tài liệu kỹ thuật dự án" 
                  value={linkTitle}
                  onChange={e => setLinkTitle(e.target.value)}
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Đường dẫn (URL)</Label>
                <Input 
                  placeholder="https://..." 
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <Button 
                className="w-full rounded-2xl bg-primary text-white font-black uppercase tracking-widest h-14 shadow-xl shadow-primary/20 mt-6 active:scale-95 transition-all text-[12px]"
                onClick={handleAddLink}
                disabled={loading || !linkTitle || !linkUrl}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Lưu liên kết"}
              </Button>
            </TabsContent>

            <TabsContent value="note" className="space-y-5 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tiêu đề ghi chú</Label>
                <Input 
                  placeholder="VD: Lưu ý quan trọng..." 
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nội dung</Label>
                <Textarea 
                  placeholder="Nhập nội dung ghi chú tại đây..." 
                  rows={6}
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  className="rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-primary/20 transition-all font-medium resize-none p-4"
                />
              </div>
              <Button 
                className="w-full rounded-2xl bg-primary text-white font-black uppercase tracking-widest h-14 shadow-xl shadow-primary/20 mt-6 active:scale-95 transition-all text-[12px]"
                onClick={handleAddNote}
                disabled={loading || !noteTitle}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Lưu ghi chú"}
              </Button>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
