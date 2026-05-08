import { useQuery } from "@tanstack/react-query"
import { LogOut, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { navItems } from "@/components/layout/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/features/auth/auth-context"
import {
  getCategories,
  searchEntities,
  settingsQueryKeys,
} from "@/features/settings/settings-api"
import { cn } from "@/lib/utils/cn"

const DESKTOP_BREAKPOINT = 1024
const MOBILE_CONDENSE_SCROLL_ENTER = 56
const DESKTOP_CONDENSE_SCROLL_ENTER = 96
const CONDENSE_SCROLL_RESET = 8
const SEARCH_RESULT_LIMIT = 6

function getRouteMeta(pathname: string) {
  const navMatch = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))

  if (navMatch) {
    return {
      description: navMatch.description,
      label: navMatch.label,
    }
  }

  if (pathname.startsWith("/entities")) {
    return {
      label: "Merchants",
      description: "Monthly merchant summaries and drilldowns.",
    }
  }

  if (pathname.startsWith("/categories")) {
    return {
      label: "Categories",
      description: "Expense-oriented category summaries and detail pages.",
    }
  }

  return {
    label: "Workspace",
    description: "Finance operations and query workflows.",
  }
}

export function Topbar() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const displayName = user?.name ?? "Session"
  const displayEmail = user?.email ?? "Awaiting bootstrap"
  const routeMeta = useMemo(() => getRouteMeta(location.pathname), [location.pathname])
  const [isCondensed, setIsCondensed] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const lastScrollYRef = useRef(0)
  const searchContainerRef = useRef<HTMLDivElement | null>(null)
  const trimmedQuery = searchQuery.trim()

  const categoriesQuery = useQuery({
    queryKey: settingsQueryKeys.categories,
    queryFn: getCategories,
    staleTime: 5 * 60_000,
    enabled: isSearchOpen,
  })

  const entitySearchQuery = useQuery({
    queryKey: settingsQueryKeys.entitySearch(trimmedQuery, SEARCH_RESULT_LIMIT),
    queryFn: () => searchEntities(trimmedQuery, SEARCH_RESULT_LIMIT),
    enabled: isSearchOpen && trimmedQuery.length >= 2,
    staleTime: 60_000,
  })

  const routeResults = useMemo(() => {
    if (!trimmedQuery) {
      return navItems.slice(0, SEARCH_RESULT_LIMIT).map((item) => ({
        href: item.href,
        id: `route-${item.href}`,
        subtitle: item.description,
        title: item.label,
      }))
    }

    const normalizedQuery = trimmedQuery.toLowerCase()

    return navItems
      .filter(
        (item) =>
          item.label.toLowerCase().includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, SEARCH_RESULT_LIMIT)
      .map((item) => ({
        href: item.href,
        id: `route-${item.href}`,
        subtitle: item.description,
        title: item.label,
      }))
  }, [trimmedQuery])

  const categoryResults = useMemo(() => {
    if (!trimmedQuery) {
      return []
    }

    const normalizedQuery = trimmedQuery.toLowerCase()

    return (categoriesQuery.data ?? [])
      .filter((category) => category.name.toLowerCase().includes(normalizedQuery))
      .slice(0, SEARCH_RESULT_LIMIT)
      .map((category) => ({
        href: `/categories/${category.id}?months=6`,
        id: `category-${category.id}`,
        subtitle: category.type ? `Category • ${category.type}` : "Category",
        title: category.name,
      }))
  }, [categoriesQuery.data, trimmedQuery])

  const entityResults = useMemo(
    () =>
      (entitySearchQuery.data ?? []).map((entity) => ({
        href: `/entities/${entity.id}?months=6`,
        id: `entity-${entity.id}`,
        subtitle: "Merchant",
        title: entity.name,
      })),
    [entitySearchQuery.data],
  )

  useEffect(() => {
    let frameId = 0

    const updateHeaderState = () => {
      frameId = 0
      const currentScrollY = window.scrollY
      const viewportWidth = window.innerWidth

      setIsCondensed((currentState) => {
        if (currentScrollY <= CONDENSE_SCROLL_RESET) {
          return false
        }

        const isScrollingDown = currentScrollY > lastScrollYRef.current
        const condenseThreshold =
          viewportWidth >= DESKTOP_BREAKPOINT
            ? DESKTOP_CONDENSE_SCROLL_ENTER
            : MOBILE_CONDENSE_SCROLL_ENTER

        if (!currentState && isScrollingDown && currentScrollY > condenseThreshold) {
          return true
        }

        return currentState
      })

      lastScrollYRef.current = currentScrollY
    }

    const handleScroll = () => {
      if (frameId) {
        return
      }

      frameId = window.requestAnimationFrame(updateHeaderState)
    }

    updateHeaderState()
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
    }

    window.addEventListener("mousedown", handlePointerDown)

    return () => {
      window.removeEventListener("mousedown", handlePointerDown)
    }
  }, [])

  function handleSelectSearchResult(href: string) {
    navigate(href)
    setIsSearchOpen(false)
    setSearchQuery("")
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/88 backdrop-blur-xl">
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1680px] flex-col px-4 transition-[padding,gap] duration-300 md:px-6 xl:px-8",
          isCondensed ? "gap-2 py-3 md:py-2.5" : "gap-4 py-4",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Workspace
            </p>
            <h1
              className={cn(
                "truncate font-semibold text-foreground transition-[font-size,line-height] duration-300",
                isCondensed
                  ? "text-base leading-6 md:text-base lg:text-lg"
                  : "text-lg md:text-xl",
              )}
            >
              {routeMeta.label}
            </h1>
            <p
              className={cn(
                "hidden max-w-2xl text-sm leading-6 text-muted-foreground transition-all duration-300 md:block",
                isCondensed
                  ? "max-h-0 overflow-hidden opacity-0"
                  : "max-h-24 opacity-100",
              )}
            >
              {routeMeta.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={logout}
              aria-label="Log out"
              className="sm:hidden"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "transition-all duration-300",
            isCondensed
              ? "max-h-0 -translate-y-1 overflow-hidden opacity-0 pointer-events-none"
              : "max-h-32 overflow-visible translate-y-0 opacity-100",
          )}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div ref={searchContainerRef} className="relative w-full max-w-2xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setIsSearchOpen(true)
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Search routes, merchants, or categories"
                className="pl-9"
                aria-label="Global search"
              />

              {isSearchOpen ? (
                <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-lg border border-border/80 bg-card shadow-[0_18px_44px_rgba(2,13,26,0.16)] backdrop-blur-sm">
                  <div className="max-h-[28rem] overflow-y-auto p-2">
                    <div className="space-y-1">
                      <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Routes
                      </p>
                      {routeResults.length ? (
                        routeResults.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => handleSelectSearchResult(result.href)}
                            className="flex w-full flex-col items-start gap-1 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent/60"
                          >
                            <span className="text-sm font-medium text-foreground">
                              {result.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          No route matches.
                        </p>
                      )}
                    </div>

                    {trimmedQuery ? (
                      <>
                        <div className="mt-3 space-y-1">
                          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Merchants
                          </p>
                          {entitySearchQuery.isLoading ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                              Searching merchants...
                            </p>
                          ) : entityResults.length ? (
                            entityResults.map((result) => (
                              <button
                                key={result.id}
                                type="button"
                                onClick={() => handleSelectSearchResult(result.href)}
                                className="flex w-full flex-col items-start gap-1 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent/60"
                              >
                                <span className="text-sm font-medium text-foreground">
                                  {result.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {result.subtitle}
                                </span>
                              </button>
                            ))
                          ) : (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                              {trimmedQuery.length < 2
                                ? "Type at least 2 characters."
                                : "No merchant matches."}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 space-y-1">
                          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Categories
                          </p>
                          {categoriesQuery.isLoading ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                              Loading categories...
                            </p>
                          ) : categoryResults.length ? (
                            categoryResults.map((result) => (
                              <button
                                key={result.id}
                                type="button"
                                onClick={() => handleSelectSearchResult(result.href)}
                                className="flex w-full flex-col items-start gap-1 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent/60"
                              >
                                <span className="text-sm font-medium text-foreground">
                                  {result.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {result.subtitle}
                                </span>
                              </button>
                            ))
                          ) : (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                              No category matches.
                            </p>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="hidden items-center justify-between gap-3 md:flex lg:justify-end">
              <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/80 bg-card/85 px-3 py-2.5 shadow-sm backdrop-blur-sm">
                <Avatar name={displayName} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {displayEmail}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={logout}
                aria-label="Log out"
                className="hidden sm:inline-flex"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
