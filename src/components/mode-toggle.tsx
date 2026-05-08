import { MoonStar, SunMedium } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils/cn"

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const options = [
    { icon: SunMedium, label: "Light", value: "light" },
    { icon: MoonStar, label: "Dark", value: "dark" },
  ] as const

  return (
    <div className="inline-flex items-center rounded-full border border-border/80 bg-card/90 p-1 shadow-sm backdrop-blur-sm">
      {options.map((option) => {
        const isActive = resolvedTheme === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-label={`Switch to ${option.label.toLowerCase()} mode`}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
              isActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <option.icon className="size-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
