import { Metadata } from 'next'
import AssigneesClient from './assignees-client'

export const metadata: Metadata = {
  title: 'Người thực hiện',
  description: 'Quản lý nhân sự và người thực hiện công việc'
}

export default function Page() {
  return <AssigneesClient />
}
