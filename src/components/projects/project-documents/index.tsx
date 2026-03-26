'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, MoreHorizontal, Plus, Maximize2, ExternalLink, Link as LinkIcon, File, Image as ImageIcon } from 'lucide-react'
import { useProjectDocuments, ProjectDocument } from '@/hooks/use-project-documents'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { DocumentDialog } from '@/components/projects/project-documents/document-dialog'
import { AddDocumentDialog } from '@/components/projects/project-documents/add-document-dialog'
import { DocumentItem } from '@/components/projects/project-documents/document-item'

import { ProjectDocumentsProvider, useProjectDocumentsContext } from './context'

export function ProjectDocuments({ projectId }: { projectId: string }) {
  return (
    <ProjectDocumentsProvider projectId={projectId}>
      <ProjectDocumentsContent projectId={projectId} />
    </ProjectDocumentsProvider>
  )
}

function ProjectDocumentsContent({ projectId }: { projectId: string }) {
  const { documents, loading, getSignedUrl } = useProjectDocumentsContext()
  const [isFullViewOpen, setIsFullViewOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedInitialDocId, setSelectedInitialDocId] = useState<string | null>(null)

  const recentDocs = documents.slice(0, 3)

  return (
    <Card className="bg-white/40 backdrop-blur-xl border border-slate-200 shadow-sm overflow-hidden group">
      <CardHeader className="flex flex-row items-center justify-between py-4 px-5 border-b border-white/40 bg-white/20">
        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Project Documents
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-lg hover:bg-white/60"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-lg hover:bg-white/60"
            onClick={() => setIsFullViewOpen(true)}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-white/20">
          {loading && documents.length === 0 ? (
            <div className="p-8 text-center">
              <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Đang tải...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 opacity-60">Chưa có tài liệu nào</p>
              <Button 
                variant="link" 
                className="text-primary text-[10px] font-black uppercase tracking-widest p-0 h-auto mt-2 hove:no-underline"
                onClick={() => setIsAddOpen(true)}
              >
                Thêm ngay
              </Button>
            </div>
          ) : (
            recentDocs.map((doc) => (
              <DocumentItem 
                key={doc.id} 
                doc={doc} 
                size="sm" 
                onClick={() => {
                  setSelectedInitialDocId(doc.id)
                  setIsFullViewOpen(true)
                }} 
              />
            ))
          )}
        </div>
        
        {documents.length > 3 && (
          <Button 
            variant="ghost" 
            className="w-full rounded-none h-10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary hover:bg-white/40 border-t border-white/20"
            onClick={() => setIsFullViewOpen(true)}
          >
            Xem tất cả ({documents.length})
          </Button>
        )}
      </CardContent>

      <DocumentDialog 
        projectId={projectId} 
        isOpen={isFullViewOpen} 
        onOpenChange={(open) => {
          setIsFullViewOpen(open)
          if (!open) setSelectedInitialDocId(null)
        }} 
        initialDocId={selectedInitialDocId}
      />
      <AddDocumentDialog 
        projectId={projectId} 
        isOpen={isAddOpen} 
        onOpenChange={setIsAddOpen} 
      />
    </Card>
  )
}


