import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react"
import { Link, useLocation, useParams } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getIngestionJob,
  getIngestionJobTransactions,
  ingestionQueryKeys,
  TRANSACTIONS_PAGE_SIZE,
} from "@/features/ingestion/ingestion-api"
import type {
  IngestionJobStatus,
  TransactionPreviewRow,
} from "@/features/ingestion/ingestion-types"
import { formatCurrency } from "@/lib/format/currency"
import { formatDate } from "@/lib/format/date"

function getStatusTone(status: IngestionJobStatus) {
  switch (status) {
    case "COMPLETED":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300"
    case "PARTIAL_SUCCESS":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300"
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
    default:
      return "border-primary/20 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/12 dark:text-primary"
  }
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

function formatJobCount(value: number | null) {
  return value === null ? "—" : value.toLocaleString("en-IN")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
  }

  return ""
}

function pickNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }

    if (typeof value === "string" && value.trim()) {
      const parsedValue = Number(value)
      if (Number.isFinite(parsedValue)) {
        return parsedValue
      }
    }
  }

  return null
}

function normalizeTransactionRow(row: TransactionPreviewRow, index: number) {
  const record = isRecord(row) ? row : {}
  const dateValue = pickString(record, ["txnDate", "date", "transactionDate", "valueDate"])
  const description = pickString(record, [
    "description",
    "narration",
    "remarks",
    "memo",
    "note",
    "details",
  ])
  const merchant = pickString(record, [
    "entityName",
    "merchant",
    "entity",
    "counterparty",
    "merchantName",
  ])
  const category = pickString(record, ["categoryName", "category", "effectiveCategory"])
  const type = pickString(record, ["type", "txnType", "transactionType"])
  const amount = pickNumber(record, ["amount", "txnAmount", "value"])

  return {
    amount,
    category: category || "Uncategorized",
    date: dateValue || "—",
    description: description || merchant || `Transaction ${index + 1}`,
    merchant: merchant || "—",
    type: type || "—",
  }
}

function JobStatusBadge({ status }: { status: IngestionJobStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium uppercase tracking-[0.08em] ${getStatusTone(
        status,
      )}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  )
}

function shouldPollJob(job: {
  completionSignalReceived?: boolean
  status: IngestionJobStatus
}) {
  return job.status === "PROCESSING" && !job.completionSignalReceived
}

export function IngestionJobPage() {
  const { jobId = "" } = useParams()
  const location = useLocation()
  const [previewPage, setPreviewPage] = useState(0)

  const jobQuery = useQuery({
    queryKey: ingestionQueryKeys.job(jobId),
    queryFn: () => getIngestionJob(jobId),
    enabled: Boolean(jobId),
    refetchInterval: (query) =>
      query.state.data && shouldPollJob(query.state.data) ? 4000 : false,
  })

  const previewQuery = useQuery({
    queryKey: ingestionQueryKeys.jobTransactions(jobId, previewPage, TRANSACTIONS_PAGE_SIZE),
    queryFn: () =>
      getIngestionJobTransactions(jobId, previewPage, TRANSACTIONS_PAGE_SIZE),
    enabled: Boolean(jobId),
    refetchInterval: () =>
      jobQuery.data && shouldPollJob(jobQuery.data) ? 4000 : false,
  })

  const previewRows = useMemo(
    () => (previewQuery.data?.items ?? []).map(normalizeTransactionRow),
    [previewQuery.data],
  )

  const uploadMessage =
    typeof location.state === "object" &&
    location.state !== null &&
    "uploadMessage" in location.state &&
    typeof location.state.uploadMessage === "string"
      ? location.state.uploadMessage
      : null

  const previewPagination = previewQuery.data
    ? {
        hasNextPage: previewQuery.data.page + 1 < previewQuery.data.totalPages,
        hasPreviousPage: previewQuery.data.page > 0,
        label: `Page ${previewQuery.data.page + 1} of ${Math.max(
          previewQuery.data.totalPages,
          1,
        )}`,
      }
    : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Badge>Ingestion job</Badge>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">Job details</h1>
            <p className="font-mono text-xs text-muted-foreground">{jobId}</p>
          </div>
        </div>
        <Button asChild type="button" variant="outline" size="sm">
          <Link to="/ingestion">
            <ArrowLeft className="size-4" />
            <span>Back to uploads</span>
          </Link>
        </Button>
      </div>

      {uploadMessage ? (
        <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-3 text-sm text-primary">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{uploadMessage}</span>
        </div>
      ) : null}

      {jobQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-4">
          <Skeleton className="h-28 w-full rounded-lg lg:col-span-4" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : jobQuery.isError || !jobQuery.data ? (
        <Card>
          <CardContent className="px-5 py-10 text-center text-sm text-muted-foreground">
            Unable to load the ingestion job right now.
          </CardContent>
        </Card>
      ) : (
        <>
          {jobQuery.data.status === "FAILED" ? (
            <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm text-red-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{jobQuery.data.errorMessage || "This ingestion job failed before completion."}</span>
            </div>
          ) : null}

          {jobQuery.data.status === "PARTIAL_SUCCESS" ? (
            <div className="flex items-start gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/10 px-3 py-3 text-sm text-yellow-300">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                {jobQuery.data.errorMessage ||
                  `${formatJobCount(jobQuery.data.failedCount)} records could not be processed.`}
              </span>
            </div>
          ) : null}

          {jobQuery.data.completionSignalReceived &&
          jobQuery.data.status === "PROCESSING" ? (
            <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-3 text-sm text-primary">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>
                Completion signal received. The backend has not finalized the job
                status or counts yet, so automatic polling has been paused.
              </span>
            </div>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-4">
            <Card className="lg:col-span-4">
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <JobStatusBadge status={jobQuery.data.status} />
                      {shouldPollJob(jobQuery.data) ? (
                        <span className="inline-flex items-center gap-2 text-xs text-primary">
                          <LoaderCircle className="size-3.5 animate-spin" />
                          Refreshing automatically
                        </span>
                      ) : null}
                      {jobQuery.data.completionSignalReceived &&
                      jobQuery.data.status === "PROCESSING" ? (
                        <span className="inline-flex items-center gap-2 text-xs text-primary">
                          <CheckCircle2 className="size-3.5" />
                          Waiting for final backend status
                        </span>
                      ) : null}
                    </div>
                    <CardTitle>Processing status</CardTitle>
                    <CardDescription>
                      Uploaded on {formatDateTime(jobQuery.data.createdAt)} and last updated on{" "}
                      {formatDateTime(jobQuery.data.updatedAt)}.
                    </CardDescription>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                    <p>Mobile number</p>
                    <p className="mt-1 font-medium text-foreground">
                      {jobQuery.data.mobileNumber || "Not available"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(jobQuery.data.progressPercent)}%</span>
                </div>
                <Progress value={jobQuery.data.progressPercent} className="h-2.5" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total records</CardDescription>
                <CardTitle className="text-2xl font-semibold">
                  {formatJobCount(jobQuery.data.totalRecords)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Processed</CardDescription>
                <CardTitle className="text-2xl font-semibold">
                  {formatJobCount(jobQuery.data.processedCount)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Failed</CardDescription>
                <CardTitle className="text-2xl font-semibold">
                  {formatJobCount(jobQuery.data.failedCount)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Completion signal</CardDescription>
                <CardTitle className="flex items-center gap-2 text-2xl font-semibold">
                  <Clock3 className="size-4 text-primary" />
                  {jobQuery.data.completionSignalReceived ? "Received" : "Pending"}
                </CardTitle>
              </CardHeader>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Transaction preview</CardTitle>
              <CardDescription>Preview the parsed transaction rows returned for this ingestion job.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {previewQuery.isLoading ? (
                <>
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </>
              ) : previewQuery.isError ? (
                <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                  Unable to load transaction preview rows right now.
                </div>
              ) : !previewRows.length ? (
                <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                  No transaction preview rows are available for this job yet.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-full divide-y divide-border text-sm">
                      <thead className="bg-muted/60 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Description</th>
                          <th className="px-4 py-3 font-medium">Merchant</th>
                          <th className="px-4 py-3 font-medium">Category</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {previewRows.map((row, index) => (
                          <tr key={`${row.description}-${index}`}>
                            <td className="px-4 py-3 text-muted-foreground">{row.date}</td>
                            <td className="px-4 py-3 text-foreground">{row.description}</td>
                            <td className="px-4 py-3 text-muted-foreground">{row.merchant}</td>
                            <td className="px-4 py-3 text-muted-foreground">{row.category}</td>
                            <td className="px-4 py-3 text-muted-foreground">{row.type}</td>
                            <td className="px-4 py-3 text-right font-medium text-foreground">
                              {typeof row.amount === "number" ? formatCurrency(row.amount) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {previewPagination ? (
                    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        {previewPagination.label}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewPage((page) => Math.max(page - 1, 0))}
                          disabled={!previewPagination.hasPreviousPage}
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewPage((page) => page + 1)}
                          disabled={!previewPagination.hasNextPage}
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
        </>
      )}
    </div>
  )
}
