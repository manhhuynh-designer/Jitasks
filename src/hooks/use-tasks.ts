'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Task = {
  id: string
  project_id: string
  name: string
  deadline: string
  start_date: string | null
  description: string | null
  links: { title: string, url: string }[] | null
  status: 'todo' | 'inprogress' | 'pending' | 'done'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee_id: string | null
  category_id: string | null
  projects?: { name: string }
  assignees?: { full_name: string }
}

export function useTasks(options: { projectId?: string, dueSoon?: boolean } = {}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = async () => {
    setLoading(true)
    let query = supabase
      .from('tasks')
      .select('*, projects(name), assignees(full_name)')
      .order('deadline', { ascending: true })

    if (options.projectId) {
      query = query.eq('project_id', options.projectId)
    }

    if (options.dueSoon) {
      const now = new Date().toISOString()
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      query = query.gte('deadline', now).lte('deadline', nextWeek.toISOString())
    }

    const { data, error } = await query
    if (!error && data) setTasks(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [options.projectId, options.dueSoon])

  return { tasks, loading, refresh: fetchTasks }
}
