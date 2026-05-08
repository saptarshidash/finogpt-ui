import { useState } from "react"
import { Ellipsis } from "lucide-react"
import { NavLink, Outlet, useLocation } from "react-router"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { mobileDockItems } from "@/components/layout/navigation"
import { Topbar } from "@/components/layout/topbar"
import { cn } from "@/lib/utils/cn"

export function AppShell() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const location = useLocation()
  const isDockRoute = mobileDockItems.some(
    (item) =>
      location.pathname === item.href ||
      location.pathname.startsWith(`${item.href}/`),
  )

  return (
    <div className="min-h-svh overflow-x-clip bg-background text-foreground">
      <div className="flex min-h-svh overflow-x-clip">
        <AppSidebar
          isMobileNavOpen={isMobileNavOpen}
          onCloseMobileNav={() => setIsMobileNavOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
          <Topbar />
          <main className="mx-auto flex min-w-0 w-full max-w-[1680px] flex-1 flex-col gap-6 overflow-x-clip px-4 pb-28 pt-4 md:px-6 md:pb-8 md:pt-6 xl:px-8">
            <Outlet />
          </main>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 overflow-x-clip border-t border-border/80 bg-background/92 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        <nav className="mx-auto grid w-full max-w-screen-sm grid-cols-5 gap-1">
          {mobileDockItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )
              }
            >
              <item.icon className="size-4" />
              <span className="truncate">{item.mobileLabel ?? item.label}</span>
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium transition-colors",
              !isDockRoute
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
            aria-label="Open more navigation items"
          >
            <Ellipsis className="size-4" />
            <span className="truncate">More</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
