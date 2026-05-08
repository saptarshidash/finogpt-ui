import type { ComponentProps } from "react"
import { cn } from "@/lib/utils/cn"

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border/80 bg-card text-card-foreground shadow-[0_14px_40px_rgba(17,24,39,0.06)] backdrop-blur-sm dark:shadow-[0_20px_48px_rgba(0,0,0,0.28)]",
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 p-5 md:p-6", className)} {...props} />
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-sm font-semibold tracking-normal text-foreground", className)}
      {...props}
    />
  )
}

export function CardDescription({
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />
  )
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5 pt-0 md:p-6 md:pt-0", className)} {...props} />
}
