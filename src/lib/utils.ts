import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCategoryColorStyles(color: string) {
  const isHex = color?.startsWith('#')
  return {
    className: isHex ? "" : (color || 'bg-slate-500'),
    style: isHex ? { backgroundColor: color } : {}
  }
}
