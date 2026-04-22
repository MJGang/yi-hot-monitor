"use client"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface AnimatedGridPatternProps {
  className?: string
  width?: number
  height?: number
  x?: number
  y?: number
  strokeDasharray?: string
}

export function AnimatedGridPattern({
  className,
  width = 40,
  height = 40,
  x = 0,
  y = 0,
  strokeDasharray = "0",
}: AnimatedGridPatternProps) {
  return (
    <motion.svg
      width={width}
      height={height}
      className={cn(
        "absolute inset-0 text-white/[0.05]",
        className
      )}
      style={{
        width,
        height,
        x,
        y,
      }}
    >
      <motion.rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke="currentColor"
        strokeWidth={0.5}
        strokeDasharray={strokeDasharray}
        fill="none"
        initial={{ opacity: 0.1 }}
        animate={{
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.svg>
  )
}
