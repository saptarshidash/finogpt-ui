import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, ChartColumnBig } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Link, useParams, useSearchParams } from "react-router"
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
  getCategoryDetail,
  getCategorySummary,
  getEntityDetail,
  getEntitySummary,
} from "@/features/analytics/analytics-api"
import type {
  DimensionKind,
  SummaryQueryParams,
} from "@/features/analytics/analytics-types"
import { formatCompactCurrency, formatCurrency } from "@/lib/format/currency"
import { formatDate } from "@/lib/format/date"

const monthWindowOptions = [3, 6, 12]
const limitOptions = [10, 20, 50]

function formatMonthLabel(year: number, month: number) {
  return formatDate(`${year}-${String(month).padStart(2, "0")}-01`, "en-IN", {
    month: "short",
    year: "2-digit",
  })
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) {
    return fallback
  }

  const parsedValue = Number(value)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

function DimensionChartTooltip({
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
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="font-medium text-foreground">
              {entry.name === "Transactions"
                ? (entry.value ?? 0).toLocaleString("en-IN")
                : formatCurrency(entry.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function getDimensionCopy(kind: DimensionKind) {
  if (kind === "entity") {
    return {
      detailLabel: "Merchant detail",
      emptyDetail: "Merchant detail is not available right now.",
      emptySummary: "No merchant spend data is available yet.",
      path: "/entities",
      summaryLabel: "Merchant summary",
      titleField: "Top merchants",
    }
  }

  return {
    detailLabel: "Category detail",
    emptyDetail: "Category detail is not available right now.",
    emptySummary: "No category spend data is available yet.",
    path: "/categories",
    summaryLabel: "Category summary",
    titleField: "Top categories",
  }
}

function DimensionSummaryPage({ kind }: { kind: DimensionKind }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const months = parsePositiveInt(searchParams.get("months"), 6)
  const limit = parsePositiveInt(searchParams.get("limit"), 10)
  const copy = getDimensionCopy(kind)

  const params: SummaryQueryParams = useMemo(
    () => ({
      limit,
      months,
    }),
    [limit, months],
  )

  const summaryQuery = useQuery({
    queryKey:
      kind === "entity"
        ? analyticsQueryKeys.entitySummary(params)
        : analyticsQueryKeys.categorySummary(params),
    queryFn: () =>
      kind === "entity" ? getEntitySummary(params) : getCategorySummary(params),
  })

  function updateSearch(next: Record<string, number>) {
    const nextSearchParams = new URLSearchParams(searchParams)

    for (const [key, value] of Object.entries(next)) {
      nextSearchParams.set(key, String(value))
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge>{copy.summaryLabel}</Badge>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">{copy.titleField}</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Review spend-oriented rankings and jump into monthly trends for each {kind === "entity" ? "merchant" : "category"}.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Window</span>
            <select
              value={months}
              onChange={(event) => updateSearch({ months: Number(event.target.value) })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {monthWindowOptions.map((option) => (
                <option key={option} value={option}>
                  Last {option} months
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Rows</span>
            <select
              value={limit}
              onChange={(event) => updateSearch({ limit: Number(event.target.value) })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {limitOptions.map((option) => (
                <option key={option} value={option}>
                  Top {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{copy.titleField}</CardTitle>
          <CardDescription>
            Ranked by total debit spend over the selected monthly window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summaryQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : summaryQuery.isError ? (
            <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
              Unable to load {kind === "entity" ? "merchant" : "category"} rankings right now.
            </div>
          ) : !summaryQuery.data?.length ? (
            <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
              {copy.emptySummary}
            </div>
          ) : (
            <div className="space-y-3">
              {summaryQuery.data.map((item, index) => (
                <Link
                  key={item.id}
                  to={`${copy.path}/${item.id}?months=${months}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 px-4 py-4 transition-colors hover:bg-accent/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.txnCount.toLocaleString("en-IN")} transactions
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCompactCurrency(item.totalAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">Rank #{index + 1}</p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DimensionDetailPage({ kind }: { kind: DimensionKind }) {
  const { entityId, categoryId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const id = Number(kind === "entity" ? entityId : categoryId)
  const months = parsePositiveInt(searchParams.get("months"), 6)
  const copy = getDimensionCopy(kind)

  const params: SummaryQueryParams = useMemo(
    () => ({
      months,
    }),
    [months],
  )

  const detailQuery = useQuery({
    queryKey:
      kind === "entity"
        ? analyticsQueryKeys.entityDetail(id, params)
        : analyticsQueryKeys.categoryDetail(id, params),
    queryFn: () =>
      kind === "entity" ? getEntityDetail(id, params) : getCategoryDetail(id, params),
    enabled: Number.isFinite(id),
  })

  const trendData = useMemo(
    () =>
      (detailQuery.data?.trend ?? []).map((point) => ({
        label: formatMonthLabel(point.year, point.month),
        totalAmount: point.totalAmount,
        txnCount: point.txnCount,
      })),
    [detailQuery.data?.trend],
  )

  function updateMonths(nextMonths: number) {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set("months", String(nextMonths))
    setSearchParams(nextSearchParams, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge>{copy.detailLabel}</Badge>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">
              {detailQuery.data?.name || (kind === "entity" ? "Merchant detail" : "Category detail")}
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Monthly debit-oriented trend and ranking context for this {kind === "entity" ? "merchant" : "category"}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={months}
            onChange={(event) => updateMonths(Number(event.target.value))}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {monthWindowOptions.map((option) => (
              <option key={option} value={option}>
                Last {option} months
              </option>
            ))}
          </select>
          <Button asChild type="button" variant="outline" size="sm">
            <Link to={copy.path}>Back to list</Link>
          </Button>
        </div>
      </div>

      {detailQuery.isLoading ? (
        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <Skeleton className="h-80 w-full rounded-lg" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      ) : detailQuery.isError || !detailQuery.data ? (
        <Card>
          <CardContent className="px-5 py-10 text-center text-sm text-muted-foreground">
            {copy.emptyDetail}
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total spend</CardDescription>
                <CardTitle className="text-2xl font-semibold">
                  {formatCompactCurrency(detailQuery.data.totalAmount)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Transactions</CardDescription>
                <CardTitle className="text-2xl font-semibold">
                  {detailQuery.data.txnCount.toLocaleString("en-IN")}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardDescription>Period</CardDescription>
                <CardTitle className="text-2xl font-semibold capitalize">
                  {detailQuery.data.period.replaceAll("_", " ")}
                </CardTitle>
              </CardHeader>
            </Card>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <Card>
              <CardHeader>
                <CardTitle>Monthly trend</CardTitle>
                <CardDescription>Spend progression over the selected monthly window.</CardDescription>
              </CardHeader>
              <CardContent>
                {!trendData.length ? (
                  <div className="flex h-72 items-center justify-center rounded-lg border border-border bg-muted/60 px-6 text-center text-sm text-muted-foreground">
                    No trend data is available yet for this selection.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dimensionArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#5750F1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#5750F1" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "#71717a", fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#71717a", fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => formatCompactCurrency(value)}
                        />
                        <Tooltip content={<DimensionChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="totalAmount"
                          name="Spend"
                          stroke="#5750F1"
                          strokeWidth={2}
                          fill="url(#dimensionArea)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="rounded-md border border-border bg-muted/60 p-2 text-primary">
                    <ChartColumnBig className="size-4" />
                  </div>
                  <div>
                    <CardTitle>Trend breakdown</CardTitle>
                    <CardDescription>Monthly rows used by the detail chart.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendData.map((point) => (
                  <div
                    key={point.label}
                    className="rounded-lg border border-border bg-muted/40 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{point.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {point.txnCount.toLocaleString("en-IN")} transactions
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCompactCurrency(point.totalAmount)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}

export function EntitySummaryPage() {
  return <DimensionSummaryPage kind="entity" />
}

export function EntityDetailPage() {
  return <DimensionDetailPage kind="entity" />
}

export function CategorySummaryPage() {
  return <DimensionSummaryPage kind="category" />
}

export function CategoryDetailPage() {
  return <DimensionDetailPage kind="category" />
}
