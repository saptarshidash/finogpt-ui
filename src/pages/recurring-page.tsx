import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Clock3, SearchX, X } from "lucide-react"
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
import { getRecurring, getRecurringDetail, getRecurringFilters, recurringQueryKeys } from "@/features/recurring/recurring-api"
import type { RecurringListItem, RecurringQueryParams } from "@/features/recurring/recurring-types"
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

function formatDateTime(value: string) {
  return formatDate(value, "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function EmptyRecurringState({
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
      <p className="mt-4 text-sm font-medium text-foreground">No recurring items found</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasFilters
          ? "Adjust the current filters or clear them to broaden the result set."
          : "Recurring signals will appear here once the backend identifies matching patterns."}
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

function RecurringRow({
  item,
  isSelected,
  onSelect,
}: {
  item: RecurringListItem
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
          <p className="text-sm font-medium text-foreground">{item.entityName || "Unknown merchant"}</p>
          <p className="text-sm text-muted-foreground">
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
          <p className="mt-1 text-xs text-muted-foreground">Average amount</p>
        </div>
      </div>
    </button>
  )
}

export function RecurringPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const queryState = useMemo(() => {
    const params: RecurringQueryParams = {
      categoryId: parseNumberParam(searchParams.get("categoryId")),
      entityId: parseNumberParam(searchParams.get("entityId")),
      page: parsePageParam(searchParams.get("page")),
      size: PAGE_SIZE,
    }

    return {
      params,
      recurringId: parseNumberParam(searchParams.get("recurringId")) ?? null,
    }
  }, [searchParams])

  const filtersQuery = useQuery({
    queryKey: recurringQueryKeys.filters,
    queryFn: getRecurringFilters,
    staleTime: 5 * 60_000,
  })

  const recurringQuery = useQuery({
    queryKey: recurringQueryKeys.list(queryState.params),
    queryFn: () => getRecurring(queryState.params),
    placeholderData: (previousData) => previousData,
  })

  const recurringDetailQuery = useQuery({
    queryKey: recurringQueryKeys.detail(queryState.recurringId ?? 0),
    queryFn: () => getRecurringDetail(queryState.recurringId!),
    enabled: queryState.recurringId !== null,
  })

  const hasActiveFilters = Boolean(
    queryState.params.entityId || queryState.params.categoryId,
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
        for (const key of ["entityId", "categoryId", "page", "recurringId"]) {
          nextParams.delete(key)
        }
        return nextParams
      },
      { replace: true },
    )
  }

  const recurringItems = recurringQuery.data?.items ?? []
  const filterOptions = filtersQuery.data ?? { categories: [], entities: [] }
  const pagination = recurringQuery.data
    ? {
        hasNextPage: recurringQuery.data.page + 1 < recurringQuery.data.totalPages,
        hasPreviousPage: recurringQuery.data.page > 0,
        label: `Page ${recurringQuery.data.page + 1} of ${Math.max(
          recurringQuery.data.totalPages,
          1,
        )}`,
      }
    : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge>Recurring</Badge>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">Recurring workspace</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Inspect recurring spend candidates, due-soon items, and the recent matched transactions behind each signal.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {recurringQuery.data
              ? `${recurringQuery.data.totalItems.toLocaleString("en-IN")} recurring items`
              : "Loading recurring items"}
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
          <CardTitle>Recurring filters</CardTitle>
          <CardDescription>Filter the recurring candidates by merchant or category.</CardDescription>
        </CardHeader>
        <CardContent>
          {filtersQuery.isLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : filtersQuery.isError ? (
            <div className="rounded-lg border border-border bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Unable to load recurring filters right now.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Merchant</span>
                <select
                  value={queryState.params.entityId ?? ""}
                  onChange={(event) =>
                    updateSearchParams({
                      entityId: event.target.value,
                      page: 0,
                      recurringId: null,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <option value="">All merchants</option>
                  {filterOptions.entities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Category</span>
                <select
                  value={queryState.params.categoryId ?? ""}
                  onChange={(event) =>
                    updateSearchParams({
                      categoryId: event.target.value,
                      page: 0,
                      recurringId: null,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <option value="">All categories</option>
                  {filterOptions.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
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
            <CardTitle>Recurring candidates</CardTitle>
            <CardDescription>Due-soon and average-amount signals identified by the backend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recurringQuery.isLoading ? (
              <>
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </>
            ) : recurringQuery.isError ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Unable to load recurring signals right now.
              </div>
            ) : !recurringItems.length ? (
              <EmptyRecurringState hasFilters={hasActiveFilters} onReset={resetFilters} />
            ) : (
              <>
                <div className="space-y-3">
                  {recurringItems.map((item) => (
                    <RecurringRow
                      key={item.id}
                      item={item}
                      isSelected={item.id === queryState.recurringId}
                      onSelect={() => updateSearchParams({ recurringId: item.id })}
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
                <CardTitle>Recurring detail</CardTitle>
                <CardDescription>Selected recurring signal with the recent transactions behind it.</CardDescription>
              </div>
              {queryState.recurringId !== null ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateSearchParams({ recurringId: null })}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {queryState.recurringId === null ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Select a recurring candidate to inspect the full detail.
              </div>
            ) : recurringDetailQuery.isLoading ? (
              <>
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </>
            ) : recurringDetailQuery.isError || !recurringDetailQuery.data ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Unable to load that recurring detail right now.
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border bg-muted/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {recurringDetailQuery.data.entityName || "Unknown merchant"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {recurringDetailQuery.data.categoryName || "Uncategorized"}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-medium text-primary dark:border-primary/25 dark:bg-primary/12 dark:text-primary">
                      <Clock3 className="size-3.5" />
                      {recurringDetailQuery.data.frequencyDays
                        ? `Every ${recurringDetailQuery.data.frequencyDays} days`
                        : "Pattern pending"}
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-foreground">
                    {recurringDetailQuery.data.avgAmount !== null
                      ? formatCurrency(recurringDetailQuery.data.avgAmount)
                      : "—"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Average amount</p>
                </div>

                <div className="grid gap-3">
                  <DetailField
                    label="Next expected"
                    value={
                      recurringDetailQuery.data.nextExpectedDate
                        ? formatDate(recurringDetailQuery.data.nextExpectedDate)
                        : "Date unavailable"
                    }
                  />
                  <DetailField
                    label="Last seen"
                    value={
                      recurringDetailQuery.data.lastSeen
                        ? formatDate(recurringDetailQuery.data.lastSeen)
                        : "Date unavailable"
                    }
                  />
                  <DetailField
                    label="Created at"
                    value={formatDateTime(recurringDetailQuery.data.createdAt)}
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Recent transactions</p>
                    <p className="text-xs text-muted-foreground">
                      Matched transaction history for this recurring pattern.
                    </p>
                  </div>

                  {recurringDetailQuery.data.recentTransactions.length ? (
                    recurringDetailQuery.data.recentTransactions.map((transaction) => (
                      <Link
                        key={transaction.id}
                        to={`/transactions?txnId=${transaction.id}`}
                        className="block rounded-lg border border-border bg-muted/40 px-4 py-3 transition-colors hover:bg-accent/60"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {formatDate(transaction.txnDate)}
                            </p>
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                              {transaction.rawDetails || transaction.categoryName || "No details available"}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(transaction.amount)}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-lg border border-border bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
                      No recent transactions are available for this recurring signal yet.
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
