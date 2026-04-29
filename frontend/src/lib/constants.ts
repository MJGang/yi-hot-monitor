import { ShieldCheck, ShieldAlert, ShieldX, Shield, Flame, Thermometer, Zap, Leaf, Snowflake } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const credibilityLevels: Record<string, {
  label: string
  icon: typeof ShieldCheck
  color: string
  bg: string
  border: string
}> = {
  high: { label: '高度可信', icon: ShieldCheck, color: '#00B894', bg: 'rgba(0,184,148,0.15)', border: 'border border-success/30' },
  medium: { label: '中度可信', icon: ShieldAlert, color: '#FDCB6E', bg: 'rgba(253,203,110,0.15)', border: 'border border-warning/30' },
  low: { label: '低度可信', icon: ShieldX, color: '#E17055', bg: 'rgba(225,112,85,0.15)', border: 'border border-danger/30' },
  uncertain: { label: '待核实', icon: Shield, color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)', border: 'border border-gray-400/30' },
}

export interface HotnessLevelConfig {
  label: string
  icon: LucideIcon
  color: string
  bg: string
  border: string
  effect: { type: 'ice' | 'warm' | 'fire' | 'lightning' | 'none'; glowColor: string; particleColor: string }
}

export const hotnessLevels: Record<string, HotnessLevelConfig> = {
  cold: {
    label: '冷', icon: Snowflake, color: '#00D9FF', bg: 'rgba(0,217,255,0.08)', border: 'border border-cyan-400/30',
    effect: { type: 'ice', glowColor: 'rgba(0,217,255,0.5)', particleColor: 'rgba(0,217,255,0.8)' },
  },
  normal: {
    label: '一般', icon: Leaf, color: '#A0AEC0', bg: 'rgba(160,174,192,0.1)', border: 'border border-gray-400/30',
    effect: { type: 'none', glowColor: 'transparent', particleColor: '' },
  },
  warm: {
    label: '暖', icon: Zap, color: '#FFB432', bg: 'rgba(255,180,50,0.1)', border: 'border border-amber-400/30',
    effect: { type: 'warm', glowColor: 'rgba(255,180,50,0.4)', particleColor: 'rgba(255,200,100,0.7)' },
  },
  hot: {
    label: '热', icon: Thermometer, color: '#FF5722', bg: 'rgba(255,87,34,0.12)', border: 'border border-orange-500/30',
    effect: { type: 'fire', glowColor: 'rgba(255,80,0,0.6)', particleColor: 'rgba(255,200,50,1)' },
  },
  explosive: {
    label: '爆', icon: Flame, color: '#F0ABFC', bg: 'rgba(240,171,252,0.08)', border: 'border border-fuchsia-400/30',
    effect: { type: 'lightning', glowColor: 'rgba(240,171,252,0.6)', particleColor: 'rgba(255,255,255,0.9)' },
  },
}

export const avatarColors: Record<string, string> = {
  OA: 'linear-gradient(135deg, #1DA1F2, #0d8ed9)',
  An: 'linear-gradient(135deg, #FF6B6B, #EE5A24)',
  TC: 'linear-gradient(135deg, #E17055, #D63031)',
  G: 'linear-gradient(135deg, #4285F4, #34A853)',
  MA: 'linear-gradient(135deg, #0081FB, #0057E7)',
  M: 'linear-gradient(135deg, #00A4EF, #0078D4)',
  LA: 'linear-gradient(135deg, #74B9FF, #0984E3)',
}
