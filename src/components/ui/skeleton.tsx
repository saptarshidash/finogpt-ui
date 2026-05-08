import { cn } from "@/lib/utils/cn"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        className,
      )}
    />
  )
}
