import type { ReactNode } from "react"
import { LockKeyhole, ShieldCheck, Sparkles, Workflow } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function AuthWorkspaceIllustration({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div
        className={`overflow-hidden rounded-lg border border-border bg-card shadow-[0_20px_60px_rgba(15,23,42,0.12)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)] ${
          compact ? "p-3" : "p-4"
        }`}
      >
        <svg
          viewBox="0 0 720 420"
          className="h-auto w-full"
          role="img"
          aria-label="Financial workspace illustration"
        >
          <rect
            x="12"
            y="12"
            width="696"
            height="396"
            rx="28"
            className="fill-slate-50 dark:fill-[#0f1117]"
          />

          <rect
            x="42"
            y="68"
            width="196"
            height="244"
            rx="22"
            className="fill-white stroke-slate-200 dark:fill-[#121621] dark:stroke-white/10"
          />
          <text
            x="68"
            y="106"
            className="fill-slate-500 text-[16px] font-medium dark:fill-slate-400"
          >
            Bank statement
          </text>
          <rect x="68" y="126" width="72" height="14" rx="7" className="fill-indigo-100 dark:fill-indigo-500/20" />
          <rect x="68" y="160" width="140" height="12" rx="6" className="fill-slate-200 dark:fill-white/10" />
          <rect x="68" y="186" width="124" height="12" rx="6" className="fill-slate-200 dark:fill-white/10" />
          <rect x="68" y="212" width="156" height="12" rx="6" className="fill-slate-200 dark:fill-white/10" />
          <rect x="68" y="248" width="54" height="54" rx="14" className="fill-primary/10 dark:fill-primary/15" />
          <text
            x="95"
            y="281"
            textAnchor="middle"
            className="fill-primary text-[22px] font-semibold dark:fill-primary"
          >
            Rs
          </text>
          <text
            x="136"
            y="268"
            className="fill-slate-500 text-[13px] font-medium dark:fill-slate-400"
          >
            Transactions parsed
          </text>
          <text
            x="136"
            y="292"
            className="fill-slate-900 text-[26px] font-semibold dark:fill-white"
          >
            518
          </text>

          <rect
            x="272"
            y="38"
            width="176"
            height="344"
            rx="34"
            className="fill-slate-900 stroke-slate-700 dark:fill-[#05070c] dark:stroke-white/10"
          />
          <rect x="290" y="62" width="140" height="298" rx="24" className="fill-white dark:fill-[#101520]" />
          <circle cx="360" cy="86" r="5" className="fill-slate-300 dark:fill-slate-600" />

          <rect x="308" y="112" width="104" height="64" rx="18" className="fill-primary/10 dark:fill-primary/15" />
          <text
            x="328"
            y="138"
            className="fill-primary text-[16px] font-semibold dark:fill-primary"
          >
            PhonePe
          </text>
          <text
            x="328"
            y="160"
            className="fill-slate-600 text-[13px] font-medium dark:fill-slate-300"
          >
            Wallet sync
          </text>

          <rect x="308" y="188" width="104" height="64" rx="18" className="fill-indigo-100 dark:fill-indigo-500/18" />
          <text
            x="328"
            y="214"
            className="fill-indigo-700 text-[16px] font-semibold dark:fill-indigo-300"
          >
            Google Pay
          </text>
          <text
            x="328"
            y="236"
            className="fill-slate-600 text-[13px] font-medium dark:fill-slate-300"
          >
            UPI activity
          </text>

          <rect x="308" y="266" width="104" height="70" rx="18" className="fill-emerald-100 dark:fill-emerald-500/15" />
          <text
            x="328"
            y="294"
            className="fill-emerald-800 text-[16px] font-semibold dark:fill-emerald-300"
          >
            Statements
          </text>
          <text
            x="328"
            y="316"
            className="fill-slate-600 text-[13px] font-medium dark:fill-slate-300"
          >
            CSV / PDF
          </text>

          <rect
            x="480"
            y="88"
            width="194"
            height="224"
            rx="22"
            className="fill-white stroke-slate-200 dark:fill-[#121621] dark:stroke-white/10"
          />
          <text
            x="506"
            y="124"
            className="fill-slate-500 text-[16px] font-medium dark:fill-slate-400"
          >
            Insights
          </text>
          <rect x="506" y="150" width="28" height="108" rx="10" className="fill-indigo-200 dark:fill-indigo-500/25" />
          <rect x="546" y="182" width="28" height="76" rx="10" className="fill-primary/20 dark:fill-primary/22" />
          <rect x="586" y="132" width="28" height="126" rx="10" className="fill-emerald-200 dark:fill-emerald-500/25" />
          <rect x="626" y="198" width="28" height="60" rx="10" className="fill-amber-200 dark:fill-amber-500/25" />
          <text
            x="506"
            y="286"
            className="fill-slate-900 text-[22px] font-semibold dark:fill-white"
          >
            Spend mapped
          </text>
          <text
            x="506"
            y="308"
            className="fill-slate-500 text-[14px] font-medium dark:fill-slate-400"
          >
            categories, merchants,
          </text>
          <text
            x="506"
            y="328"
            className="fill-slate-500 text-[14px] font-medium dark:fill-slate-400"
          >
            recurring signals
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
          PhonePe
        </span>
        <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:border-primary/25 dark:bg-primary/100/10 dark:text-primary">
          Google Pay
        </span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          Bank statements
        </span>
      </div>
    </div>
  )
}

interface AuthShellProps {
  children: ReactNode
  description: string
  desktopDescription: string
  footer?: ReactNode
  title: string
}

export function AuthShell({
  children,
  description,
  desktopDescription,
  footer,
  title,
}: AuthShellProps) {
  const recruiterBadges = [
    {
      label: "AI Finance Q&A",
      mobileClassName:
        "border-violet-300/70 bg-violet-500/12 text-violet-700 shadow-[0_0_22px_rgba(139,92,246,0.18)] dark:border-violet-400/30 dark:bg-violet-400/12 dark:text-violet-200",
      desktopClassName:
        "border-violet-300/70 bg-violet-500/10 text-violet-700 dark:border-violet-400/28 dark:bg-violet-400/12 dark:text-violet-200",
    },
    {
      label: "Anomaly Signals",
      mobileClassName:
        "border-amber-300/75 bg-amber-400/14 text-amber-800 shadow-[0_0_22px_rgba(245,158,11,0.16)] dark:border-amber-400/30 dark:bg-amber-400/12 dark:text-amber-200",
      desktopClassName:
        "border-amber-300/75 bg-amber-400/12 text-amber-800 dark:border-amber-400/28 dark:bg-amber-400/12 dark:text-amber-200",
    },
    {
      label: "Spend Analytics",
      mobileClassName:
        "border-emerald-300/75 bg-emerald-500/12 text-emerald-800 shadow-[0_0_22px_rgba(16,185,129,0.16)] dark:border-emerald-400/30 dark:bg-emerald-400/12 dark:text-emerald-200",
      desktopClassName:
        "border-emerald-300/75 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/28 dark:bg-emerald-400/12 dark:text-emerald-200",
    },
  ]

  return (
    <div className="relative flex min-h-svh items-center overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6 lg:right-8">
        <ModeToggle />
      </div>

      <div className="mx-auto grid w-full max-w-7xl items-stretch gap-6 lg:grid-cols-[minmax(0,1.08fr)_30rem]">
        <section className="hidden lg:flex lg:flex-col lg:justify-between">
          <div className="rounded-lg border border-border/80 bg-card/70 p-8 shadow-[0_24px_80px_rgba(17,24,39,0.08)] backdrop-blur-sm dark:shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Finogpt
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-foreground xl:text-5xl">
                  AI-assisted finance investigation for statements, UPI activity, and transaction intelligence.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  {desktopDescription}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {recruiterBadges.map((badge) => (
                  <span
                    key={badge.label}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${badge.desktopClassName}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>

              <div className="grid gap-3 xl:grid-cols-3">
                {[
                  {
                    icon: Workflow,
                    label: "Ingestion",
                    value: "Track uploads, parsing status, and structured extraction.",
                  },
                  {
                    icon: Sparkles,
                    label: "AI analysis",
                    value: "Move between charts, rows, and natural-language exploration.",
                  },
                  {
                    icon: ShieldCheck,
                    label: "Signals",
                    value: "Review recurring patterns, anomaly cues, and merchant-level insight.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-border/70 bg-background/65 px-4 py-4"
                  >
                    <item.icon className="size-4 text-primary" />
                    <p className="mt-3 text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <AuthWorkspaceIllustration />
            </div>
          </div>
        </section>

        <Card className="overflow-hidden border-border/80 bg-card/92 shadow-[0_28px_90px_rgba(17,24,39,0.1)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.38)]">
          <div className="h-px w-full bg-gradient-to-r from-primary/40 via-primary to-primary/35 dark:from-primary/30 dark:via-primary dark:to-primary/22" />
          <CardHeader className="space-y-6 px-5 pt-6 sm:px-6 sm:pt-7">
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary lg:hidden">
                Finogpt
              </div>

              <div className="lg:hidden">
                <AuthWorkspaceIllustration compact />
                <div className="mt-3 flex flex-wrap gap-2">
                  {recruiterBadges.map((badge) => (
                    <span
                      key={badge.label}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${badge.mobileClassName}`}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
                  <LockKeyhole className="size-5" />
                </div>
                <div className="space-y-1.5">
                  <CardTitle className="text-2xl sm:text-[1.75rem]">{title}</CardTitle>
                  <CardDescription className="max-w-md">{description}</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-5 pb-6 sm:px-6 sm:pb-7">
            {children}

            {footer ? (
              <div className="border-t border-border/80 pt-5 text-sm leading-6 text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
