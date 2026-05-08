import { Navigate, Outlet, useLocation } from "react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/features/auth/auth-context"

export function ProtectedRoute() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === "checking") {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Restoring session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (auth.status === "error") {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>We could not restore your session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {auth.bootstrapError ??
                "Please try again or sign in again to continue."}
            </p>
            <div className="flex gap-2">
              <Button type="button" onClick={auth.retryBootstrap}>
                Retry
              </Button>
              <Button type="button" variant="outline" onClick={auth.logout}>
                Clear session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (auth.status === "unauthenticated") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return <Outlet />
}
