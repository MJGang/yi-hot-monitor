"use client"
import { cn } from "@/lib/utils"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { useEffect, useRef } from "react"

interface FloatingParticleProps {
  className?: string
  size?: number
  x?: number
  y?: number
  duration?: number
  delay?: number
  style?: React.CSSProperties
}

export function FloatingParticle({
  className,
  size = 4,
  x = 0,
  y = 0,
  duration = 20,
  delay = 0,
  style,
}: FloatingParticleProps) {
  const particleRef = useRef<HTMLDivElement>(null)
  const particleX = useMotionValue(x)
  const particleY = useMotionValue(y)

  const springX = useSpring(particleX, { stiffness: 30, damping: 20 })
  const springY = useSpring(particleY, { stiffness: 30, damping: 20 })

  useEffect(() => {
    const animate = () => {
      particleX.set(Math.random() * 100)
      particleY.set(Math.random() * 100)
    }

    const interval = setInterval(animate, duration * 1000)
    animate()

    return () => clearInterval(interval)
  }, [duration, particleX, particleY])

  return (
    <motion.div
      ref={particleRef}
      className={cn(
        "absolute rounded-full pointer-events-none",
        className
      )}
      style={{
        width: size,
        height: size,
        x: springX,
        y: springY,
        ...style,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{
        duration: duration,
        delay: delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}

interface ParticleFieldProps {
  className?: string
  count?: number
  color?: string
}

export function ParticleField({ className, count = 30, color = "rgba(201, 177, 255, 0.5)" }: ParticleFieldProps) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <FloatingParticle
          key={i}
          size={Math.random() * 4 + 2}
          x={Math.random() * 100}
          y={Math.random() * 100}
          duration={Math.random() * 10 + 10}
          delay={Math.random() * 5}
          className=""
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}
