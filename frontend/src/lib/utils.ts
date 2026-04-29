import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

export function getCredibilityLevel(percent: number): string {
  if (percent >= 80) return 'high'
  if (percent >= 50) return 'medium'
  if (percent >= 25) return 'low'
  return 'uncertain'
}

export function getHotnessLevel(views: number): string {
  if (views >= 500000) return 'explosive'
  if (views >= 100000) return 'hot'
  if (views >= 50000) return 'warm'
  if (views >= 10000) return 'normal'
  return 'cold'
}
