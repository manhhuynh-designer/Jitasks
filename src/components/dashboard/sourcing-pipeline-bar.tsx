'use client'

import { useMemo, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { LABEL_XS } from '@/constants/ui-tokens'
import { Project } from '@/hooks/use-projects'

interface SourcingPipelineBarProps {
  projects: Project[]
  categories: Array<{ id: string; name: string; color: string }>
  onStageClick?: (status: string) => void
}

export function SourcingPipelineBar({ projects, categories, onStageClick }: SourcingPipelineBarProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const { segments, total } = useMemo(() => {
    // Determine stages from categories table
    const stages = categories.map(c => c.name)

    const counts = stages.map(s => ({
      status: s,
      count: projects.filter(p => p.status === s && !p.deleted_at).length
    }))

    const total = counts.reduce((sum, s) => sum + s.count, 0)
    
    const segments = counts.map(s => {
      const percentage = total > 0 ? (s.count / total) * 100 : 0
      // If count > 0 but percentage is very small, give it a minimum width of 4% for interactivity
      const displayWidth = s.count > 0 ? Math.max(percentage, 4) : 0
      return {
        ...s,
        percentage,
        displayWidth
      }
    })

    return { segments, total }
  }, [projects, categories])

  if (total === 0) return null

  // Helper to get color class from category name
  const getStageColor = (status: string) => {
    const cat = categories.find(c => c.name === status)
    return cat?.color || 'bg-slate-300'
  }

  // Helper to get text color from bg color class
  const getStageTextColor = (bg: string) => {
    if (bg.includes('blue')) return 'text-blue-600'
    if (bg.includes('emerald')) return 'text-emerald-600'
    if (bg.includes('amber')) return 'text-amber-600'
    if (bg.includes('violet')) return 'text-violet-600'
    if (bg.includes('rose')) return 'text-rose-600'
    return 'text-slate-500'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-baseline gap-2">
          <span className={LABEL_XS}>Pipeline Sản Phẩm</span>
          <span className="text-slate-500 text-sm font-black">{total} projects</span>
        </div>
      </div>

      <div className="h-12 w-full rounded-2xl overflow-hidden flex bg-slate-100 shadow-inner">
        {segments.map((seg) => {
          const bgColor = getStageColor(seg.status)
          return (
            <div 
              key={seg.status}
              onClick={() => onStageClick?.(seg.status)}
              className={cn(
                "h-full inline-flex items-center justify-center transition-all duration-700 cursor-pointer overflow-hidden border-r border-white/10 last:border-none hover:brightness-110 active:scale-[0.98]",
                bgColor
              )}
              style={{ width: mounted ? `${seg.displayWidth}%` : '0%' }}
            >
              {seg.percentage >= 8 && (
                <span className="text-white text-[10px] font-black truncate px-2 drop-shadow-sm">
                  {seg.status} ({seg.count})
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-4 px-2">
        {segments.map((seg) => {
          const bgColor = getStageColor(seg.status)
          const textColor = getStageTextColor(bgColor)
          return (
            <div 
              key={seg.status} 
              onClick={() => onStageClick?.(seg.status)}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className={cn("h-2.5 w-2.5 rounded-full", bgColor, "group-hover:scale-125 transition-transform")} />
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", textColor)}>
                {seg.status} <span className="text-slate-300 ml-1">{seg.count}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
