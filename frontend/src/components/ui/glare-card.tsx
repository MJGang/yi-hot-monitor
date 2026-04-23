"use client";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

export const GlareCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    divRef.current.style.setProperty("--mouse-x", `${x}px`);
    divRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        // "relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300",
        // // 浅色模式 - 玻璃态效果
        // "bg-white/90 border-gray-200 shadow-md shadow-gray-300/50",
        // // 悬停效果
        // isHovered && "border-primary/30 shadow-lg shadow-primary/10",
         "glare-card relative overflow-hidden rounded-2xl backdrop-blur-xl transition-all duration-300",
        isHovered && "is-hovered",
        className
      )}
    >
      {/* Spotlight effect */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-500 rounded-2xl",
          isHovered && "opacity-100",
          !isHovered && "opacity-0"
        )}
        style={{
          background: `radial-gradient(circle 300px at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(124, 58, 237, 0.1), transparent 70%)`,
        }}
      />
      {/* 顶部微光 */}
      <div className="absolute inset-0 rounded-2xl bg-linear-to-b from-white/10 via-transparent to-transparent pointer-events-none" />
      {children}
    </div>
  );
};
