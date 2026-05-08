import { Navigate, Outlet, useLocation } from "react-router"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"

function getRedirectTarget(state: unknown) {
  if (typeof state === "object" && state !== null && "from" in state) {
    const from = state.from
    if (typeof from === "string" && from.length > 0) {
      return from
    }
  }

  return "/dashboard"
}

export function PublicOnlyRoute() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === "checking") {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <div className="w-full max-w-md space-y-3 rounded-lg border border-border/80 bg-card p-6">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  if (auth.status === "authenticated") {
    return <Navigate to={getRedirectTarget(location.state)} replace />
  }

  return <Outlet />
}
