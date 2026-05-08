import type { FormEvent, ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  History,
  LoaderCircle,
  Menu,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { useSearchParams } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  deleteQueryHistory,
  getQueryHistory,
  getQueryHistoryDetail,
  queryWorkspaceKeys,
  submitQuery,
} from "@/features/query/query-api"
import type {
  ClarificationOption,
  QueryDecision,
  QueryHistoryItem,
  QueryHistoryParams,
  QueryMetadata,
  QueryRequest,
  QueryResponse,
} from "@/features/query/query-types"
import { formatCurrency } from "@/lib/format/currency"
import { formatDate } from "@/lib/format/date"
import { cn } from "@/lib/utils/cn"

const HISTORY_PAGE_SIZE = 20
const STREAM_CHUNK_SIZE = 8
const STREAM_DELAY_MS = 18

type ResultTab = "rendered" | "raw" | "debug"
type AssistantAction = "EXECUTE" | "CLARIFY" | "UNSUPPORTED" | "FAILED"

type UserChatMessage = {
  id: string
  role: "user"
  text: string
}

type AssistantResponseMessage = {
  id: string
  role: "assistant"
  kind: "response"
  response: QueryResponse
  source: "live" | "history"
}

type AssistantErrorMessage = {
  id: string
  role: "assistant"
  kind: "error"
  text: string
  source: "live"
}

type ChatMessage = UserChatMessage | AssistantResponseMessage | AssistantErrorMessage

type ClarificationSession = {
  error: string | null
  messageId: string
  pending: boolean
  pendingType: string | null
  selectedOptionIdsByType: Record<string, number[]>
  token: string
}

function parsePageParam(value: string | null) {
  if (!value) {
    return 0
  }

  const parsedValue = Number(value)
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : 0
}

function formatDateTime(value: string | number | Date) {
  return formatDate(value, "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatConfidence(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "—"
  }

  return `${Math.round(value * 100)}%`
}

function formatList(values: string[] | number[] | null | undefined) {
  if (!values?.length) {
    return "—"
  }

  return values.join(", ")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function normalizeQueryResponse(value: unknown): QueryResponse | null {
  if (typeof value === "string") {
    try {
      return normalizeQueryResponse(JSON.parse(value))
    } catch {
      return null
    }
  }

  if (!isRecord(value)) {
    return null
  }

  if ("success" in value && "data" in value) {
    return normalizeQueryResponse(value.data)
  }

  if (typeof value.answer !== "string") {
    return null
  }

  const rawData = "data" in value ? value.data : []
  let normalizedRows: Record<string, unknown>[] = []

  if (Array.isArray(rawData)) {
    normalizedRows = rawData.map((item) => (isRecord(item) ? item : { value: item }))
  } else if (isRecord(rawData)) {
    normalizedRows = [rawData]
  }

  return {
    answer: value.answer,
    data: normalizedRows,
    decision:
      "decision" in value && (isRecord(value.decision) || value.decision === null)
        ? (value.decision as QueryDecision | null)
        : null,
    metadata:
      "metadata" in value && (isRecord(value.metadata) || value.metadata === null)
        ? (value.metadata as QueryMetadata | null)
        : null,
  }
}

function normalizeKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase()
}

function isDateLikeString(value: string) {
  return /(\d{4}-\d{2}-\d{2})|(\d{2}:\d{2})|T\d{2}:\d{2}/.test(value)
}

function isTimeOnlyString(value: string) {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(value)
}

function isDateLikeKey(key: string) {
  return /(date|time|at|period|month|year)$/i.test(key) || /(date|time|period)/i.test(key)
}

function isCurrencyLikeKey(key: string) {
  return /(amount|spend|debit|credit|balance|cashflow|expense|income|revenue|avg|average|total(?!.*count))/i.test(
    key,
  )
}

function isCountLikeKey(key: string) {
  return /(count|txn|transaction|rows|items|volume|frequency|occurrence|number)/i.test(
    key,
  )
}

function isPercentLikeKey(key: string) {
  return /(percent|percentage|ratio|share|confidence|rate)/i.test(key)
}

function getColumnPriority(key: string) {
  if (/(name|label|merchant|entity|category)/i.test(key)) {
    return 0
  }

  if (/(date|time|period)/i.test(key)) {
    return 1
  }

  if (/(amount|spend|debit|credit|balance|total|avg|average)/i.test(key)) {
    return 2
  }

  if (/(count|txn|transaction|rows|items)/i.test(key)) {
    return 3
  }

  if (/id$/i.test(key)) {
    return 4
  }

  return 5
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—"
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  if (Array.isArray(value)) {
    return value.length ? value.map((item) => formatValue(item)).join(", ") : "—"
  }

  if (isRecord(value)) {
    const parts = Object.entries(value).map(([key, nestedValue]) => {
      return `${formatLabel(key)}: ${formatValue(nestedValue)}`
    })

    return parts.length ? parts.join(" • ") : "—"
  }

  if (typeof value === "number") {
    return value.toLocaleString("en-IN")
  }

  return String(value)
}

function buildResultColumns(rows: Record<string, unknown>[]) {
  const keys = new Set<string>()

  for (const row of rows) {
    Object.keys(row).forEach((key) => keys.add(key))
  }

  return Array.from(keys).sort((left, right) => {
    const priorityDiff = getColumnPriority(left) - getColumnPriority(right)

    if (priorityDiff !== 0) {
      return priorityDiff
    }

    return left.localeCompare(right)
  })
}

function buildMessageId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function getClarificationPayload(
  clarificationToken: string,
  optionType: string,
  selectedOptionIds: number[],
): QueryRequest {
  const normalizedType = optionType.toUpperCase()

  if (normalizedType.includes("CATEGORY")) {
    return {
      clarificationToken,
      selectedCategoryIds: selectedOptionIds,
    }
  }

  return {
    clarificationToken,
    selectedEntityIds: selectedOptionIds,
  }
}

function groupClarificationOptions(options: ClarificationOption[]) {
  const groups = new Map<string, ClarificationOption[]>()

  for (const option of options) {
    const normalizedType = option.type.toUpperCase()
    const groupOptions = groups.get(normalizedType)

    if (groupOptions) {
      groupOptions.push(option)
    } else {
      groups.set(normalizedType, [option])
    }
  }

  return Array.from(groups.entries())
}

function updateSearchParams(
  searchParams: URLSearchParams,
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  nextValues: Record<string, string | number | null | undefined>,
) {
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

function getDecisionAction(decision: QueryDecision | null): AssistantAction {
  const normalizedAction = decision?.action?.toUpperCase()

  if (normalizedAction === "UNSUPPORTED") {
    return "UNSUPPORTED"
  }

  if (normalizedAction === "FAILED") {
    return "FAILED"
  }

  if (decision?.requiresClarification) {
    return "CLARIFY"
  }

  return "EXECUTE"
}

function getActionTone(action: AssistantAction) {
  switch (action) {
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
    case "UNSUPPORTED":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300"
    case "CLARIFY":
      return "border-primary/20 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/12 dark:text-primary"
    default:
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300"
  }
}

function getActionLabel(action: AssistantAction) {
  switch (action) {
    case "CLARIFY":
      return "Clarify"
    case "FAILED":
      return "Failed"
    case "UNSUPPORTED":
      return "Unsupported"
    default:
      return "Executed"
  }
}

function getExactRangeLabel(metadata: QueryMetadata | null) {
  const fromDate = metadata?.timeWindow?.fromDate
  const toDate = metadata?.timeWindow?.toDate

  if (!fromDate || !toDate) {
    return null
  }

  return `${formatDate(fromDate)} to ${formatDate(toDate)}`
}

function formatTableCell(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—"
  }

  if (typeof value === "number") {
    if (isDateLikeKey(key)) {
      return /(time|at)$/i.test(key) ? formatDateTime(value) : formatDate(value)
    }

    if (isPercentLikeKey(key) && value >= 0 && value <= 1) {
      return formatConfidence(value)
    }

    if (isCurrencyLikeKey(key)) {
      return formatCurrency(value)
    }

    return value.toLocaleString("en-IN")
  }

  if (typeof value === "string") {
    if (/(time|at)$/i.test(key) && isTimeOnlyString(value)) {
      return value.slice(0, 5)
    }

    if (isDateLikeKey(key) && isDateLikeString(value)) {
      return /(time|at)$/i.test(key) || value.includes("T")
        ? formatDateTime(value)
        : formatDate(value)
    }

    return value
  }

  return formatValue(value)
}

function looksTransactionLikeRows(rows: Record<string, unknown>[], metadata: QueryMetadata | null) {
  if (metadata?.intent?.toUpperCase() === "LIST") {
    return true
  }

  const normalizedKeys = new Set(
    rows.flatMap((row) => Object.keys(row).map((key) => normalizeKey(key))),
  )

  const transactionKeys = ["txn_date", "txn_time", "amount", "entity_name", "category_name"]
  const matchCount = transactionKeys.filter((key) => normalizedKeys.has(key)).length

  return matchCount >= 3 && normalizedKeys.has("amount")
}

function buildNormalizedKeyMap(rows: Record<string, unknown>[]) {
  const keyMap = new Map<string, string>()

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      const normalizedKey = normalizeKey(key)

      if (!keyMap.has(normalizedKey)) {
        keyMap.set(normalizedKey, key)
      }
    }
  }

  return keyMap
}

function TransactionResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  const keyMap = useMemo(() => buildNormalizedKeyMap(rows), [rows])

  const columns = [
    { key: "txn_date", label: "Txn date" },
    { key: "txn_time", label: "Time" },
    { key: "txn_type", label: "Type" },
    { key: "entity_name", label: "Merchant" },
    { key: "category_name", label: "Category" },
    { key: "amount", label: "Amount" },
    { key: "source", label: "Source" },
  ].filter((column) => keyMap.has(column.key))

  const remainingColumns = Array.from(keyMap.entries())
    .filter(([normalizedKey]) => !columns.some((column) => column.key === normalizedKey))
    .map(([normalizedKey, actualKey]) => ({
      key: normalizedKey,
      label: formatLabel(normalizedKey),
      actualKey,
    }))

  const allColumns = [
    ...columns.map((column) => ({
      key: column.key,
      label: column.label,
      actualKey: keyMap.get(column.key)!,
    })),
    ...remainingColumns,
  ]

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
      <div className="flex flex-col gap-3 border-b border-border/80 bg-muted/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground">
            <Database className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Transactions</p>
            <p className="text-xs text-muted-foreground">
              Row-level results formatted as a transaction workspace table.
            </p>
          </div>
        </div>

        <Badge variant="outline">{rows.length.toLocaleString("en-IN")} rows</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {allColumns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "whitespace-nowrap border-b border-border/80 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground",
                    column.key === "amount" && "text-right",
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="align-top transition-colors odd:bg-background even:bg-muted/[0.18] hover:bg-accent/30"
              >
                {allColumns.map((column) => (
                  <td
                    key={`${rowIndex}-${column.key}`}
                    className={cn(
                      "max-w-72 border-b border-border/60 px-4 py-3.5 text-foreground",
                      column.key === "amount" && "text-right",
                    )}
                  >
                    <span
                      className={cn(
                        "block break-words",
                        column.key === "amount" && "font-medium tabular-nums",
                      )}
                    >
                      {formatTableCell(column.actualKey, row[column.actualKey])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GenericResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = useMemo(() => buildResultColumns(rows), [rows])

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
      <div className="flex flex-col gap-3 border-b border-border/80 bg-muted/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground">
            <Database className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Structured results</p>
            <p className="text-xs text-muted-foreground">
              Aggregate analytics and dynamic rows rendered directly from backend data.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{rows.length.toLocaleString("en-IN")} rows</Badge>
          <Badge variant="outline">{columns.length.toLocaleString("en-IN")} columns</Badge>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className={cn(
                    "whitespace-nowrap border-b border-border/80 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground",
                    (isCurrencyLikeKey(column) || isCountLikeKey(column)) && "text-right",
                  )}
                >
                  {formatLabel(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="align-top transition-colors odd:bg-background even:bg-muted/[0.18] hover:bg-accent/30"
              >
                {columns.map((column) => (
                  <td
                    key={`${rowIndex}-${column}`}
                    className={cn(
                      "max-w-72 border-b border-border/60 px-4 py-3.5 text-foreground",
                      (isCurrencyLikeKey(column) || isCountLikeKey(column)) && "text-right",
                    )}
                  >
                    <span
                      className={cn(
                        "block break-words",
                        /id$/i.test(column) && "font-mono text-xs text-muted-foreground",
                        isCurrencyLikeKey(column) && "font-medium tabular-nums",
                      )}
                    >
                      {formatTableCell(column, row[column])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AggregateSummaryGrid({ row }: { row: Record<string, unknown> }) {
  const entries = Object.entries(row)

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-2xl border border-border/80 bg-card px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {formatLabel(key)}
          </p>
          <p className="mt-2 break-words text-base font-semibold text-foreground">
            {formatTableCell(key, value)}
          </p>
        </div>
      ))}
    </div>
  )
}

function RenderedResultView({ response }: { response: QueryResponse }) {
  const action = getDecisionAction(response.decision)

  if (action === "CLARIFY") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-5">
        <p className="text-sm font-medium text-foreground">Waiting for clarification</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Select one of the options above to continue the query.
        </p>
      </div>
    )
  }

  if (!response.data.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-5">
        <p className="text-sm font-medium text-foreground">No structured rows returned</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This response resolved without a row-based result set.
        </p>
      </div>
    )
  }

  if (looksTransactionLikeRows(response.data, response.metadata)) {
    return <TransactionResultTable rows={response.data} />
  }

  if (response.data.length === 1 && Object.keys(response.data[0]).length <= 6) {
    return <AggregateSummaryGrid row={response.data[0]} />
  }

  return <GenericResultTable rows={response.data} />
}

function RawResultView({ response }: { response: QueryResponse }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-border/80 bg-card p-4 text-xs leading-6 text-foreground">
      {JSON.stringify(response.data, null, 2)}
    </pre>
  )
}

function DebugSection({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words text-sm text-foreground">{value}</p>
    </div>
  )
}

function DebugResultView({ response }: { response: QueryResponse }) {
  const metadata = response.metadata
  const decision = response.decision
  const exactRange = getExactRangeLabel(metadata)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DebugSection label="Action" value={getActionLabel(getDecisionAction(decision))} />
        <DebugSection
          label="Intent"
          value={metadata?.intent ? formatLabel(metadata.intent) : "—"}
        />
        <DebugSection
          label="Query Type"
          value={metadata?.queryType ? formatLabel(metadata.queryType) : "—"}
        />
        <DebugSection
          label="Requested Dimension"
          value={metadata?.requestedDimension ? formatLabel(metadata.requestedDimension) : "—"}
        />
        <DebugSection
          label="Txn Direction"
          value={metadata?.txnDirection ? formatLabel(metadata.txnDirection) : "—"}
        />
        <DebugSection label="Exact Range" value={exactRange ?? "—"} />
        <DebugSection
          label="Entities"
          value={formatList(metadata?.entityNames)}
        />
        <DebugSection
          label="Categories"
          value={formatList(metadata?.categoryNames)}
        />
        <DebugSection
          label="Reason"
          value={decision?.reason ?? "—"}
        />
      </div>

      <pre className="overflow-x-auto rounded-2xl border border-border/80 bg-card p-4 text-xs leading-6 text-foreground">
        {JSON.stringify(
          {
            decision: response.decision,
            metadata: response.metadata,
          },
          null,
          2,
        )}
      </pre>
    </div>
  )
}

function ResponseMetaBadges({
  action,
  exactRange,
  isHistory,
  queryType,
  rowsCount,
}: {
  action: AssistantAction
  exactRange: string | null
  isHistory: boolean
  queryType: string | null | undefined
  rowsCount: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className="gap-1.5">
        <Sparkles className="size-3.5" />
        {isHistory ? "Saved answer" : "AI answer"}
      </Badge>
      <span
        className={cn(
          "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
          getActionTone(action),
        )}
      >
        {getActionLabel(action)}
      </span>
      {queryType ? <Badge variant="outline">{formatLabel(queryType)}</Badge> : null}
      <Badge variant="outline">
        {rowsCount.toLocaleString("en-IN")} {rowsCount === 1 ? "row" : "rows"}
      </Badge>
      {exactRange ? <Badge variant="outline">{exactRange}</Badge> : null}
    </div>
  )
}

function ClarificationPanel({
  disabled,
  messageId,
  onSubmit,
  onToggle,
  options,
  prompt,
  session,
}: {
  disabled: boolean
  messageId: string
  onSubmit: (optionType: string) => void
  onToggle: (option: ClarificationOption) => void
  options: ClarificationOption[]
  prompt: string
  session: ClarificationSession | null
}) {
  const groupedOptions = groupClarificationOptions(options)

  return (
    <div className="rounded-2xl border border-border/80 bg-muted/25 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Clarification needed</p>
        <p className="text-sm text-muted-foreground">{prompt}</p>
      </div>

      <div className="mt-4 space-y-4">
        {groupedOptions.map(([optionType, groupOptions]) => {
          const selectedOptionIds = session?.selectedOptionIdsByType[optionType] ?? []
          const isSubmittingGroup = Boolean(session?.pending && session.pendingType === optionType)

          return (
            <div
              key={`${messageId}-${optionType}`}
              className="rounded-2xl border border-border/80 bg-card p-3"
            >
              <div className="flex flex-col gap-3 border-b border-border/70 px-1 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {formatLabel(optionType)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Select one or more options, then continue with this group.
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => onSubmit(optionType)}
                  disabled={disabled || !selectedOptionIds.length}
                >
                  {isSubmittingGroup ? <LoaderCircle className="size-4 animate-spin" /> : null}
                  Continue
                </Button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {groupOptions.map((option) => {
                  const optionKey = `${messageId}-${option.type}-${option.id}`
                  const isSelected = selectedOptionIds.includes(option.id)

                  return (
                    <button
                      key={optionKey}
                      type="button"
                      onClick={() => onToggle(option)}
                      disabled={disabled}
                      className={cn(
                        "rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-60",
                        isSelected && "border-primary bg-accent/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={cn(
                              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-border bg-card text-transparent",
                              isSelected && "border-primary bg-primary text-primary-foreground",
                            )}
                          >
                            <Check className="size-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium text-foreground">
                              {option.label}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{formatConfidence(option.score)}</Badge>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {session?.error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {session.error}
        </div>
      ) : null}
    </div>
  )
}

function DecisionBanner({
  action,
  reason,
}: {
  action: AssistantAction
  reason: string | null
}) {
  if (action === "EXECUTE") {
    return null
  }

  const label =
    action === "UNSUPPORTED"
      ? "This request is not supported by the current query workspace."
      : action === "FAILED"
        ? "The backend could not complete this request."
        : "This request needs clarification before execution."

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        getActionTone(action),
      )}
    >
      <p className="font-medium">{label}</p>
      {reason ? <p className="mt-1">{reason}</p> : null}
    </div>
  )
}

function ResultTabs({
  activeTab,
  onChange,
}: {
  activeTab: ResultTab
  onChange: (nextTab: ResultTab) => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-muted/20 p-1">
      <Button
        type="button"
        size="sm"
        variant={activeTab === "rendered" ? "secondary" : "ghost"}
        onClick={() => onChange("rendered")}
      >
        <Database className="size-4" />
        Rendered
      </Button>
      <Button
        type="button"
        size="sm"
        variant={activeTab === "raw" ? "secondary" : "ghost"}
        onClick={() => onChange("raw")}
      >
        <Bot className="size-4" />
        Raw
      </Button>
      <Button
        type="button"
        size="sm"
        variant={activeTab === "debug" ? "secondary" : "ghost"}
        onClick={() => onChange("debug")}
      >
        <History className="size-4" />
        Debug
      </Button>
    </div>
  )
}

function AssistantAnswerCard({
  clarificationSession,
  disabled,
  isHistory,
  isStreaming,
  messageId,
  onClarificationSubmit,
  onClarificationToggle,
  response,
  streamingText,
}: {
  clarificationSession: ClarificationSession | null
  disabled: boolean
  isHistory: boolean
  isStreaming: boolean
  messageId: string
  onClarificationSubmit: (optionType: string) => void
  onClarificationToggle: (option: ClarificationOption) => void
  response: QueryResponse
  streamingText: string | null
}) {
  const [activeTab, setActiveTab] = useState<ResultTab>("rendered")
  const visibleAnswer = isStreaming ? streamingText ?? "" : response.answer
  const decision = response.decision
  const action = getDecisionAction(decision)
  const hasClarification = Boolean(
    !isHistory &&
      decision?.requiresClarification &&
      decision.clarificationToken &&
      decision.clarificationOptions.length,
  )
  const exactRange = getExactRangeLabel(response.metadata)

  return (
    <div className="overflow-hidden rounded-[24px] rounded-bl-md border border-border/80 bg-card shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]">
      <div className="border-b border-border/70 bg-muted/20 px-4 py-4">
        <ResponseMetaBadges
          action={action}
          exactRange={exactRange}
          isHistory={isHistory}
          queryType={response.metadata?.queryType}
          rowsCount={response.data.length}
        />
      </div>

      <div className="space-y-5 px-4 py-4">
        <DecisionBanner action={action} reason={decision?.reason ?? null} />

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Answer
          </p>
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">
            {visibleAnswer}
            {isStreaming ? (
              <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse rounded-sm bg-primary" />
            ) : null}
          </p>
        </div>

        {hasClarification ? (
          <ClarificationPanel
            disabled={disabled}
            messageId={messageId}
            onSubmit={onClarificationSubmit}
            onToggle={onClarificationToggle}
            options={decision?.clarificationOptions ?? []}
            prompt={decision?.clarificationQuestion || "Choose one option to continue."}
            session={clarificationSession}
          />
        ) : null}

        {!isStreaming ? (
          <div className="space-y-4">
            <ResultTabs activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === "rendered" ? (
              <RenderedResultView response={response} />
            ) : activeTab === "raw" ? (
              <RawResultView response={response} />
            ) : (
              <DebugResultView response={response} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground">
        <Bot className="size-4" />
      </div>
      <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-muted-foreground/60 animate-pulse" />
          <span
            className="size-2 rounded-full bg-muted-foreground/60 animate-pulse"
            style={{ animationDelay: "120ms" }}
          />
          <span
            className="size-2 rounded-full bg-muted-foreground/60 animate-pulse"
            style={{ animationDelay: "240ms" }}
          />
        </div>
      </div>
    </div>
  )
}

function SuggestionButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-border/80 bg-card px-4 py-4 text-left text-sm text-foreground shadow-sm transition-[transform,background-color,border-color] hover:-translate-y-0.5 hover:border-border hover:bg-accent/50"
    >
      <span className="block font-medium leading-6">{label}</span>
    </button>
  )
}

function HistoryListRow({
  historyItem,
  isDeleting,
  isSelected,
  onDelete,
  onSelect,
}: {
  historyItem: QueryHistoryItem
  isDeleting: boolean
  isSelected: boolean
  onDelete: () => void
  onSelect: () => void
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card transition-colors",
        isSelected && "bg-accent/50",
      )}
    >
      <div className="flex items-start gap-3 px-4 py-4">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <p className="line-clamp-2 text-sm font-medium text-foreground">{historyItem.query}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {historyItem.queryType ? (
              <Badge variant="outline">{formatLabel(historyItem.queryType)}</Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">
              {formatDateTime(historyItem.createdAt)}
            </span>
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {historyItem.answerPreview || "Saved query response"}
          </p>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onDelete}
          disabled={isDeleting}
          aria-label="Delete query history entry"
        >
          {isDeleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        </Button>
      </div>
    </div>
  )
}

function HistoryPanelContent({
  children,
  historyPaginationLabel,
}: {
  children: ReactNode
  historyPaginationLabel: string | null
}) {
  return (
    <>
      <div className="border-b border-border bg-card px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Query history</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Reopen saved answers or remove entries you no longer need.
            </p>
          </div>
          {historyPaginationLabel ? <Badge variant="outline">{historyPaginationLabel}</Badge> : null}
        </div>
      </div>

      <div className="space-y-4 p-4">{children}</div>
    </>
  )
}

function HistorySheet({
  children,
  historyPaginationLabel,
  onClose,
}: {
  children: ReactNode
  historyPaginationLabel: string | null
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 xl:hidden">
      <button
        type="button"
        aria-label="Close history panel"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute right-0 top-0 h-full w-full max-w-sm overflow-hidden border-l border-border bg-muted/30 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">History</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="h-[calc(100%-3.75rem)] overflow-y-auto">
          <HistoryPanelContent historyPaginationLabel={historyPaginationLabel}>
            {children}
          </HistoryPanelContent>
        </div>
      </div>
    </div>
  )
}

function HistoryDetailModal({
  children,
  isLoading,
  onClose,
  onDelete,
  onReuse,
  title,
}: {
  children: ReactNode
  isLoading: boolean
  onClose: () => void
  onDelete: () => void
  onReuse: () => void
  title: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close history detail"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[88svh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-[0_30px_80px_-40px_rgba(15,23,42,0.7)]">
        <div className="border-b border-border bg-card px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="gap-1.5">
                  <History className="size-3.5" />
                  Saved query
                </Badge>
              </div>
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onReuse} disabled={isLoading}>
                <Sparkles className="size-4" />
                Reuse query
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onDelete} disabled={isLoading}>
                <Trash2 className="size-4" />
                Delete
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                <X className="size-4" />
                Close
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/[0.12] px-4 py-5 md:px-5">
          {children}
        </div>
      </div>
    </div>
  )
}

export function AskAiPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [queryText, setQueryText] = useState("")
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([])
  const [clarificationSession, setClarificationSession] = useState<ClarificationSession | null>(null)
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false)
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null)
  const [streamingState, setStreamingState] = useState<{
    messageId: string
    visibleText: string
  } | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  const queryState = useMemo(() => {
    const params: QueryHistoryParams = {
      page: parsePageParam(searchParams.get("historyPage")),
      size: HISTORY_PAGE_SIZE,
    }

    return { params }
  }, [searchParams])

  const historyQuery = useQuery({
    queryKey: queryWorkspaceKeys.historyList(queryState.params),
    queryFn: () => getQueryHistory(queryState.params),
    placeholderData: (previousData) => previousData,
  })

  const historyDetailQuery = useQuery({
    queryKey: queryWorkspaceKeys.historyDetail(selectedHistoryId ?? 0),
    queryFn: () => getQueryHistoryDetail(selectedHistoryId!),
    enabled: selectedHistoryId !== null,
    refetchOnMount: "always",
  })

  const submitMutation = useMutation({
    mutationFn: submitQuery,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteQueryHistory,
    onSuccess: (_, deletedHistoryId) => {
      queryClient.invalidateQueries({ queryKey: queryWorkspaceKeys.historyRoot })

      if (selectedHistoryId === deletedHistoryId) {
        setSelectedHistoryId(null)
      }
    },
  })

  const historyItems = historyQuery.data?.items ?? []
  const historyPagination = historyQuery.data
    ? {
        hasNextPage: queryState.params.page + 1 < historyQuery.data.totalPages,
        hasPreviousPage: queryState.params.page > 0,
        label: `Page ${queryState.params.page + 1} of ${Math.max(historyQuery.data.totalPages, 1)}`,
      }
    : null
  const selectedHistoryResponse = normalizeQueryResponse(historyDetailQuery.data?.response)
  const latestAssistantMessage = [...liveMessages]
    .reverse()
    .find((message): message is AssistantResponseMessage =>
      message.role === "assistant" && message.kind === "response",
    )
  const suggestions = [
    "How much did I spend last month?",
    "Show my top merchants this month.",
    "Which category had the highest debit this week?",
    "List recurring payments due soon.",
  ]

  useEffect(() => {
    if (!streamingState) {
      return
    }

    const streamingMessage = liveMessages.find(
      (message): message is AssistantResponseMessage =>
        message.id === streamingState.messageId &&
        message.role === "assistant" &&
        message.kind === "response",
    )

    if (!streamingMessage) {
      return
    }

    const fullAnswer = streamingMessage.response.answer

    if (streamingState.visibleText.length >= fullAnswer.length) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setStreamingState((currentState) => {
        if (!currentState || currentState.messageId !== streamingMessage.id) {
          return currentState
        }

        const nextVisibleText = fullAnswer.slice(
          0,
          Math.min(fullAnswer.length, currentState.visibleText.length + STREAM_CHUNK_SIZE),
        )

        if (nextVisibleText.length >= fullAnswer.length) {
          return null
        }

        return {
          ...currentState,
          visibleText: nextVisibleText,
        }
      })
    }, STREAM_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [liveMessages, streamingState])

  useEffect(() => {
    const scrollContainer = chatScrollRef.current

    if (!scrollContainer) {
      return
    }

    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: "smooth",
    })
  }, [liveMessages, submitMutation.isPending, streamingState?.visibleText])

  function appendAssistantResponse(response: QueryResponse) {
    const messageId = buildMessageId("assistant")

    setLiveMessages((previousMessages) => [
      ...previousMessages,
      {
        id: messageId,
        role: "assistant",
        kind: "response",
        response,
        source: "live",
      },
    ])
    setStreamingState({
      messageId,
      visibleText: "",
    })

    if (response.decision?.requiresClarification && response.decision.clarificationToken) {
      setClarificationSession({
        error: null,
        messageId,
        pending: false,
        pendingType: null,
        selectedOptionIdsByType: {},
        token: response.decision.clarificationToken,
      })
    } else {
      setClarificationSession(null)
    }

    void queryClient.invalidateQueries({ queryKey: queryWorkspaceKeys.historyRoot })
  }

  function appendInlineError(message: string) {
    setLiveMessages((previousMessages) => [
      ...previousMessages,
      {
        id: buildMessageId("assistant-error"),
        role: "assistant",
        kind: "error",
        text: message,
        source: "live",
      },
    ])
  }

  async function handleInitialQuery(payload: QueryRequest, userText: string) {
    submitMutation.reset()
    setSelectedHistoryId(null)
    setClarificationSession(null)

    setLiveMessages((previousMessages) => [
      ...previousMessages,
      {
        id: buildMessageId("user"),
        role: "user",
        text: userText,
      },
    ])

    try {
      const response = await submitMutation.mutateAsync(payload)
      appendAssistantResponse(response)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong. Please try again."

      appendInlineError(errorMessage)
      composerRef.current?.focus()
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedQuery = queryText.trim()

    if (!trimmedQuery || submitMutation.isPending) {
      return
    }

    setQueryText("")
    await handleInitialQuery({ query: trimmedQuery }, trimmedQuery)
  }

  function handleClarificationToggle(assistantMessageId: string, option: ClarificationOption) {
    if (
      !clarificationSession ||
      clarificationSession.messageId !== assistantMessageId ||
      submitMutation.isPending
    ) {
      return
    }

    setClarificationSession((currentSession) =>
      currentSession && currentSession.messageId === assistantMessageId
        ? {
            ...currentSession,
            error: null,
            selectedOptionIdsByType: {
              ...currentSession.selectedOptionIdsByType,
              [option.type.toUpperCase()]: currentSession.selectedOptionIdsByType[
                option.type.toUpperCase()
              ]?.includes(option.id)
                ? currentSession.selectedOptionIdsByType[option.type.toUpperCase()].filter(
                    (selectedOptionId) => selectedOptionId !== option.id,
                  )
                : [
                    ...(currentSession.selectedOptionIdsByType[option.type.toUpperCase()] ?? []),
                    option.id,
                  ],
            },
          }
        : currentSession,
    )
  }

  async function handleClarificationSubmit(assistantMessageId: string, optionType: string) {
    if (
      !clarificationSession ||
      clarificationSession.messageId !== assistantMessageId ||
      submitMutation.isPending
    ) {
      return
    }

    const normalizedType = optionType.toUpperCase()
    const selectedOptionIds = clarificationSession.selectedOptionIdsByType[normalizedType] ?? []

    if (!selectedOptionIds.length) {
      return
    }

    setClarificationSession((currentSession) =>
      currentSession && currentSession.messageId === assistantMessageId
        ? {
            ...currentSession,
            error: null,
            pending: true,
            pendingType: normalizedType,
          }
        : currentSession,
    )

    try {
      const response = await submitMutation.mutateAsync(
        getClarificationPayload(clarificationSession.token, normalizedType, selectedOptionIds),
      )
      appendAssistantResponse(response)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong. Please try again."

      setClarificationSession((currentSession) =>
        currentSession && currentSession.messageId === assistantMessageId
          ? {
              ...currentSession,
              error: errorMessage,
              pending: false,
              pendingType: null,
            }
          : currentSession,
      )

      composerRef.current?.focus()
    }
  }

  function clearCurrentChat() {
    setLiveMessages([])
    setQueryText("")
    setStreamingState(null)
    setClarificationSession(null)
    submitMutation.reset()
  }

  const selectedHistoryQuery = historyDetailQuery.data?.query ?? null
  const historyPanelBody = (
    <>
      {historyQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : historyItems.length ? (
        <div className="space-y-3">
          {historyItems.map((historyItem) => (
            <HistoryListRow
              key={historyItem.id}
              historyItem={historyItem}
              isSelected={selectedHistoryId === historyItem.id}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === historyItem.id}
              onSelect={() => {
                setSelectedHistoryId(historyItem.id)
                setIsHistorySheetOpen(false)
              }}
              onDelete={() => deleteMutation.mutate(historyItem.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No saved queries yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            History will populate after the first successful query run.
          </p>
        </div>
      )}

      {historyQuery.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {historyQuery.error.message}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            updateSearchParams(searchParams, setSearchParams, {
              historyPage: Math.max(queryState.params.page - 1, 0),
            })
          }
          disabled={!historyPagination?.hasPreviousPage}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            updateSearchParams(searchParams, setSearchParams, {
              historyPage: queryState.params.page + 1,
            })
          }
          disabled={!historyPagination?.hasNextPage}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </>
  )

  return (
    <div className="space-y-6">
      {isHistorySheetOpen ? (
        <HistorySheet
          historyPaginationLabel={historyPagination?.label ?? null}
          onClose={() => setIsHistorySheetOpen(false)}
        >
          {historyPanelBody}
        </HistorySheet>
      ) : null}

      {selectedHistoryId ? (
        <HistoryDetailModal
          title="Saved query detail"
          isLoading={historyDetailQuery.isLoading || deleteMutation.isPending}
          onClose={() => setSelectedHistoryId(null)}
          onDelete={() => deleteMutation.mutate(selectedHistoryId)}
          onReuse={() => {
            if (selectedHistoryQuery) {
              setQueryText(selectedHistoryQuery)
              composerRef.current?.focus()
            }
            setSelectedHistoryId(null)
          }}
        >
          {historyDetailQuery.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-2/3 rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-56 w-full rounded-2xl" />
            </div>
          ) : historyDetailQuery.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {historyDetailQuery.error.message}
            </div>
          ) : historyDetailQuery.data ? (
            <div className="space-y-6">
              <div className="flex justify-end">
                <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm sm:max-w-[72%]">
                  <p className="whitespace-pre-wrap leading-6">{historyDetailQuery.data.query}</p>
                </div>
              </div>

              {selectedHistoryResponse ? (
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground">
                    <Bot className="size-4" />
                  </div>

                  <div className="max-w-[94%] space-y-3 sm:max-w-[84%]">
                    <AssistantAnswerCard
                      clarificationSession={null}
                      disabled
                      isHistory
                      isStreaming={false}
                      messageId={`history-modal-${selectedHistoryId}`}
                      onClarificationSubmit={() => undefined}
                      onClarificationToggle={() => undefined}
                      response={selectedHistoryResponse}
                      streamingText={null}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
                  <p className="text-sm font-medium text-foreground">Saved response unavailable</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This saved entry does not match the query workspace response contract.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </HistoryDetailModal>
      ) : null}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <Badge>Ask AI</Badge>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">AI chat workspace</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Ask finance questions in plain language, resolve ambiguities inside the conversation, reopen saved answers from history, and inspect raw/debug output when needed.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="xl:hidden"
            onClick={() => setIsHistorySheetOpen(true)}
          >
            <Menu className="size-4" />
            History
          </Button>
          <Badge variant="outline">
            {historyQuery.data
              ? `${historyQuery.data.totalItems.toLocaleString("en-IN")} saved queries`
              : "Loading history"}
          </Badge>
          {latestAssistantMessage?.response.metadata?.queryType ? (
            <Badge variant="outline">
              {formatLabel(latestAssistantMessage.response.metadata.queryType)}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <section className="flex min-h-[72svh] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_20px_50px_-36px_rgba(15,23,42,0.55)]">
          <div className="border-b border-border px-4 py-4 md:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="gap-1.5">
                    <Bot className="size-3.5" />
                    Chat
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Clarification stays inline in the thread. Raw and debug views stay attached to each assistant answer.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearCurrentChat}
                  disabled={!liveMessages.length && !queryText && !submitMutation.isPending}
                >
                  <X className="size-4" />
                  New chat
                </Button>
              </div>
            </div>
          </div>

          <div
            ref={chatScrollRef}
            className="flex-1 space-y-6 overflow-y-auto bg-muted/[0.12] px-4 py-5 md:px-5"
          >
            {!liveMessages.length && !submitMutation.isPending ? (
              <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-6 py-10 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-sm">
                  <Sparkles className="size-6" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    Ask about spend, merchants, categories, or trends
                  </h2>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    The assistant can execute analytics-style queries, return transaction lists, ask for merchant/category clarification, and expose raw/debug output for inspection.
                  </p>
                </div>

                <div className="grid w-full gap-3 sm:grid-cols-2">
                  {suggestions.map((suggestion) => (
                    <SuggestionButton
                      key={suggestion}
                      label={suggestion}
                      onClick={() => setQueryText(suggestion)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {liveMessages.map((message) => {
              if (message.role === "user") {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm sm:max-w-[72%]">
                      <p className="whitespace-pre-wrap leading-6">{message.text}</p>
                    </div>
                  </div>
                )
              }

              if (message.kind === "error") {
                return (
                  <div key={message.id} className="flex items-end gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground">
                      <Bot className="size-4" />
                    </div>
                    <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 sm:max-w-[76%]">
                      {message.text}
                    </div>
                  </div>
                )
              }

              const isStreaming = streamingState?.messageId === message.id
              const messageClarificationSession =
                clarificationSession?.messageId === message.id ? clarificationSession : null

              return (
                <div key={message.id} className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground">
                    <Bot className="size-4" />
                  </div>

                  <div className="max-w-[94%] space-y-3 sm:max-w-[84%]">
                    <AssistantAnswerCard
                      clarificationSession={messageClarificationSession}
                      disabled={submitMutation.isPending}
                      isHistory={false}
                      isStreaming={isStreaming}
                      messageId={message.id}
                      onClarificationSubmit={(optionType) =>
                        handleClarificationSubmit(message.id, optionType)
                      }
                      onClarificationToggle={(option) =>
                        handleClarificationToggle(message.id, option)
                      }
                      response={message.response}
                      streamingText={isStreaming ? streamingState?.visibleText ?? "" : null}
                    />
                  </div>
                </div>
              )
            })}

            {submitMutation.isPending ? <TypingBubble /> : null}
          </div>

          <div className="border-t border-border bg-card px-4 py-4 md:px-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                ref={composerRef}
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                placeholder="Ask about spend, merchants, categories, or trends"
                className="min-h-28 w-full resize-none rounded-2xl border border-border/80 bg-background px-4 py-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Structured results, raw result payloads, and query debug metadata stay attached to each assistant answer.
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setQueryText("")}
                    disabled={!queryText}
                  >
                    Clear input
                  </Button>
                  <Button type="submit" disabled={submitMutation.isPending || !queryText.trim()}>
                    {submitMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </section>

        <aside className="hidden rounded-xl border border-border bg-muted/30 xl:sticky xl:top-6 xl:block xl:max-h-[72svh] xl:overflow-hidden">
          <div className="xl:max-h-[72svh] xl:overflow-y-auto">
            <HistoryPanelContent historyPaginationLabel={historyPagination?.label ?? null}>
              {historyPanelBody}
            </HistoryPanelContent>
          </div>
        </aside>
      </div>
    </div>
  )
}
