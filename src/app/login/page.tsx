'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[2.5rem] border-none glass-premium p-8 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-xl">
              J
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Project Manager</h1>
          <p className="text-muted-foreground font-medium leading-relaxed">
            Login để quản lý task và project của bạn
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="rounded-2xl bg-red-50/50 border border-red-100 p-4 text-sm text-red-500 animate-in slide-in-from-top-2">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="name@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              className="rounded-2xl h-12 bg-white/50 border-none focus-visible:ring-primary/20 font-medium px-4 shadow-sm"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Mật khẩu (Password)</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              className="rounded-2xl h-12 bg-white/50 border-none focus-visible:ring-primary/20 font-medium px-4 shadow-sm"
            />
          </div>
          
          <Button className="w-full rounded-2xl h-14 font-black text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary hover:bg-primary/90 text-white" type="submit" disabled={loading}>
            {loading ? 'Đang xác thực...' : 'Login ngay'}
          </Button>
        </form>
        
        <div className="pt-4 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Contact admin if you forgot your credentials
          </p>
        </div>
      </div>
    </div>
  )
}
