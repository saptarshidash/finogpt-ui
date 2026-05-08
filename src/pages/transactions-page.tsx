import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Filter,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getTransactionDetail,
  getTransactionFilters,
  getTransactions,
  transactionsQueryKeys,
} from "@/features/transactions/transactions-api"
import type {
  TransactionDetail,
  TransactionListItem,
  TransactionSortBy,
  TransactionSortDir,
  TransactionType,
  TransactionsQueryParams,
} from "@/features/transactions/transactions-types"
import { formatCurrency } from "@/lib/format/currency"
import { formatDate } from "@/lib/format/date"
import { cn } from "@/lib/utils/cn"

const PAGE_SIZE = 20
const DEFAULT_SORT_BY: TransactionSortBy = "txnDate"
const DEFAULT_SORT_DIR: TransactionSortDir = "desc"

function isTransactionType(value: string | null): value is TransactionType {
  return value === "DEBIT" || value === "CREDIT"
}

function isSortBy(value: string | null): value is TransactionSortBy {
  return value === "txnDate" || value === "amount" || value === "createdAt"
}

function isSortDir(value: string | null): value is TransactionSortDir {
  return value === "asc" || value === "desc"
}

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

function getTypeTone(type: TransactionType | null) {
  if (type === "CREDIT") {
    return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300"
  }

  if (type === "DEBIT") {
    return "border-primary/20 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/12 dark:text-primary"
  }

  return "border-border bg-muted/60 text-muted-foreground"
}

function TransactionTypeBadge({ type }: { type: TransactionType | null }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        getTypeTone(type),
      )}
    >
      {type ?? "Unknown"}
    </span>
  )
}

function EmptyTransactionsState({
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
      <p className="mt-4 text-sm font-medium text-foreground">No transactions found</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasFilters
          ? "Adjust the current filters or clear them to broaden the result set."
          : "Transactions will appear here once statement or UPI data is available."}
      </p>
      {hasFilters ? (
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onReset}>
          Clear filters
        </Button>
      ) : null}
    </div>
  )
}

function DetailField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="space-y-1 rounded-md border border-border bg-muted/40 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="break-words text-sm text-foreground">{value}</p>
    </div>
  )
}

function TransactionDetailContent({
  transaction,
}: {
  transaction: TransactionDetail
}) {
  return (
    <>
      <div className="rounded-lg border border-border bg-muted/60 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {transaction.entityName || "Unknown merchant"}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(transaction.txnDate)}
              {transaction.txnTime ? ` • ${transaction.txnTime}` : ""}
            </p>
          </div>
          <TransactionTypeBadge type={transaction.txnType} />
        </div>
        <p className="mt-3 text-2xl font-semibold text-foreground">
          {formatCurrency(transaction.amount)}
        </p>
      </div>

      <div className="grid gap-3">
        <DetailField
          label="Category"
          value={transaction.categoryName || "Uncategorized"}
        />
        <DetailField
          label="Source"
          value={transaction.source || "Unknown source"}
        />
        <DetailField
          label="External transaction ID"
          value={transaction.externalTxnId || "Not available"}
        />
        <DetailField
          label="Ingestion job ID"
          value={transaction.ingestionJobId || "Not linked"}
        />
        <DetailField
          label="Created at"
          value={formatDateTime(transaction.createdAt)}
        />
        <DetailField
          label="Raw details"
          value={transaction.rawDetails || "No raw details available"}
        />
      </div>
    </>
  )
}

function MobileTransactionCard({
  isSelected,
  onSelect,
  transaction,
}: {
  isSelected: boolean
  onSelect: () => void
  transaction: TransactionListItem
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border border-border bg-card px-4 py-4 text-left shadow-sm transition-colors",
        isSelected
          ? "border-primary/30 bg-accent/50"
          : "hover:bg-accent/40",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <TransactionTypeBadge type={transaction.txnType} />
            <span className="text-xs text-muted-foreground">
              {formatDate(transaction.txnDate)}
              {transaction.txnTime ? ` • ${transaction.txnTime}` : ""}
            </span>
          </div>
          <p className="truncate text-sm font-semibold text-foreground">
            {transaction.entityName || "Unknown merchant"}
          </p>
          <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
            {transaction.rawDetails || "No details available"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold text-foreground">
            {formatCurrency(transaction.amount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {transaction.categoryName || "Uncategorized"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/80 pt-3">
        <div className="min-w-0 text-xs text-muted-foreground">
          <span className="truncate">{transaction.source || "Unknown source"}</span>
        </div>
        <span className="text-xs font-medium text-primary">
          View details
        </span>
      </div>
    </button>
  )
}

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isControlsOpen, setIsControlsOpen] = useState(false)

  const queryState = useMemo(() => {
    const typeParam = searchParams.get("type")
    const sortByParam = searchParams.get("sortBy")
    const sortDirParam = searchParams.get("sortDir")

    const params: TransactionsQueryParams = {
      categoryId: parseNumberParam(searchParams.get("categoryId")),
      entityId: parseNumberParam(searchParams.get("entityId")),
      from: searchParams.get("from") || undefined,
      page: parsePageParam(searchParams.get("page")),
      size: PAGE_SIZE,
      sortBy: isSortBy(sortByParam) ? sortByParam : DEFAULT_SORT_BY,
      sortDir: isSortDir(sortDirParam) ? sortDirParam : DEFAULT_SORT_DIR,
      to: searchParams.get("to") || undefined,
      type: isTransactionType(typeParam) ? typeParam : undefined,
    }

    return {
      params,
      txnId: parseNumberParam(searchParams.get("txnId")) ?? null,
    }
  }, [searchParams])

  const filtersQuery = useQuery({
    queryKey: transactionsQueryKeys.filters,
    queryFn: getTransactionFilters,
    staleTime: 5 * 60_000,
  })

  const transactionsQuery = useQuery({
    queryKey: transactionsQueryKeys.list(queryState.params),
    queryFn: () => getTransactions(queryState.params),
    placeholderData: (previousData) => previousData,
  })

  const transactionDetailQuery = useQuery({
    queryKey: transactionsQueryKeys.detail(queryState.txnId ?? 0),
    queryFn: () => getTransactionDetail(queryState.txnId!),
    enabled: queryState.txnId !== null,
  })

  const hasActiveFilters = Boolean(
    queryState.params.from ||
      queryState.params.to ||
      queryState.params.type ||
      queryState.params.entityId ||
      queryState.params.categoryId,
  )
  const activeFilterCount = [
    queryState.params.from,
    queryState.params.to,
    queryState.params.type,
    queryState.params.entityId,
    queryState.params.categoryId,
  ].filter(Boolean).length

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

  function updateFilter(key: string, value: string) {
    updateSearchParams({
      [key]: value,
      page: 0,
    })
  }

  function resetFilters() {
    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams)
        for (const key of [
          "from",
          "to",
          "type",
          "entityId",
          "categoryId",
          "page",
          "txnId",
          "sortBy",
          "sortDir",
        ]) {
          nextParams.delete(key)
        }
        return nextParams
      },
      { replace: true },
    )
  }

  const transactions = transactionsQuery.data?.items ?? []
  const pagination = transactionsQuery.data
    ? {
        hasNextPage: transactionsQuery.data.page + 1 < transactionsQuery.data.totalPages,
        hasPreviousPage: transactionsQuery.data.page > 0,
        label: `Page ${transactionsQuery.data.page + 1} of ${Math.max(
          transactionsQuery.data.totalPages,
          1,
        )}`,
      }
    : null

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge>Transactions</Badge>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">Transactions workspace</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Filter raw transaction rows, sort them for investigation, and inspect the source details without leaving the workspace.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {transactionsQuery.data
              ? `${transactionsQuery.data.totalItems.toLocaleString("en-IN")} results`
              : "Loading results"}
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
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-md border border-border bg-muted/60 p-2 text-primary">
                  <Filter className="size-4" />
                </div>
                <div>
                  <CardTitle>Filters and sorting</CardTitle>
                  <CardDescription>
                    URL query params mirror the active transaction workspace state.
                  </CardDescription>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="md:hidden"
                onClick={() => setIsControlsOpen((currentState) => !currentState)}
                aria-expanded={isControlsOpen}
                aria-label={isControlsOpen ? "Hide filters and sorting" : "Show filters and sorting"}
              >
                {isControlsOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                {isControlsOpen ? "Hide" : "Filters"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 md:hidden">
              <Badge variant="outline">{queryState.params.sortBy}</Badge>
              <Badge variant="outline">{queryState.params.sortDir}</Badge>
              {activeFilterCount ? (
                <Badge variant="outline">{activeFilterCount} filters</Badge>
              ) : (
                <Badge variant="outline">No filters</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className={cn("space-y-4", !isControlsOpen && "hidden md:block")}>
          {filtersQuery.isLoading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : filtersQuery.isError ? (
            <div className="rounded-lg border border-border bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Unable to load transaction filters right now.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">From date</span>
                  <Input
                    type="date"
                    value={queryState.params.from ?? ""}
                    min={filtersQuery.data?.minDate ?? undefined}
                    max={queryState.params.to ?? filtersQuery.data?.maxDate ?? undefined}
                    onChange={(event) => updateFilter("from", event.target.value)}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">To date</span>
                  <Input
                    type="date"
                    value={queryState.params.to ?? ""}
                    min={queryState.params.from ?? filtersQuery.data?.minDate ?? undefined}
                    max={filtersQuery.data?.maxDate ?? undefined}
                    onChange={(event) => updateFilter("to", event.target.value)}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Type</span>
                  <select
                    value={queryState.params.type ?? ""}
                    onChange={(event) => updateFilter("type", event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <option value="">All transaction types</option>
                    {filtersQuery.data?.types.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Merchant</span>
                  <select
                    value={queryState.params.entityId ?? ""}
                    onChange={(event) => updateFilter("entityId", event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <option value="">All merchants</option>
                    {filtersQuery.data?.entities.map((entity) => (
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
                    onChange={(event) => updateFilter("categoryId", event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <option value="">All categories</option>
                    {filtersQuery.data?.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <SlidersHorizontal className="size-4" />
                    Sort order
                  </span>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <select
                      value={queryState.params.sortBy}
                      onChange={(event) =>
                        updateSearchParams({
                          page: 0,
                          sortBy: event.target.value,
                        })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <option value="txnDate">Transaction date</option>
                      <option value="amount">Amount</option>
                      <option value="createdAt">Created at</option>
                    </select>
                    <div className="flex rounded-md border border-border bg-muted/60 p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "px-3",
                          queryState.params.sortDir === "desc" &&
                            "bg-card text-foreground shadow-sm",
                        )}
                        onClick={() => updateSearchParams({ page: 0, sortDir: "desc" })}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "px-3",
                          queryState.params.sortDir === "asc" &&
                            "bg-card text-foreground shadow-sm",
                        )}
                        onClick={() => updateSearchParams({ page: 0, sortDir: "asc" })}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {hasActiveFilters ? (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  {queryState.params.from ? <Badge variant="outline">From {queryState.params.from}</Badge> : null}
                  {queryState.params.to ? <Badge variant="outline">To {queryState.params.to}</Badge> : null}
                  {queryState.params.type ? <Badge variant="outline">{queryState.params.type}</Badge> : null}
                  {queryState.params.entityId ? (
                    <Badge variant="outline">
                      Merchant{" "}
                      {filtersQuery.data?.entities.find(
                        (entity) => entity.id === queryState.params.entityId,
                      )?.name ?? queryState.params.entityId}
                    </Badge>
                  ) : null}
                  {queryState.params.categoryId ? (
                    <Badge variant="outline">
                      Category{" "}
                      {filtersQuery.data?.categories.find(
                        (category) => category.id === queryState.params.categoryId,
                      )?.name ?? queryState.params.categoryId}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_24rem]">
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Transaction table</CardTitle>
                <CardDescription>
                  Sorted by {queryState.params.sortBy} in {queryState.params.sortDir} order.
                </CardDescription>
              </div>
              <Badge variant="outline">
                <ArrowUpDown className="mr-1 size-3.5" />
                {queryState.params.size} rows per page
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {transactionsQuery.isLoading ? (
              <>
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </>
            ) : transactionsQuery.isError ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Unable to load transactions right now.
              </div>
            ) : !transactions.length ? (
              <EmptyTransactionsState hasFilters={hasActiveFilters} onReset={resetFilters} />
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {transactions.map((transaction) => (
                    <MobileTransactionCard
                      key={transaction.id}
                      transaction={transaction}
                      isSelected={transaction.id === queryState.txnId}
                      onSelect={() => updateSearchParams({ txnId: transaction.id })}
                    />
                  ))}
                </div>

                <div className="hidden max-w-full overflow-x-auto rounded-lg border border-border md:block">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted/60 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Merchant</th>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Source</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {transactions.map((transaction) => {
                        const isSelected = transaction.id === queryState.txnId

                        return (
                          <tr
                            key={transaction.id}
                            className={cn(
                              "cursor-pointer transition-colors hover:bg-accent/50",
                              isSelected && "bg-accent/60",
                            )}
                            onClick={() => updateSearchParams({ txnId: transaction.id })}
                          >
                            <td className="px-4 py-3 text-muted-foreground">
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">
                                  {formatDate(transaction.txnDate)}
                                </p>
                                <p className="text-xs">
                                  {transaction.txnTime || "Time unavailable"}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">
                                {transaction.entityName || "Unknown merchant"}
                              </p>
                              <p className="line-clamp-1 text-xs text-muted-foreground">
                                {transaction.rawDetails || "No details available"}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {transaction.categoryName || "Uncategorized"}
                            </td>
                            <td className="px-4 py-3">
                              <TransactionTypeBadge type={transaction.txnType} />
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {transaction.source || "Unknown source"}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-foreground">
                              {formatCurrency(transaction.amount)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {pagination ? (
                  <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarRange className="size-4" />
                      <span>{pagination.label}</span>
                    </div>
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

        <Card className="hidden min-w-0 xl:sticky xl:top-24 xl:self-start md:block">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Transaction detail</CardTitle>
                <CardDescription>
                  Selected row details, source fields, and ingestion linkage.
                </CardDescription>
              </div>
              {queryState.txnId !== null ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateSearchParams({ txnId: null })}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {queryState.txnId === null ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Select a transaction row to inspect the full details.
              </div>
            ) : transactionDetailQuery.isLoading ? (
              <>
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </>
            ) : transactionDetailQuery.isError || !transactionDetailQuery.data ? (
              <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Unable to load that transaction right now.
              </div>
            ) : (
              <TransactionDetailContent transaction={transactionDetailQuery.data} />
            )}
          </CardContent>
        </Card>
      </section>

      {queryState.txnId !== null ? (
        <div className="fixed inset-0 z-50 animate-in fade-in-0 duration-200 md:hidden">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => updateSearchParams({ txnId: null })}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto rounded-t-2xl border-t border-border bg-background px-4 pb-6 pt-4 shadow-[0_-20px_48px_rgba(2,13,26,0.28)] animate-in slide-in-from-bottom-8 fade-in-0 duration-300 ease-out">
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-border" />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Transaction detail
                </h2>
                <p className="text-sm text-muted-foreground">
                  Full transaction context and source metadata.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => updateSearchParams({ txnId: null })}
                aria-label="Close transaction detail"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {transactionDetailQuery.isLoading ? (
                <>
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-28 w-full rounded-lg" />
                </>
              ) : transactionDetailQuery.isError || !transactionDetailQuery.data ? (
                <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                  Unable to load that transaction right now.
                </div>
              ) : (
                <TransactionDetailContent transaction={transactionDetailQuery.data} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
