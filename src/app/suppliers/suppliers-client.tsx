import { Metadata } from 'next'
import SuppliersClient from './suppliers-client'

export const metadata: Metadata = {
  title: 'Nhà cung cấp',
  description: 'Quản lý danh sách nhà cung cấp dịch vụ'
}

export default function Page() {
  return <SuppliersClient />
}
