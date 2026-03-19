'use client'

import { useSearchParams } from 'next/navigation'
import { useProjects } from '@/hooks/use-projects'
import { useTasks } from '@/hooks/use-tasks'
import { ProjectCard } from '@/components/projects/project-card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NewProjectDialog } from '@/components/projects/new-project-dialog'

export default function ProjectsPage() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const { projects, loading, refresh } = useProjects(status || undefined)
  const { tasks } = useTasks()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Projects: {status || 'All'}
          </h2>
          <p className="text-slate-500 text-sm">
            List of projects đang ở trang thai {status || 'hệ thống'}.
          </p>
        </div>
        <NewProjectDialog onProjectCreated={refresh} />
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
            {projects.map(project => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                tasks={tasks}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400">No projects found ở trang thai này.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
