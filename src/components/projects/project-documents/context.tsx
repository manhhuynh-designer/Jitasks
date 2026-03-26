'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { ProjectDocument } from '@/hooks/use-project-documents'

interface ProjectDocumentsContextType {
  documents: ProjectDocument[]
  loading: boolean
  error: string | null
  addDocument: (doc: Partial<ProjectDocument>) => Promise<any>
  uploadFile: (file: File) => Promise<any>
  deleteDocument: (doc: ProjectDocument) => Promise<void>
  updateDocument: (id: string, data: Partial<ProjectDocument>) => Promise<void>
  getSignedUrl: (path: string, expiresIn?: number) => Promise<string>
  refresh: () => Promise<void>
}

const ProjectDocumentsContext = createContext<ProjectDocumentsContextType | undefined>(undefined)

export function ProjectDocumentsProvider({ 
  children, 
  projectId 
}: { 
  children: React.ReactNode, 
  projectId: string 
}) {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (err: any) {
      console.error('Error fetching documents:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchDocuments()

    const channel = supabase
      .channel(`project-documents-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_documents'
        },
        (payload) => {
          const newDoc = payload.new as any
          const oldDoc = payload.old as any
          
          if ((newDoc && newDoc.project_id === projectId) || 
              (oldDoc && oldDoc.project_id === projectId)) {
            fetchDocuments()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, fetchDocuments])

  const addDocument = async (doc: Partial<ProjectDocument>) => {
    if (!user) throw new Error('User not authenticated')
    
    const { user_id, ...documentData } = doc as any
    
    const { data, error } = await supabase
      .from('project_documents')
      .insert({ ...documentData, project_id: projectId })
      .select()
      .single()

    if (error) throw error
    fetchDocuments()
    return data
  }

  const uploadFile = async (file: File) => {
    if (!user) throw new Error('User not authenticated')
    if (file.size > 25 * 1024 * 1024) throw new Error('File size exceeds 25MB')

    const fileExt = file.name.split('.').pop()
    const uniqueId = Math.random().toString(36).substring(7)
    const fileName = `${projectId}/${Date.now()}-${uniqueId}.${fileExt}`
    const bucketName = 'Project file'

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const isImage = file.type.startsWith('image/')
    
    try {
      const result = await addDocument({
        title: file.name,
        type: isImage ? 'image' : 'file',
        url: fileName,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type
      })
      return result
    } catch (dbError) {
      await supabase.storage.from(bucketName).remove([fileName])
      throw dbError
    }
  }

  const deleteDocument = async (doc: ProjectDocument) => {
    if ((doc.type === 'file' || doc.type === 'image') && doc.url) {
      const { error: storageError } = await supabase.storage
        .from('Project file')
        .remove([doc.url])
      if (storageError) console.error('Error deleting storage file:', storageError)
    }

    const { error } = await supabase
      .from('project_documents')
      .delete()
      .eq('id', doc.id)

    if (error) throw error
    fetchDocuments()
  }

  const updateDocument = async (id: string, data: Partial<ProjectDocument>) => {
    const { error } = await supabase
      .from('project_documents')
      .update(data)
      .eq('id', id)

    if (error) throw error
    fetchDocuments()
  }

  const getSignedUrl = async (path: string, expiresIn: number = 60) => {
    if (!path || path.startsWith('http')) return path
    
    const { data, error } = await supabase.storage
      .from('Project file')
      .createSignedUrl(path, expiresIn)
    
    if (error) throw error
    return data.signedUrl
  }

  const value = {
    documents,
    loading,
    error,
    addDocument,
    uploadFile,
    deleteDocument,
    updateDocument,
    getSignedUrl,
    refresh: fetchDocuments
  }

  return (
    <ProjectDocumentsContext.Provider value={value}>
      {children}
    </ProjectDocumentsContext.Provider>
  )
}

export function useProjectDocumentsContext() {
  const context = useContext(ProjectDocumentsContext)
  if (context === undefined) {
    throw new Error('useProjectDocumentsContext must be used within a ProjectDocumentsProvider')
  }
  return context
}
