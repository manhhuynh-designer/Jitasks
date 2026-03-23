'use client'

import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { useAuth } from '@/hooks/use-auth'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-jakarta'
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login')
    }
  }, [user, loading, pathname, router])

  const isLoginPage = pathname === '/login'

  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} font-sans`}>
        {loading && !isLoginPage ? (
          <div className="flex h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : isLoginPage ? (
          children
        ) : (
          <SidebarProvider>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 scroll-smooth snap-y snap-proximity">
                <div className="p-4 md:p-8">
                  <header className="mb-8 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                      <SidebarTrigger />
                      <h1 className="text-2xl font-semibold text-slate-900">
                        {pathname === '/' ? 'Dashboard' : 
                         pathname.includes('/projects/') ? 'Chi tiết dự án' : 
                         pathname.split('/').pop()}
                      </h1>
                    </div>
                  </header>
                  {children}
                </div>
              </main>
            </div>
          </SidebarProvider>
        )}
      </body>
    </html>
  )
}
