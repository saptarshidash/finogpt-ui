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

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  email: z.string().email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[0-9]{10,15}$/.test(value),
      "Enter a valid phone number.",
    ),
  password: z.string().min(8, "Password must be at least 8 characters."),
})

type SignupFormValues = z.infer<typeof signupSchema>

export function SignupPage() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)

    try {
      await auth.signup({
        ...values,
        phone: values.phone || null,
      })
      navigate(getRedirectTarget(location.state), { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        return
      }

      setSubmitError("Unable to create your account.")
    }
  })

  return (
    <AuthShell
      title="Create account"
      description="Set up access to your financial workspace."
      desktopDescription="Create an account to upload statements, review transactions, and work through financial insights in one place."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:opacity-80">
            Sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Saptarshi"
            className="px-3.5 text-sm"
            {...form.register("name")}
          />
          {form.formState.errors.name ? (
            <p className="text-sm text-red-400">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>

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
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            inputMode="numeric"
            placeholder="9999999999"
            className="px-3.5 text-sm"
            {...form.register("phone")}
          />
          {form.formState.errors.phone ? (
            <p className="text-sm text-red-400">
              {form.formState.errors.phone.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
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
          <span>
            {form.formState.isSubmitting ? "Creating account..." : "Create account"}
          </span>
          {!form.formState.isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>
      </form>
    </AuthShell>
  )
}
