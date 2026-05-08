import { PanelLeftClose } from "lucide-react"
import { NavLink } from "react-router"
import { navItems } from "@/components/layout/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"

interface AppSidebarProps {
  isMobileNavOpen: boolean
  onCloseMobileNav: () => void
}

export function AppSidebar({
  isMobileNavOpen,
  onCloseMobileNav,
}: AppSidebarProps) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/55 transition-opacity lg:hidden",
          isMobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onCloseMobileNav}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[320px] -translate-x-full border-r border-border/80 bg-sidebar/95 text-sidebar-foreground shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:z-10 lg:h-svh lg:w-80 lg:translate-x-0 lg:self-start lg:shadow-none",
          isMobileNavOpen && "translate-x-0",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border/80 px-4 py-4 lg:px-5 lg:py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Finogpt
                </div>
                <div className="space-y-1">
                  <h1 className="text-base font-semibold text-foreground">
                    Financial workspace
                  </h1>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Operations-first views for ingestion, analysis, and query workflows.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={onCloseMobileNav}
                aria-label="Close navigation"
              >
                <PanelLeftClose className="size-4" />
              </Button>
            </div>
          </div>

          <div className="border-b border-border/80 px-4 py-4 lg:px-5">
            <div className="rounded-lg border border-border/70 bg-card/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Workspace mode
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                Deterministic finance operations
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Move between raw rows, chart summaries, and AI-assisted analysis without leaving the session.
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 lg:px-4">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onCloseMobileNav}
                className={({ isActive }) =>
                  cn(
                    "flex items-start gap-3 rounded-lg border border-transparent px-3 py-3 transition-colors",
                    isActive
                      ? "border-border/80 bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                  )
                }
              >
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-card/70">
                  <item.icon className="size-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  )
}
