'use client'

import { useProjectDocumentsContext } from '@/components/projects/project-documents/context'

export interface ProjectDocument {
  id: string
  project_id: string
  user_id: string
  title: string
  content?: string
  type: 'note' | 'link' | 'file' | 'image'
  url?: string
  file_name?: string
  file_size?: number
  mime_type?: string
  created_at: string
}

/**
 * Custom hook to access project documents.
 * Now wraps the Context-based state for synchronization across all components.
 */
export function useProjectDocuments(projectId?: string) {
  // We ignore projectId here as the Provider already has it,
  // but keep the signature for backward compatibility.
  return useProjectDocumentsContext()
}
