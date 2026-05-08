import { cn } from "@/lib/utils/cn"

interface AvatarProps {
  name: string
  className?: string
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function Avatar({ className, name }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex size-10 items-center justify-center rounded-md border border-primary/15 bg-primary/12 text-sm font-semibold text-primary",
        className,
      )}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  )
}
