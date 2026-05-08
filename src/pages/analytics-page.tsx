import { useMemo, useState } from "react"
import { useQueries } from "@tanstack/react-query"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useSearchParams } from "react-router"
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
import {
  analyticsQueryKeys,
  getAnalyticsBreakdown,
  getAnalyticsCategories,
  getAnalyticsEntities,
  getAnalyticsSummary,
} from "@/features/analytics/analytics-api"
import type {
  AnalyticsBreakdownQueryParams,
  AnalyticsGrain,
  AnalyticsMetric,
  AnalyticsPoint,
  AnalyticsSort,
  DimensionKind,
} from "@/features/analytics/analytics-types"
import { formatCompactCurrency, formatCurrency } from "@/lib/format/currency"
import { formatDate } from "@/lib/format/date"
import { cn } from "@/lib/utils/cn"

function isGrain(value: string | null): value is AnalyticsGrain {
  return value === "daily" || value === "monthly"
}

function isMetric(value: string | null): value is AnalyticsMetric {
  return value === "spend" || value === "credit" || value === "txn_count"
}

function isSort(value: string | null): value is AnalyticsSort {
  return value === "amount" || value === "count"
}

function isDimension(value: string | null): value is DimensionKind {
  return value === "entity" || value === "category"
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsedValue = Number(value)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

function formatRangeLabel(from: string, to: string) {
  if (from === to) {
    return formatDate(from, "en-IN", { day: "2-digit", month: "short" })
  }

  return `${formatDate(from, "en-IN", { day: "2-digit", month: "short" })} - ${formatDate(
    to,
    "en-IN",
    { day: "2-digit", month: "short" },
  )}`
}

function formatIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`
}

function getMonthlyPointRangeLabel(point: AnalyticsPoint, from: string, to: string) {
  const bucketStart = point.periodStart ? new Date(point.periodStart) : null

  if (!bucketStart || Number.isNaN(bucketStart.getTime())) {
    return null
  }

  const requestedStart = new Date(from)
  const requestedEnd = new Date(to)

  if (Number.isNaN(requestedStart.getTime()) || Number.isNaN(requestedEnd.getTime())) {
    return null
  }

  const bucketEnd = new Date(bucketStart.getFullYear(), bucketStart.getMonth() + 1, 0)
  const rangeStart = requestedStart > bucketStart ? requestedStart : bucketStart
  const rangeEnd = requestedEnd < bucketEnd ? requestedEnd : bucketEnd

  if (rangeStart > rangeEnd) {
    return null
  }

  return formatRangeLabel(formatIsoDate(rangeStart), formatIsoDate(rangeEnd))
}

function normalizeAnalyticsLabel(
  point: AnalyticsPoint,
  options?: {
    grain?: AnalyticsGrain
    isSinglePoint?: boolean
    from?: string | null
    to?: string | null
  },
) {
  if (options?.grain === "monthly" && options.from && options.to) {
    const monthlyRangeLabel = getMonthlyPointRangeLabel(point, options.from, options.to)

    if (monthlyRangeLabel) {
      return monthlyRangeLabel
    }
  }

  if (options?.isSinglePoint && options.from && options.to) {
    return formatRangeLabel(options.from, options.to)
  }

  if (point.periodStart) {
    return formatDate(point.periodStart, "en-IN", {
      day: "2-digit",
      month: "short",
    })
  }

  if (point.year !== null && point.month !== null) {
    return formatDate(`${point.year}-${String(point.month).padStart(2, "0")}-01`, "en-IN", {
      month: "short",
      year: "2-digit",
    })
  }

  return "—"
}

function AnalyticsTooltip({
  active,
  label,
  metric,
  payload,
}: {
  active?: boolean
  label?: string
  metric: AnalyticsMetric
  payload?: Array<{ name?: string; value?: number }>
}) {
  if (!active || !payload?.length) {
    return null
  }

  const value = payload[0]?.value ?? 0

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-xl shadow-black/10 dark:shadow-black/30">
      {label ? <p className="mb-2 text-xs text-muted-foreground">{label}</p> : null}
      <p className="text-sm font-medium text-foreground">
        {metric === "txn_count" ? value.toLocaleString("en-IN") : formatCurrency(value)}
      </p>
    </div>
  )
}

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isControlsOpen, setIsControlsOpen] = useState(false)
  const grainParam = searchParams.get("grain")
  const metricParam = searchParams.get("metric")
  const sortParam = searchParams.get("sort")
  const dimensionParam = searchParams.get("dimension")
  const grain: AnalyticsGrain = isGrain(grainParam) ? grainParam : "monthly"
  const metric: AnalyticsMetric = isMetric(metricParam) ? metricParam : "spend"
  const sort: AnalyticsSort = isSort(sortParam) ? sortParam : "amount"
  const dimension: DimensionKind = isDimension(dimensionParam) ? dimensionParam : "entity"
  const limit = parsePositiveInt(searchParams.get("limit"), 10)
  const from = searchParams.get("from") || undefined
  const to = searchParams.get("to") || undefined

  const breakdownParams: AnalyticsBreakdownQueryParams = useMemo(
    () => ({
      from,
      limit,
      sort,
      to,
    }),
    [from, limit, sort, to],
  )

  const [summaryQuery, entitiesQuery, categoriesQuery, breakdownQuery] = useQueries({
    queries: [
      {
        queryKey: analyticsQueryKeys.analyticsSummary({ from, grain, metric, to }),
        queryFn: () => getAnalyticsSummary({ from, grain, metric, to }),
      },
      {
        queryKey: analyticsQueryKeys.analyticsEntities(breakdownParams),
        queryFn: () => getAnalyticsEntities(breakdownParams),
      },
      {
        queryKey: analyticsQueryKeys.analyticsCategories(breakdownParams),
        queryFn: () => getAnalyticsCategories(breakdownParams),
      },
      {
        queryKey: analyticsQueryKeys.analyticsBreakdown(dimension, breakdownParams),
        queryFn: () => getAnalyticsBreakdown(dimension, breakdownParams),
      },
    ],
  })

  function updateSearch(nextValues: Record<string, string | number | undefined>) {
    const nextSearchParams = new URLSearchParams(searchParams)

    for (const [key, value] of Object.entries(nextValues)) {
      if (value === undefined || value === "") {
        nextSearchParams.delete(key)
      } else {
        nextSearchParams.set(key, String(value))
      }
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  const seriesPoints = summaryQuery.data?.points ?? []
  const seriesData = seriesPoints.map((point) => ({
    label: normalizeAnalyticsLabel(point, {
      from: summaryQuery.data?.from,
      grain,
      isSinglePoint: seriesPoints.length === 1,
      to: summaryQuery.data?.to,
    }),
    value: point.value,
  }))

  const topEntities = entitiesQuery.data?.items ?? []
  const topCategories = categoriesQuery.data?.items ?? []
  const breakdownItems = breakdownQuery.data?.items ?? []

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>Analytics explorer</Badge>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Analytics explorer</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Explore deterministic summary trends and spend-oriented breakdowns without natural-language queries.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Explorer controls</CardTitle>
                <CardDescription>
                  Adjust the summary series and breakdown ranking directly from the API-backed controls.
                </CardDescription>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="md:hidden"
                onClick={() => setIsControlsOpen((currentState) => !currentState)}
                aria-expanded={isControlsOpen}
                aria-label={isControlsOpen ? "Hide explorer controls" : "Show explorer controls"}
              >
                {isControlsOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                {isControlsOpen ? "Hide" : "Controls"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 md:hidden">
              <Badge variant="outline">{grain}</Badge>
              <Badge variant="outline">{metric}</Badge>
              <Badge variant="outline">{dimension}</Badge>
              <Badge variant="outline">Top {limit}</Badge>
              {from || to ? (
                <Badge variant="outline">
                  {[from ?? "Start", to ?? "End"].join(" - ")}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className={cn(!isControlsOpen && "hidden md:block")}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">From date</span>
              <input
                type="date"
                value={from ?? ""}
                onChange={(event) => updateSearch({ from: event.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">To date</span>
              <input
                type="date"
                value={to ?? ""}
                onChange={(event) => updateSearch({ to: event.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Grain</span>
              <select
                value={grain}
                onChange={(event) => updateSearch({ grain: event.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Metric</span>
              <select
                value={metric}
                onChange={(event) => updateSearch({ metric: event.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <option value="spend">Spend</option>
                <option value="credit">Credit</option>
                <option value="txn_count">Transaction count</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Breakdown dimension</span>
              <select
                value={dimension}
                onChange={(event) => updateSearch({ dimension: event.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <option value="entity">Merchant</option>
                <option value="category">Category</option>
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Sort</span>
                <select
                  value={sort}
                  onChange={(event) => updateSearch({ sort: event.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <option value="amount">Amount</option>
                  <option value="count">Count</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Limit</span>
                <select
                  value={limit}
                  onChange={(event) => updateSearch({ limit: Number(event.target.value) })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {[5, 10, 20].map((option) => (
                    <option key={option} value={option}>
                      Top {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Summary series</CardTitle>
            <CardDescription>
              {metric === "txn_count"
                ? "Transaction count trend for the selected range."
                : `${metric === "spend" ? "Spend" : "Credit"} trend for the selected range.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summaryQuery.isLoading ? (
              <Skeleton className="h-80 w-full rounded-lg" />
            ) : summaryQuery.isError ? (
              <div className="flex h-80 items-center justify-center rounded-lg border border-border bg-muted/60 px-6 text-center text-sm text-muted-foreground">
                Unable to load the analytics summary right now.
              </div>
            ) : !seriesData.length ? (
              <div className="flex h-80 items-center justify-center rounded-lg border border-border bg-muted/60 px-6 text-center text-sm text-muted-foreground">
                No analytics summary data is available for this range yet.
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seriesData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5750F1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#5750F1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fill: "#71717a", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) =>
                        metric === "txn_count"
                          ? value.toLocaleString("en-IN")
                          : formatCompactCurrency(value)
                      }
                    />
                    <Tooltip content={<AnalyticsTooltip metric={metric} />} />
                    <Area type="monotone" dataKey="value" name="Value" stroke="#5750F1" strokeWidth={2} fill="url(#analyticsArea)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Explorer breakdown</CardTitle>
            <CardDescription>
              Spend-oriented ranking for the selected {dimension === "entity" ? "merchant" : "category"} dimension.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {breakdownQuery.isLoading ? (
              <>
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </>
            ) : breakdownQuery.isError ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Unable to load the breakdown right now.
              </div>
            ) : !breakdownItems.length ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                No breakdown data is available for this range yet.
              </div>
            ) : (
              breakdownItems.map((item, index) => (
                <div key={item.id} className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.txnCount.toLocaleString("en-IN")} transactions
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {sort === "count"
                          ? item.txnCount.toLocaleString("en-IN")
                          : formatCompactCurrency(item.totalAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">Rank #{index + 1}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top merchants snapshot</CardTitle>
            <CardDescription>Direct `analytics/entities` response for the current explorer filters.</CardDescription>
          </CardHeader>
          <CardContent>
            {entitiesQuery.isLoading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : entitiesQuery.isError ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Unable to load merchant analytics right now.
              </div>
            ) : (
              <div className="space-y-3">
                {topEntities.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-sm font-semibold text-foreground">
                        {sort === "count"
                          ? item.txnCount.toLocaleString("en-IN")
                          : formatCompactCurrency(item.totalAmount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top categories snapshot</CardTitle>
            <CardDescription>Direct `analytics/categories` response for the current explorer filters.</CardDescription>
          </CardHeader>
          <CardContent>
            {categoriesQuery.isLoading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : categoriesQuery.isError ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Unable to load category analytics right now.
              </div>
            ) : (
              <div className="space-y-3">
                {topCategories.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-sm font-semibold text-foreground">
                        {sort === "count"
                          ? item.txnCount.toLocaleString("en-IN")
                          : formatCompactCurrency(item.totalAmount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
