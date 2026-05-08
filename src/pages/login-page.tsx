import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, TriangleAlert } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useLocation, useNavigate } from "react-router"
import { z } from "zod"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/features/auth/auth-context"
import { getRedirectTarget } from "@/features/auth/redirect"
import { ApiError } from "@/lib/api/client"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)

    try {
      await auth.login(values)
      navigate(getRedirectTarget(location.state), { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        return
      }

      setSubmitError("Unable to complete sign in.")
    }
  })

  return (
    <AuthShell
      title="Sign in"
      description="Track spending, transactions, and insights."
      desktopDescription="Track spending, review transactions, and explore financial insights in one workspace."
      footer={
        <p>
          New to Finogpt?{" "}
          <Link to="/signup" className="font-medium text-primary hover:opacity-80">
            Create an account
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="user@example.com"
            className="px-3.5 text-sm"
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="text-sm text-red-400">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className="px-3.5 text-sm"
            {...form.register("password")}
          />
          {form.formState.errors.password ? (
            <p className="text-sm text-red-400">
              {form.formState.errors.password.message}
            </p>
          ) : null}
        </div>

        {submitError ? (
          <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        ) : null}

        <Button
          type="submit"
          className="w-full justify-center"
          disabled={form.formState.isSubmitting}
        >
          <span>{form.formState.isSubmitting ? "Signing in..." : "Continue"}</span>
          {!form.formState.isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>
      </form>
    </AuthShell>
  )
}
