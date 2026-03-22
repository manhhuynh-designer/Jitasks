'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Project = {
  id: string
  name: string
  created_at: string
  supplier_id: string | null
  status: string
  color?: string
  color_code: string | null
  description: string | null
  deleted_at: string | null
  cover_url?: string | null
  suppliers?: { id: string, name: string }
  tasks?: Array<{ 
    id: string
    status: 'todo' | 'inprogress' | 'pending' | 'done'
    priority: 'low' | 'medium' | 'high' | 'critical'
    updated_at: string 
  }>
}

export function useProjects(statusFilter?: string) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = async () => {
    setLoading(true)
    let query = supabase
      .from('projects')
      .select('*, suppliers(id, name), tasks(id, status, priority, updated_at)')
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: pData, error } = await query
    const { data: cData } = await supabase.from('project_categories').select('name, color').order('order_index', { ascending: true })

    if (!error && pData) {
      const projectsWithColor = pData.map(p => ({
        ...p,
        color: cData?.find(c => c.name === p.status)?.color || 'bg-slate-500'
      }))
      setProjects(projectsWithColor)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProjects()
  }, [statusFilter])

  return { projects, loading, refresh: fetchProjects }
}
