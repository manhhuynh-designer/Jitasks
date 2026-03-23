import { Metadata } from 'next'
import TemplatesClient from './templates-client'

export const metadata: Metadata = {
  title: 'Mẫu dự án',
  description: 'Quản lý các mẫu dự án chuẩn'
}

export default function Page() {
  return <TemplatesClient />
}
