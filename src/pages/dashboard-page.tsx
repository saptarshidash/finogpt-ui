import { useState, type ReactNode } from "react"
import { AlertTriangle, ArrowUpRight, Clock3, CreditCard, Landmark } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Link } from "react-router"
import { useAuth } from "@/features/auth/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardHomeData } from "@/features/dashboard/use-dashboard-home-data"
import type {
  DashboardAnomalyItem,
  DashboardBreakdownItem,
  DashboardPeriod,
  DashboardRecurringItem,
} from "@/features/dashboard/dashboard-types"
import { formatCompactCurrency, formatCurrency } from "@/lib/format/currency"
import { formatDate } from "@/lib/format/date"

const periodOptions: Array<{ label: string; value: DashboardPeriod }> = [
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "Year to date", value: "year_to_date" },
]

function getPeriodLabel(period: DashboardPeriod) {
  return periodOptions.find((option) => option.value === period)?.label ?? "This month"
}

function getBreakdownDescription(period: DashboardPeriod) {
  switch (period) {
    case "last_month":
      return "Highest spend merchants for the previous month."
    case "year_to_date":
      return "Highest spend merchants across the current year to date."
    default:
      return "Highest spend merchants for the current month."
  }
}

function getCategoryDescription(period: DashboardPeriod) {
  switch (period) {
    case "last_month":
      return "Highest spend categories for the previous month."
    case "year_to_date":
      return "Highest spend categories across the current year to date."
    default:
      return "Highest spend categories for the current month."
  }
}

function ChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean
  label?: string
  payload?: Array<{ color?: string; name?: string; value?: number }>
}) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-xl shadow-black/10 dark:shadow-black/30">
      {label ? <p className="mb-2 text-xs text-muted-foreground">{label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}</span>
            </div>
            <span className="font-medium text-foreground">
              {formatCurrency(entry.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardPanelState({
  children,
  emptyMessage,
  errorMessage,
  isEmpty,
  isError,
  isLoading,
  loadingClassName,
}: {
  children: ReactNode
  emptyMessage: string
  errorMessage: string
  isEmpty: boolean
  isError: boolean
  isLoading: boolean
  loadingClassName?: string
}) {
  if (isLoading) {
    return <Skeleton className={loadingClassName ?? "h-64 w-full rounded-lg"} />
  }

  if (isError) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-muted/60 px-6 text-center text-sm text-muted-foreground">
        {errorMessage}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-muted/60 px-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return <>{children}</>
}

function BreakdownList({
  emptyMessage,
  getHref,
  isError,
  isLoading,
  items,
  titleLabel,
}: {
  emptyMessage: string
  getHref?: (item: DashboardBreakdownItem) => string
  isError: boolean
  isLoading: boolean
  items: DashboardBreakdownItem[]
  titleLabel: string
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
        Unable to load {titleLabel.toLowerCase()} right now.
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="rounded-lg border border-border bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const content = (
          <>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">
                {item.txnCount.toLocaleString("en-IN")} transactions
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">
                {formatCompactCurrency(item.totalAmount)}
              </p>
              <p className="text-xs text-muted-foreground">Rank #{index + 1}</p>
            </div>
          </>
        )

        if (!getHref) {
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-md border border-border bg-muted/40 px-3 py-3"
            >
              {content}
            </div>
          )
        }

        return (
          <Link
            key={item.id}
            to={getHref(item)}
            className="flex items-center justify-between gap-4 rounded-md border border-border bg-muted/40 px-3 py-3 transition-colors hover:bg-accent/60"
          >
            {content}
          </Link>
        )
      })}
    </div>
  )
}

function AnomalyList({
  emptyMessage,
  isError,
  isLoading,
  items,
}: {
  emptyMessage: string
  isError: boolean
  isLoading: boolean
  items: DashboardAnomalyItem[]
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
        Unable to load alerts right now.
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="rounded-lg border border-border bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium text-foreground">
              {item.entityName || item.description}
            </p>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {item.description}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.severity} • {item.txnDate ? formatDate(item.txnDate) : "Date unavailable"}
            </p>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <p className="text-sm font-semibold text-foreground">
              {item.amount !== null ? formatCompactCurrency(item.amount) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">{item.anomalyType}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function RecurringList({
  emptyMessage,
  isError,
  isLoading,
  items,
}: {
  emptyMessage: string
  isError: boolean
  isLoading: boolean
  items: DashboardRecurringItem[]
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
        Unable to load recurring items right now.
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="rounded-lg border border-border bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-4 rounded-md border border-border bg-muted/40 px-3 py-3"
        >
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium text-foreground">
              {item.entityName || "Unknown merchant"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {item.categoryName || "Uncategorized"}
              {item.frequencyDays ? ` • Every ${item.frequencyDays} days` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.nextExpectedDate
                ? `Next expected ${formatDate(item.nextExpectedDate)}`
                : item.lastSeen
                  ? `Last seen ${formatDate(item.lastSeen)}`
                  : "Date unavailable"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">
              {item.avgAmount !== null ? formatCompactCurrency(item.avgAmount) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Average amount</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<DashboardPeriod>("this_month")
  const {
    anomaliesSummaryQuery,
    cashflowDailyQuery,
    overviewQuery,
    recurringSummaryQuery,
    spendTrendQuery,
    topCategoriesQuery,
    topMerchantsQuery,
  } = useDashboardHomeData(period)

  const overview = overviewQuery.data
  const overviewLoading = overviewQuery.isLoading

  const metrics = [
    {
      label: "Total spend",
      value: overview ? formatCompactCurrency(overview.totalSpend) : "--",
      hint: overview ? `${formatCurrency(overview.totalSpend)} this period` : "Loading spend overview",
      icon: CreditCard,
    },
    {
      label: "Total credit",
      value: overview ? formatCompactCurrency(overview.totalCredit) : "--",
      hint: overview ? `${formatCurrency(overview.totalCredit)} credited` : "Loading credit overview",
      icon: Landmark,
    },
    {
      label: "Transactions",
      value: overview ? overview.txnCount.toLocaleString("en-IN") : "--",
      hint: overview ? "Recorded in the selected period" : "Loading transaction count",
      icon: ArrowUpRight,
    },
    {
      label: "Alerts",
      value: anomaliesSummaryQuery.data
        ? anomaliesSummaryQuery.data.totalAnomalies.toLocaleString("en-IN")
        : "--",
      hint: anomaliesSummaryQuery.data
        ? `${anomaliesSummaryQuery.data.highSeverityCount} high severity`
        : "Loading anomaly summary",
      icon: AlertTriangle,
    },
  ]

  const recurringItems = recurringSummaryQuery.data?.recurringItems ?? []
  const recentAnomalies = anomaliesSummaryQuery.data?.recentAnomalies ?? []

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge>Dashboard</Badge>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">
              Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              {overview
                ? `Current period: ${formatDate(overview.startDate)} to ${formatDate(overview.endDate)}.`
                : `Session verified on ${formatDate(new Date())}. Dashboard data is loading.`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/60 p-1">
          {periodOptions.map((option) => {
            const isActive = option.value === period

            return (
              <Button
                key={option.value}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPeriod(option.value)}
                className={
                  isActive
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-white"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }
              >
                {option.label}
              </Button>
            )
          })}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardDescription>{metric.label}</CardDescription>
                <div className="rounded-md border border-border bg-muted/60 p-2 text-primary">
                  <metric.icon className="size-4" />
                </div>
              </div>
              <CardTitle className="text-2xl font-semibold">
                {overviewLoading && metric.value === "--" ? (
                  <Skeleton className="h-8 w-24 rounded-md" />
                ) : (
                  metric.value
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{metric.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Spend trend</CardTitle>
            <CardDescription>Monthly debit summary across the recent six-month window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DashboardPanelState
              isLoading={spendTrendQuery.isLoading}
              isError={spendTrendQuery.isError}
              isEmpty={!spendTrendQuery.data?.length}
              emptyMessage="No spend trend data is available for this range yet."
              errorMessage="Unable to load the spend trend right now."
            >
              <div className="h-72 min-w-0 w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={spendTrendQuery.data}
                    margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="spendArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5750F1" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#5750F1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCompactCurrency(value)}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="totalSpend"
                      name="Spend"
                      stroke="#5750F1"
                      strokeWidth={2}
                      fill="url(#spendArea)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </DashboardPanelState>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Recent alerts</CardTitle>
            <CardDescription>Recent anomaly counts and flagged activity, independent of the period selector.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {anomaliesSummaryQuery.isLoading ? (
              <>
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </>
            ) : anomaliesSummaryQuery.isError ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
                Unable to load anomaly activity right now.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Total alerts</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {anomaliesSummaryQuery.data?.totalAnomalies.toLocaleString("en-IN") ?? "0"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">High severity</p>
                    <p className="mt-1 text-xl font-semibold text-red-300">
                      {anomaliesSummaryQuery.data?.highSeverityCount.toLocaleString("en-IN") ?? "0"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex size-2 rounded-full bg-red-400" />
                    <span>
                      Medium {anomaliesSummaryQuery.data?.mediumSeverityCount ?? 0}
                    </span>
                    <span className="inline-flex size-2 rounded-full bg-yellow-400" />
                    <span>Low {anomaliesSummaryQuery.data?.lowSeverityCount ?? 0}</span>
                  </div>

                  <AnomalyList
                    isLoading={false}
                    isError={false}
                    items={recentAnomalies}
                    emptyMessage="No recent anomalies have been flagged."
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Daily cashflow</CardTitle>
            <CardDescription>Credit and debit totals for the recent 30-day window.</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardPanelState
              isLoading={cashflowDailyQuery.isLoading}
              isError={cashflowDailyQuery.isError}
              isEmpty={!cashflowDailyQuery.data?.length}
              emptyMessage="No cashflow data is available for the selected range yet."
              errorMessage="Unable to load cashflow data right now."
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cashflowDailyQuery.data}
                    margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#a1a1aa", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCompactCurrency(value)}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="credit" name="Credit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="debit" name="Debit" fill="#5750F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardPanelState>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top merchants</CardTitle>
            <CardDescription>{getBreakdownDescription(period)}</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownList
              titleLabel="Merchants"
              getHref={(item) => `/entities/${item.id}?months=6`}
              isLoading={topMerchantsQuery.isLoading}
              isError={topMerchantsQuery.isError}
              items={topMerchantsQuery.data ?? []}
              emptyMessage="No merchant spend data is available yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top categories</CardTitle>
            <CardDescription>{getCategoryDescription(period)}</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownList
              titleLabel="Categories"
              getHref={(item) => `/categories/${item.id}?months=6`}
              isLoading={topCategoriesQuery.isLoading}
              isError={topCategoriesQuery.isError}
              items={topCategoriesQuery.data ?? []}
              emptyMessage="No category spend data is available yet."
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base leading-6">Recurring summary</CardTitle>
            <CardDescription className="max-w-[32rem] leading-6">
              Due-soon recurring items and tracked recurring spend, independent of the period selector.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recurringSummaryQuery.isLoading ? (
              <>
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </>
            ) : recurringSummaryQuery.isError ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
                Unable to load recurring activity right now.
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="min-h-[88px] rounded-md border border-border bg-muted/60 p-3">
                    <p className="text-xs leading-5 text-muted-foreground">Recurring items</p>
                    <p className="mt-2 text-xl font-semibold leading-none text-foreground">
                      {recurringSummaryQuery.data?.totalRecurring.toLocaleString("en-IN") ?? "0"}
                    </p>
                  </div>
                  <div className="min-h-[88px] rounded-md border border-border bg-muted/60 p-3">
                    <p className="text-xs leading-5 text-muted-foreground">Due soon</p>
                    <p className="mt-2 flex items-center gap-2 text-xl font-semibold leading-none text-foreground">
                      <Clock3 className="size-4 text-primary" />
                      {recurringSummaryQuery.data?.dueSoonCount.toLocaleString("en-IN") ?? "0"}
                    </p>
                  </div>
                </div>

                <RecurringList
                  isLoading={false}
                  isError={false}
                  items={recurringItems}
                  emptyMessage="No recurring items are available yet."
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overview window</CardTitle>
            <CardDescription>Selected overview period and how it maps across the dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {overviewQuery.isLoading ? (
              <>
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </>
            ) : overviewQuery.isError ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
                Unable to load the dashboard overview right now.
              </div>
            ) : overview ? (
              <>
                <div className="rounded-lg border border-border bg-muted/60 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-primary">
                    {getPeriodLabel(period)}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {formatDate(overview.startDate)} to {formatDate(overview.endDate)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Overview, top merchants, and top categories follow this selection. Trend, anomaly, recurring, and daily cashflow panels use their own backend windows.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Credits vs spend</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {overview.totalCredit >= overview.totalSpend
                        ? "Credits exceed spend in this window."
                        : "Spend exceeds credits in this window."}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Transaction density</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {overview.txnCount.toLocaleString("en-IN")} transactions captured.
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
