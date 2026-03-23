import { Metadata } from 'next'
import SettingsClient from './settings-client'

export const metadata: Metadata = {
  title: 'Cài đặt',
  description: 'Cài đặt hệ thống Jitasks'
}

export default function Page() {
  return <SettingsClient />
}
