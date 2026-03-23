import { Metadata } from 'next'
import LoginClient from './login-client'

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập vào hệ thống Jitasks'
}

export default function Page() {
  return <LoginClient />
}
