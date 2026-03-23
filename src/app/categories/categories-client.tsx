import { Metadata } from 'next'
import CategoriesClient from './categories-client'

export const metadata: Metadata = {
  title: 'Giai đoạn',
  description: 'Quản lý các giai đoạn triển khai dự án'
}

export default function Page() {
  return <CategoriesClient />
}
