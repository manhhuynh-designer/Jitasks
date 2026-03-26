'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProjectDocuments, ProjectDocument } from '@/hooks/use-project-documents'
import { Search, Trash2, Loader2, X, Maximize2, FileText, File, Copy, Download, Link as LinkIcon, ExternalLink } from 'lucide-react'
import { DocumentItem } from '@/components/projects/project-documents/document-item'
import { RichTextEditor } from './editor'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export function DocumentDialog({
  projectId,
  isOpen,
  onOpenChange,
  initialDocId
}: {
  projectId: string,
  isOpen: boolean,
  onOpenChange: (open: boolean) => void,
  initialDocId?: string | null
}) {
  const { documents, loading, deleteDocument, updateDocument, getSignedUrl } = useProjectDocuments(projectId)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [selectedDoc, setSelectedDoc] = useState<ProjectDocument | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  // Edit states
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [updating, setUpdating] = useState(false)

  // Handle Initial Document Selection
  useEffect(() => {
    if (isOpen && initialDocId) {
      const doc = documents.find(d => d.id === initialDocId)
      if (doc) {
         setSelectedDoc(doc)
      }
    } else if (isOpen && !selectedDoc && documents.length > 0) {
      setSelectedDoc(documents[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialDocId, documents.length])

  // Sync edit states
  useEffect(() => {
    if (selectedDoc) {
      setEditTitle(selectedDoc.title || '')
      setEditContent(selectedDoc.content || '')
      setEditUrl(selectedDoc.url || '')
    }
  }, [selectedDoc])

  // Fetch Signed URL when selection changes
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (selectedDoc && (selectedDoc.type === 'file' || selectedDoc.type === 'image') && selectedDoc.url) {
        try {
          const url = await getSignedUrl(selectedDoc.url)
          setSignedUrl(url)
        } catch (error) {
          console.error('Error fetching signed URL:', error)
          setSignedUrl(null)
        }
      } else {
        setSignedUrl(null)
      }
    }
    fetchSignedUrl()
  }, [selectedDoc, getSignedUrl])

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = activeFilter === 'all' || doc.type === activeFilter
    return matchesSearch && matchesFilter
  })

  const hasChanges = selectedDoc && (
    editTitle !== (selectedDoc.title || '') ||
    editContent !== (selectedDoc.content || '') ||
    (selectedDoc.type === 'link' && editUrl !== (selectedDoc.url || ''))
  )

  const handleUpdate = async () => {
    if (!selectedDoc || !hasChanges) return
    setUpdating(true)
    try {
      await updateDocument(selectedDoc.id, {
        title: editTitle,
        content: editContent,
        url: selectedDoc.type === 'link' ? editUrl : selectedDoc.url
      })
      alert('Đã cập nhật thay đổi thành công')
    } catch (error: any) {
      alert('Lỗi cập nhật: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, doc: ProjectDocument) => {
    e.stopPropagation()
    if (confirm(`Bạn có chắc muốn xóa "${doc.title}"?`)) {
      try {
        await deleteDocument(doc)
        if (selectedDoc?.id === doc.id) setSelectedDoc(null)
      } catch (error: any) {
        alert('Lỗi khi xóa: ' + error.message)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[1240px] h-[90vh] flex flex-col p-0 gap-0 bg-white border border-slate-200 shadow-2xl rounded-[2.5rem] overflow-hidden">
        {/* Header Area */}
        <div className="px-10 py-8 border-b border-slate-100 bg-white shrink-0">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">TÀI LIỆU DỰ ÁN</DialogTitle>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Dự án hiện có {documents.length} tài liệu
              </p>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 p-1 bg-slate-100/50 rounded-xl">
                {['all', 'file', 'image', 'note'].map(item => (
                  <Button
                    key={item}
                    variant={activeFilter === item ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveFilter(item)}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-widest h-8 rounded-lg px-4 transition-all",
                      activeFilter === item
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200 hover:bg-white"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {item === 'all' ? 'Tất cả' : item === 'file' ? 'Tệp tin' : item === 'image' ? 'Ảnh' : 'Ghi chú'}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full h-10 w-10 hover:bg-slate-100 transition-all">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-[280px_1fr] h-full">
            {/* Left Side: Minimalist Document List */}
            <div className="border-r border-slate-100 flex flex-col bg-slate-50/30 overflow-hidden">
               <div className="p-6 pb-4">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-all" />
                    <Input
                      placeholder="Tìm kiếm tài liệu..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-11 h-11 rounded-xl bg-white border-slate-100 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all font-bold text-slate-600 text-sm"
                    />
                  </div>
               </div>
              <ScrollArea className="flex-1 px-4 pb-10 custom-scrollbar">
                <div className="space-y-1">
                  {loading ? (
                    <div className="p-8 text-center space-y-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Đang tải...</p>
                    </div>
                  ) : filteredDocs.length === 0 ? (
                    <div className="p-8 text-center bg-white/50 rounded-2xl border border-dashed border-slate-100 mx-2">
                       <FileText className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                       <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Trống</p>
                    </div>
                  ) : (
                    filteredDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className={cn(
                          "group/doc relative rounded-xl transition-all cursor-pointer border border-transparent mb-1",
                          selectedDoc?.id === doc.id 
                            ? "bg-white border-slate-200 shadow-sm" 
                            : "hover:bg-white/60"
                        )}
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <DocumentItem
                          doc={doc}
                          size="sm"
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right Side: Primary Preview & Editor Area */}
            <div className="flex flex-col overflow-hidden bg-white">
              {selectedDoc ? (
                <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500">
                  {/* Preview Header / Title Editor */}
                  <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex-1 min-w-0">
                      {(selectedDoc.type === 'note' || selectedDoc.type === 'link') ? (
                        <input
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full text-xl font-black text-slate-900 tracking-tight flex-1 bg-transparent border-none focus:ring-0 p-0 placeholder:text-slate-300"
                          placeholder="Tiêu đề tài liệu..."
                        />
                      ) : (
                        <h3 className="text-xl font-black text-slate-900 tracking-tight truncate pr-4">{selectedDoc.title}</h3>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                       <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl border border-transparent hover:border-rose-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                          onClick={(e) => handleDelete(e, selectedDoc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  </div>

                  {/* Main content area */}
                  <div className="flex-1 relative bg-slate-50/30 overflow-hidden group/preview">
                    {selectedDoc.type === 'image' && (signedUrl || selectedDoc.url?.startsWith('http')) ? (
                      <div className="w-full h-full p-10 flex items-center justify-center">
                        <img
                          src={signedUrl || selectedDoc.url}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl shadow-slate-200/50"
                          alt={selectedDoc.title}
                        />
                      </div>
                    ) : (selectedDoc.type === 'file' || selectedDoc.type === 'image') && !signedUrl ? (
                      <div className="w-full h-full flex flex-col items-center justify-center space-y-4 bg-white">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Đang chuẩn bị nội dung...</p>
                      </div>
                    ) : selectedDoc.type === 'file' && (selectedDoc.url?.toLowerCase().endsWith('.pdf')) ? (
                      <iframe 
                        src={`${signedUrl}#toolbar=0&navpanes=0`} 
                        className="w-full h-full border-none bg-slate-100"
                        title="PDF Preview"
                      />
                    ) : selectedDoc.type === 'file' && (
                        selectedDoc.url?.toLowerCase().endsWith('.xlsx') || 
                        selectedDoc.url?.toLowerCase().endsWith('.xls') || 
                        selectedDoc.url?.toLowerCase().endsWith('.docx') ||
                        selectedDoc.url?.toLowerCase().endsWith('.doc')
                    ) ? (
                      <div className="w-full h-full bg-white">
                         <iframe 
                          src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(signedUrl || '')}`} 
                          className="w-full h-full border-none"
                          title="Office Preview"
                        />
                      </div>
                    ) : selectedDoc.type === 'note' ? (
                      <div className="w-full h-full p-8 lg:p-12 overflow-y-auto bg-white custom-scrollbar">
                         <div className="max-w-4xl mx-auto h-full">
                            <RichTextEditor 
                              content={editContent}
                              onChange={setEditContent}
                              placeholder="Bắt đầu nhập nội dung ghi chú của bạn tại đây..."
                            />
                         </div>
                      </div>
                    ) : selectedDoc.type === 'link' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-20 space-y-10">
                         <div className="h-24 w-24 rounded-[2.5rem] bg-blue-50 text-blue-500 flex items-center justify-center mx-auto border border-blue-100 mb-2">
                           <LinkIcon className="h-10 w-10" />
                         </div>
                         <div className="w-full max-w-xl space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Đường dẫn liên kết</label>
                            <Input 
                              value={editUrl}
                              onChange={e => setEditUrl(e.target.value)}
                              className="h-14 rounded-2xl bg-white border-slate-100 shadow-sm text-blue-600 font-bold px-6"
                              placeholder="https://..."
                            />
                         </div>
                         <Button 
                           variant="outline" 
                           className="rounded-xl border-slate-100 h-10 px-6 font-bold text-slate-400 hover:text-slate-900 group"
                           onClick={() => window.open(editUrl, '_blank')}
                         >
                            Kiểm tra link
                            <ExternalLink className="ml-2 h-4 w-4 opacity-40 group-hover:opacity-100" />
                         </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full space-y-6">
                        <div className="h-32 w-32 rounded-[3.5rem] bg-white flex items-center justify-center mx-auto border border-slate-100 shadow-sm">
                          <File className="h-16 w-16 text-slate-100" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Định dạng {selectedDoc.url?.split('.').pop()?.toUpperCase()} không hỗ trợ xem trực tiếp</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="px-10 py-6 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
                    <div className="flex items-center gap-8">
                        <div className="flex flex-col gap-1">
                           <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Kích thước tệp</span>
                           <span className="text-[12px] font-black text-slate-700">{selectedDoc.file_size ? `${(selectedDoc.file_size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                           <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Ngày cập nhật</span>
                           <span className="text-[12px] font-black text-slate-700">{format(new Date(selectedDoc.created_at), 'dd/MM/yyyy')}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {hasChanges && (
                        <Button
                          className="rounded-2xl font-black uppercase tracking-widest h-14 px-10 bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-[11px] hover:bg-emerald-600 animate-in zoom-in-95"
                          onClick={handleUpdate}
                          disabled={updating}
                        >
                          {updating ? <Loader2 className="h-4 w-4 animate-spin mr-3" /> : null}
                          Lưu thay đổi
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        className="rounded-2xl font-black uppercase tracking-widest h-14 px-8 border border-slate-100 text-slate-500 hover:bg-slate-50 transition-all text-[11px]"
                        onClick={() => {
                          if (selectedDoc.type === 'note' || selectedDoc.type === 'link') {
                            const text = selectedDoc.type === 'note' ? (editContent || '') : (editUrl || '')
                            // Stripping HTML for note copy if needed, but keeping it simple for now
                            navigator.clipboard.writeText(text.replace(/<[^>]*>?/gm, ''))
                            alert('Đã sao chép nội dung')
                          } else if (signedUrl) {
                            const link = document.createElement('a');
                            link.href = signedUrl;
                            link.download = selectedDoc.title;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }
                        }}
                      >
                         {selectedDoc.type === 'note' ? <Copy className="h-4 w-4 mr-3" /> : <Download className="h-4 w-4 mr-3" />}
                         {selectedDoc.type === 'note' ? 'Sao chép nội dung' : 'Tải xuống tệp'}
                      </Button>

                      {(selectedDoc.type === 'file' || selectedDoc.type === 'image' || selectedDoc.type === 'link') && (
                        <Button
                          className="rounded-2xl font-black uppercase tracking-widest h-14 px-10 bg-slate-900 text-white shadow-xl shadow-slate-900/10 active:scale-95 transition-all text-[11px]"
                          onClick={() => {
                            const targetUrl = selectedDoc.type === 'link' ? editUrl : signedUrl
                             if (targetUrl) window.open(targetUrl, '_blank')
                             else if (selectedDoc.url?.startsWith('http')) window.open(selectedDoc.url, '_blank')
                          }}
                        >
                          Xem bản gốc
                          <Maximize2 className="h-4 w-4 ml-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
                  <div className="h-24 w-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center mx-auto border border-slate-100 mb-8">
                    <FileText className="h-10 w-10 text-slate-200" />
                  </div>
                  <h4 className="text-xl font-black text-slate-300 uppercase tracking-tighter mb-2">Chọn tài liệu để xem</h4>
                  <p className="text-sm font-bold text-slate-400 max-w-[280px] leading-relaxed">Nội dung tệp tin, hình ảnh hoặc ghi chú sẽ được hiển thị ngay tại đây.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
