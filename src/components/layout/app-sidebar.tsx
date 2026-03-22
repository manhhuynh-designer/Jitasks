'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Building2,
  Settings,
  LogOut,
  Plus,
  Mail,
  ListTree,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { NewSupplierDialog } from '@/components/suppliers/new-supplier-dialog'
import { NewTemplateDialog } from '@/components/templates/new-template-dialog'
import { NewAssigneeDialog } from '@/components/assignees/new-assignee-dialog'

export function AppSidebar() {
  const router = useRouter()
  const [categories, setCategories] = React.useState<{name: string, id: string, color: string}[]>([])
  const [isProjectsOpen, setIsProjectsOpen] = React.useState(true)

  const fetchCategories = React.useCallback(async () => {
    const { data } = await supabase
      .from('project_categories')
      .select('id, name, color')
      .order('order_index', { ascending: true })
    if (data) setCategories(data)
  }, [])

  React.useEffect(() => {
    fetchCategories()

    const channel = supabase
      .channel('sidebar-categories')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_categories' },
        () => {
          console.log('Categories changed, refreshing sidebar...')
          fetchCategories()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchCategories])

  const navigationItems = [
    {
      title: 'Dashboard',
      url: '/',
      icon: LayoutDashboard,
    },
    {
      title: 'Dự án',
      url: '#',
      icon: ClipboardList,
      items: categories.length > 0 ? categories.map(c => ({
        title: c.name,
        url: `/projects?status=${c.name}`,
        color: c.color
      })) : [
        { title: 'Sourcing', url: '/projects?status=Sourcing', color: 'bg-slate-300' },
        { title: 'Listing', url: '/projects?status=Listing', color: 'bg-slate-300' },
        { title: 'Tracking', url: '/projects?status=Tracking', color: 'bg-slate-300' },
        { title: 'Archive', url: '/projects?status=Archive', color: 'bg-slate-300' },
      ]
    },
    {
      title: 'Quản lý Template',
      url: '/categories',
      icon: Settings,
      action: <NewTemplateDialog trigger={
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
          <Plus className="h-4 w-4" />
        </Button>
      } />
    },
    {
      title: 'Nhà cung cấp',
      url: '/suppliers',
      icon: Building2,
      action: <NewSupplierDialog trigger={
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
          <Plus className="h-4 w-4" />
        </Button>
      } />
    },
    {
      title: 'Nhân sự (Assignee)',
      url: '/assignees',
      icon: Users,
      action: <NewAssigneeDialog trigger={
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
          <Plus className="h-4 w-4" />
        </Button>
      } />
    },
    {
      title: 'Email Mẫu',
      url: '/email-templates',
      icon: Mail,
    },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <Sidebar className="border-none bg-transparent">
      <SidebarHeader className="glass-premium m-4 rounded-2xl px-4 py-4">
        <div className="flex items-center gap-2 font-bold text-xl">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            J
          </div>
          <span>Jitasks</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-4 py-4 space-y-2">
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.items ? (
                <>
                  <SidebarMenuButton 
                    tooltip={item.title}
                    onClick={() => {
                      if (item.title === 'Dự án') {
                        setIsProjectsOpen(!isProjectsOpen)
                      }
                    }}
                    className="rounded-xl hover:bg-white/90 transition-all duration-300 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-primary" />
                      <span className="font-medium">{item.title}</span>
                    </div>
                    {item.title === 'Dự án' && (
                      <div className="flex items-center gap-1 mr-[-4px]">
                        <Link 
                          href="/settings/categories" 
                          onClick={(e) => e.stopPropagation()} 
                          className="p-1.5 hover:bg-primary/10 rounded-lg group/gear transition-all"
                        >
                          <Settings className="h-3.5 w-3.5 text-slate-400 group-hover/gear:text-primary transition-colors" />
                        </Link>
                        {isProjectsOpen ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                      </div>
                    )}
                  </SidebarMenuButton>
                  <div className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    item.title === 'Dự án' && !isProjectsOpen ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
                  )}>
                    <SidebarMenuSub className="border-primary/10 ml-6 mt-1">
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton 
                            render={<Link href={subItem.url} />}
                            className="rounded-lg text-xs hover:text-primary transition-colors flex items-center gap-2 group/subitem"
                          >
                            <div className={cn("w-1.5 h-1.5 rounded-full transition-all group-hover/subitem:scale-125", subItem.color)} />
                            {subItem.title}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </div>
                </>
              ) : (
                <div className="flex items-center group/menu-item gap-1">
                  <SidebarMenuButton 
                    render={<Link href={item.url} />} 
                    tooltip={item.title}
                    className="rounded-xl flex-1 hover:bg-white/90 transition-all duration-300"
                  >
                    <item.icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{item.title}</span>
                  </SidebarMenuButton>
                  {item.action && (
                    <div className="opacity-0 group-hover/menu-item:opacity-100 transition-opacity">
                      {item.action}
                    </div>
                  )}
                </div>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="rounded-xl bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium">Đăng xuất</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
