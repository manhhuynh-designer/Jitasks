import { Metadata } from 'next'
import EmailTemplatesClient from './email-templates-client'

export const metadata: Metadata = {
  title: 'Mẫu Email',
  description: 'Cấu hình các mẫu email thông báo'
}

export default function Page() {
  return <EmailTemplatesClient />
}
