"use client"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface TechGlassCardProps {
  children: React.ReactNode
  className?: string
  hotness?: 'cold' | 'normal' | 'warm' | 'hot' | 'explosive'
}

const hotnessColors = {
  cold: { primary: '#00D9FF', secondary: 'rgba(0,217,255,0.15)' },
  normal: { primary: '#A0AEC0', secondary: 'rgba(160,174,192,0.1)' },
  warm: { primary: '#FFB432', secondary: 'rgba(255,180,50,0.15)' },
  hot: { primary: '#FF5722', secondary: 'rgba(255,87,34,0.2)' },
  explosive: { primary: '#F0ABFC', secondary: 'rgba(240,171,252,0.15)' },
}

export function TechGlassCard({ children, className, hotness = 'normal' }: TechGlassCardProps) {
  const colors = hotnessColors[hotness]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        className
      )}
      style={{
        background: `
          linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.35) 0%,
            rgba(255, 255, 255, 0.15) 40%,
            rgba(255, 255, 255, 0.08) 60%,
            rgba(255, 255, 255, 0.03) 100%
          )
        `,
        backdropFilter: 'blur(40px) saturate(180%) brightness(1.05)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%) brightness(1.05)',
        border: '0.5px solid rgba(255, 255, 255, 0.4)',
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.06),
          0 2px 8px rgba(0, 0, 0, 0.03),
          inset 0 1px 0 rgba(255, 255, 255, 0.9),
          inset 0 -0.5px 0 rgba(0, 0, 0, 0.05)
        `,
      }}
    >
      {/* Tech grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(${colors.primary} 1px, transparent 1px),
            linear-gradient(90deg, ${colors.primary} 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Animated dot grid */}
      <DotGrid color={colors.primary} />

      {/* Shimmer effect */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          maskImage: 'linear-gradient(110deg, transparent 15%, rgba(255,255,255,0.3) 35%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 65%, transparent 85%)',
          WebkitMaskImage: 'linear-gradient(110deg, transparent 15%, rgba(255,255,255,0.3) 35%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 65%, transparent 85%)',
        }}
      >
        <div
          className="absolute inset-0 animate-shimmer"
          style={{
            background: `linear-gradient(110deg, transparent 20%, ${colors.primary}30 45%, ${colors.primary}50 50%, ${colors.primary}30 55%, transparent 80%)`,
            backgroundSize: '200% 100%',
          }}
        />
      </div>

      {/* Hotness accent glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.primary}60, transparent)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}

function DotGrid({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
        <defs>
          <pattern id="dotPattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill={color} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotPattern)" />
      </svg>
    </div>
  )
}
