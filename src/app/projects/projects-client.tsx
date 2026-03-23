import { Metadata } from 'next'
import ProjectsClient from './projects-client'

export const metadata: Metadata = {
  title: 'Danh sách dự án',
  description: 'Quản lý toàn bộ dự án trong hệ thống'
}

export default function Page() {
  return <ProjectsClient />
}
