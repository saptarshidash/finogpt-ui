import { cn } from "@/lib/utils/cn"

interface ProgressProps {
  className?: string
  value: number
}

export function Progress({ className, value }: ProgressProps) {
  const normalizedValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))

  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      aria-hidden="true"
    >
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${normalizedValue}%` }}
      />
    </div>
  )
}
