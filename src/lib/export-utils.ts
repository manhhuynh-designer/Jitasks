import { supabase } from './supabase'

/**
 * Xuất dữ liệu của một hoặc nhiều dự án ra file JSON.
 * Dữ liệu được cấu trúc lồng ghép để hỗ trợ LLM phân tích tốt nhất.
 */
export async function exportProjectsToJSON(projectIds: string[]) {
  if (!projectIds || projectIds.length === 0) return

  try {
    // 1. Fetch thông tin Project & Nhà cung cấp
    const { data: projects, error: pError } = await supabase
      .from('projects')
      .select('*, suppliers(name)')
      .in('id', projectIds)
      .is('deleted_at', null)

    if (pError) throw pError
    if (!projects || projects.length === 0) {
      alert('Không tìm thấy dữ liệu dự án hợp lệ để xuất.')
      return
    }

    // 2. Fetch tất cả dữ liệu liên quan song song để tối ưu hiệu suất
    const [tasksRes, groupsRes, docsRes, catsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, assignees(full_name), project_categories(name), task_groups(name)')
        .in('project_id', projectIds)
        .is('deleted_at', null),
      supabase
        .from('task_groups')
        .select('*')
        .in('project_id', projectIds)
        .is('deleted_at', null),
      supabase
        .from('project_documents')
        .select('*')
        .in('project_id', projectIds)
        .is('deleted_at', null),
      supabase
        .from('project_categories')
        .select('*')
        .order('order_index', { ascending: true })
    ])

    const tasks = tasksRes.data || []
    const groups = groupsRes.data || []
    const documents = docsRes.data || []
    const categories = catsRes.data || []

    // 3. Xây dựng cấu trúc lồng ghép (Nested Structure)
    const exportData = projects.map(project => {
      // Lấy các categories thực tế được sử dụng trong project này
      const projectTaskCatIds = new Set(tasks.filter(t => t.project_id === project.id).map(t => t.category_id))
      const projectGroupCatIds = new Set(groups.filter(g => g.project_id === project.id).map(g => g.category_id))
      const combinedCatIds = new Set([...Array.from(projectTaskCatIds), ...Array.from(projectGroupCatIds)])
      
      // Nếu không có category nào được dùng rõ ràng, mặc định lấy category đầu tiên nếu có tasks
      if (combinedCatIds.size === 0 && tasks.some(t => t.project_id === project.id)) {
        if (categories.length > 0) combinedCatIds.add(categories[0].id)
      }

      const projectStages = categories
        .filter(cat => combinedCatIds.has(cat.id))
        .map(cat => {
          // Lấy các nhóm trong giai đoạn này
          const catGroups = groups
            .filter(g => g.project_id === project.id && g.category_id === cat.id)
            .map(group => ({
              group_name: group.name,
              timeline: {
                start: group.start_date,
                end: group.deadline
              },
              tasks: tasks
                .filter(t => t.project_id === project.id && t.task_group_id === group.id)
                .map(t => ({
                  task_name: t.name,
                  status: t.status,
                  priority: t.priority,
                  assignee: t.assignees?.full_name || 'Chưa phân công',
                  timeline: {
                    start: t.start_date,
                    end: t.deadline
                  },
                  description: t.description
                }))
            }))

          // Lấy các task chưa phân nhóm trong giai đoạn này
          const ungroupedTasks = tasks
            .filter(t => t.project_id === project.id && t.category_id === cat.id && !t.task_group_id)
            .map(t => ({
              task_name: t.name,
              status: t.status,
              priority: t.priority,
              assignee: t.assignees?.full_name || 'Chưa phân công',
              timeline: {
                start: t.start_date,
                end: t.deadline
              },
              description: t.description
            }))

          return {
            stage_name: cat.name,
            groups: catGroups,
            ungrouped_tasks: ungroupedTasks
          }
        })

      return {
        project_info: {
          id: project.id,
          name: project.name,
          current_status: project.status,
          description: project.description,
          supplier: project.suppliers?.name || 'Chưa xác định',
          created_at: project.created_at
        },
        project_roadmap: projectStages,
        project_documents: documents
          .filter(d => d.project_id === project.id)
          .map(d => ({
            title: d.title,
            type: d.type,
            content: d.content,
            url: d.url,
            file_info: d.file_name ? {
              name: d.file_name,
              size: d.file_size,
              mime: d.mime_type
            } : null
          }))
      }
    })

    // 4. Tạo và tải file JSON
    const dataString = JSON.stringify(projectIds.length === 1 ? exportData[0] : exportData, null, 2)
    const blob = new Blob([dataString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const fileName = projectIds.length === 1 
      ? `jitasks-project-${projects[0].name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${timestamp}.json`
      : `jitasks-projects-bulk-export-${timestamp}.json`
      
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

  } catch (err: any) {
    console.error('Export error:', err)
    alert(`Lỗi khi xuất dữ liệu: ${err.message || 'Đã có lỗi xảy ra'}`)
  }
}
