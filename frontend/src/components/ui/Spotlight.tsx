"use client"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface SpotlightProps {
  className?: string
  fill?: string
}

export function Spotlight({ className, fill }: SpotlightProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2 }}
      className={cn(
        "pointer-events-none absolute inset-0 z-10",
        className
      )}
    >
      <div
        className={cn(
          "absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        )}
        style={{
          background: fill || "linear-gradient(to right, rgba(201, 177, 255, 0.2), rgba(116, 185, 255, 0.1), rgba(125, 205, 170, 0.1))",
          filter: "blur(80px)",
          transform: "translate(-50%, -50%) scale(0.8)",
        }}
      />
    </motion.div>
  )
}
