import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { SearchX, X } from "lucide-react"
import { Link, useSearchParams } from "react-router"
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
  alertsQueryKeys,
  getAnomalies,
  getAnomalyDetail,
  getAnomalyFilters,
} from "@/features/alerts/alerts-api"
import type {
  AnomalyListItem,
  AnomalySeverity,
  AnomaliesQueryParams,
} from "@/features/alerts/alerts-types"
import { formatCompactCurrency, formatCurrency } from "@/lib/format/currency"
import { formatDate } from "@/lib/format/date"
import { cn } from "@/lib/utils/cn"

const PAGE_SIZE = 20

function parseNumberParam(value: string | null) {
  if (!value) {
    return undefined
  }

  const parsedValue = Number(value)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined
}

function parsePageParam(value: string | null) {
  if (!value) {
    return 0
  }

  const parsedValue = Number(value)
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : 0
}

function isSeverity(value: string | null): value is AnomalySeverity {
  return value === "HIGH" || value === "MEDIUM" || value === "LOW"
}

function formatDateTime(value: string) {
  return formatDate(value, "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getSeverityTone(severity: string) {
  switch (severity.toUpperCase()) {
    case "HIGH":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
    case "MEDIUM":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300"
    default:
      return "border-primary/20 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/12 dark:text-primary"
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium uppercase tracking-[0.08em]",
        getSeverityTone(severity),
      )}
    >
      {severity}
    </span>
  )
}

function EmptyAlertsState({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean
  onReset: () => void
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/60 px-5 py-12 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-border bg-background">
        <SearchX className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">No anomalies found</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasFilters
          ? "Adjust the current filters or clear them to broaden the result set."
          : "Anomalies will appear here when the backend flags unusual activity."}
      </p>
      {hasFilters ? (
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onReset}>
          Clear filters
        </Button>
      ) : null}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-md border border-border bg-muted/40 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="break-words text-sm text-foreground">{value}</p>
    </div>
  )
}

function AlertRow({
  anomaly,
  isSelected,
  onSelect,
}: {
  anomaly: AnomalyListItem
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border border-border bg-muted/40 px-4 py-4 text-left transition-colors hover:bg-accent/60",
        isSelected && "bg-accent/60",
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={anomaly.severity} />
            <Badge variant="outline">{anomaly.anomalyType}</Badge>
          </div>
          <p className="text-sm font-medium text-foreground">{anomaly.entityName || "Unknown merchant"}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{anomaly.description}</p>
          <p className="text-xs text-muted-foreground">
            {anomaly.txnDate ? formatDate(anomaly.txnDate) : "Date unavailable"} • Created{" "}
            {formatDateTime(anomaly.createdAt)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">
            {anomaly.amount !== null ? formatCompactCurrency(anomaly.amount) : "—"}
          </p>
          {anomaly.txnId !== null ? (
            <p className="mt-1 text-xs text-muted-foreground">Txn #{anomaly.txnId}</p>
          ) : null}
        </div>
      </div>
    </button>
  )
}

export function AlertsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const severityParam = searchParams.get("severity")

  const queryState = useMemo(() => {
    const params: AnomaliesQueryParams = {
      anomalyType: searchParams.get("anomalyType") || undefined,
      page: parsePageParam(searchParams.get("page")),
      severity: isSeverity(severityParam) ? severityParam : undefined,
      size: PAGE_SIZE,
    }

    return {
      anomalyId: parseNumberParam(searchParams.get("anomalyId")) ?? null,
      params,
    }
  }, [searchParams, severityParam])

  const anomaliesQuery = useQuery({
    queryKey: alertsQueryKeys.list(queryState.params),
    queryFn: () => getAnomalies(queryState.params),
    placeholderData: (previousData) => previousData,
  })

  const filtersQuery = useQuery({
    queryKey: alertsQueryKeys.filters,
    queryFn: getAnomalyFilters,
    staleTime: 5 * 60_000,
  })

  const anomalyDetailQuery = useQuery({
    queryKey: alertsQueryKeys.detail(queryState.anomalyId ?? 0),
    queryFn: () => getAnomalyDetail(queryState.anomalyId!),
    enabled: queryState.anomalyId !== null,
  })

  const hasActiveFilters = Boolean(
    queryState.params.severity || queryState.params.anomalyType,
  )

  function updateSearchParams(nextValues: Record<string, string | number | null | undefined>) {
    const nextSearchParams = new URLSearchParams(searchParams)

    for (const [key, value] of Object.entries(nextValues)) {
      if (value === null || value === undefined || value === "") {
        nextSearchParams.delete(key)
        continue
      }

      nextSearchParams.set(key, String(value))
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  function resetFilters() {
    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams)
        for (const key of ["severity", "anomalyType", "page", "anomalyId"]) {
          nextParams.delete(key)
        }
        return nextParams
      },
      { replace: true },
    )
  }

  const anomalies = anomaliesQuery.data?.items ?? []
  const filterOptions = filtersQuery.data ?? { anomalyTypes: [], severities: [] }
  const pagination = anomaliesQuery.data
    ? {
        hasNextPage: anomaliesQuery.data.page + 1 < anomaliesQuery.data.totalPages,
        hasPreviousPage: anomaliesQuery.data.page > 0,
        label: `Page ${anomaliesQuery.data.page + 1} of ${Math.max(
          anomaliesQuery.data.totalPages,
          1,
        )}`,
      }
    : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge>Alerts</Badge>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">Anomalies workspace</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Review anomaly severity, inspect the flagged context, and jump to supporting transactions when needed.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {anomaliesQuery.data
              ? `${anomaliesQuery.data.totalItems.toLocaleString("en-IN")} alerts`
              : "Loading alerts"}
          </Badge>
          {hasActiveFilters ? (
            <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
              <X className="size-4" />
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert filters</CardTitle>
          <CardDescription>Filter the anomaly stream by severity or API-provided anomaly type.</CardDescription>
        </CardHeader>
        <CardContent>
          {filtersQuery.isLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : filtersQuery.isError ? (
            <div className="rounded-lg border border-border bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Unable to load anomaly filters right now.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Severity</span>
                <select
                  value={queryState.params.severity ?? ""}
                  onChange={(event) =>
                    updateSearchParams({
                      anomalyId: null,
                      page: 0,
                      severity: event.target.value,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <option value="">All severities</option>
                  {filterOptions.severities.map((severity) => (
                    <option key={severity.value} value={severity.value}>
                      {severity.value} ({severity.count})
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Anomaly type</span>
                <select
                  value={queryState.params.anomalyType ?? ""}
                  onChange={(event) =>
                    updateSearchParams({
                      anomalyId: null,
                      anomalyType: event.target.value,
                      page: 0,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <option value="">All anomaly types</option>
                  {filterOptions.anomalyTypes.map((anomalyType) => (
                    <option key={anomalyType.value} value={anomalyType.value}>
                      {anomalyType.value} ({anomalyType.count})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_24rem]">
        <Card>
          <CardHeader>
            <CardTitle>Anomaly list</CardTitle>
            <CardDescription>Flagged activity ordered by the backend response.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {anomaliesQuery.isLoading ? (
              <>
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </>
            ) : anomaliesQuery.isError ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Unable to load anomalies right now.
              </div>
            ) : !anomalies.length ? (
              <EmptyAlertsState hasFilters={hasActiveFilters} onReset={resetFilters} />
            ) : (
              <>
                <div className="space-y-3">
                  {anomalies.map((anomaly) => (
                    <AlertRow
                      key={anomaly.id}
                      anomaly={anomaly}
                      isSelected={anomaly.id === queryState.anomalyId}
                      onSelect={() => updateSearchParams({ anomalyId: anomaly.id })}
                    />
                  ))}
                </div>

                {pagination ? (
                  <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">{pagination.label}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasPreviousPage}
                        onClick={() => updateSearchParams({ page: queryState.params.page - 1 })}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasNextPage}
                        onClick={() => updateSearchParams({ page: queryState.params.page + 1 })}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="xl:sticky xl:top-24 xl:self-start">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Anomaly detail</CardTitle>
                <CardDescription>Selected alert context and supporting transaction fields.</CardDescription>
              </div>
              {queryState.anomalyId !== null ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateSearchParams({ anomalyId: null })}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {queryState.anomalyId === null ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Select an anomaly to inspect the full detail.
              </div>
            ) : anomalyDetailQuery.isLoading ? (
              <>
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </>
            ) : anomalyDetailQuery.isError || !anomalyDetailQuery.data ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Unable to load that anomaly right now.
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border bg-muted/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {anomalyDetailQuery.data.entityName || "Unknown merchant"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {anomalyDetailQuery.data.txnDate
                          ? formatDate(anomalyDetailQuery.data.txnDate)
                          : "Date unavailable"}
                      </p>
                    </div>
                    <SeverityBadge severity={anomalyDetailQuery.data.severity} />
                  </div>
                  <p className="mt-3 text-sm text-foreground">
                    {anomalyDetailQuery.data.description}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-foreground">
                    {anomalyDetailQuery.data.amount !== null
                      ? formatCurrency(anomalyDetailQuery.data.amount)
                      : "—"}
                  </p>
                </div>

                <div className="grid gap-3">
                  <DetailField label="Anomaly type" value={anomalyDetailQuery.data.anomalyType} />
                  <DetailField
                    label="Transaction type"
                    value={anomalyDetailQuery.data.txnType || "Unknown"}
                  />
                  <DetailField
                    label="Category"
                    value={anomalyDetailQuery.data.categoryName || "Uncategorized"}
                  />
                  <DetailField
                    label="Source"
                    value={anomalyDetailQuery.data.source || "Unknown source"}
                  />
                  <DetailField
                    label="Created at"
                    value={formatDateTime(anomalyDetailQuery.data.createdAt)}
                  />
                  <DetailField
                    label="Raw details"
                    value={anomalyDetailQuery.data.rawDetails || "No raw details available"}
                  />
                </div>

                {anomalyDetailQuery.data.txnId !== null ? (
                  <Button asChild type="button" variant="outline" className="w-full">
                    <Link to={`/transactions?txnId=${anomalyDetailQuery.data.txnId}`}>
                      Open supporting transaction
                    </Link>
                  </Button>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
