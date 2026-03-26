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
  status: 'todo' | 'inprogress' | 'pending' | 'done'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee_id: string | null
  category_id: string | null
  task_group_id: string | null
  task_time: number | null
  updated_at: string
  projects?: { name: string, status: string, color?: string }
  assignees?: { id: string, full_name: string }
  project_categories?: { name: string }
  task_groups?: { id: string, name: string, start_date?: string | null, deadline?: string | null } | null
}

export function useTasks(options: { projectId?: string, dueSoon?: boolean } = {}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = async () => {
    setLoading(true)
    let query = supabase
      .from('tasks')
      .select('*, projects(name, status), assignees(id, full_name), project_categories(name), task_groups(id, name)')
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
    const { data: cData } = await supabase.from('project_categories').select('name, color')

    if (!error && data) {
      const tasksWithColor = data.map(t => ({
        ...t,
        projects: t.projects ? {
          ...t.projects,
          color: cData?.find(c => c.name === t.projects?.status)?.color || 'bg-slate-500'
        } : undefined
      }))
      setTasks(tasksWithColor)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [options.projectId, options.dueSoon])

  return { tasks, loading, refresh: fetchTasks }
}
