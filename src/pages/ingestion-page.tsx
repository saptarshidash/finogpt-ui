import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, ChevronRight, FileUp, LoaderCircle, TriangleAlert } from "lucide-react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router"
import { z } from "zod"
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
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getIngestionJobs,
  ingestionQueryKeys,
  JOBS_PAGE_SIZE,
  uploadIngestionFile,
} from "@/features/ingestion/ingestion-api"
import type {
  IngestionJobStatus,
  IngestionJobSummary,
} from "@/features/ingestion/ingestion-types"
import { ApiError } from "@/lib/api/client"
import { formatDate } from "@/lib/format/date"

const uploadSchema = z.object({
  file: z
    .instanceof(File, { message: "Select a statement file to upload." })
    .refine((file) => file.size > 0, "Select a statement file to upload."),
  mobile: z
    .string()
    .trim()
    .regex(/^[0-9]{10,15}$/, "Enter a valid mobile number."),
})

type UploadFormValues = z.infer<typeof uploadSchema>

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

function getStatusLabel(status: IngestionJobStatus) {
  return status.replaceAll("_", " ")
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

function shouldPollJob(job: {
  status: IngestionJobStatus
  completionSignalReceived?: boolean
}) {
  return job.status === "PROCESSING" && !job.completionSignalReceived
}

function JobStatusBadge({ status }: { status: IngestionJobStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium uppercase tracking-[0.08em] ${getStatusTone(
        status,
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  )
}

function EmptyJobsState() {
  return (
    <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center">
      <p className="text-sm font-medium text-foreground">No ingestion jobs yet</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload a statement to start processing and monitor the job here.
      </p>
    </div>
  )
}

function JobsList({
  jobs,
  isLoading,
  isError,
}: {
  jobs: IngestionJobSummary[]
  isLoading: boolean
  isError: boolean
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
        Unable to load ingestion jobs right now.
      </div>
    )
  }

  if (!jobs.length) {
    return <EmptyJobsState />
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <Link
          key={job.jobId}
          to={`/ingestion/${job.jobId}`}
          className="block rounded-lg border border-border bg-muted/40 px-4 py-4 transition-colors hover:bg-accent/60"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <JobStatusBadge status={job.status} />
                <p className="font-mono text-xs text-muted-foreground">{job.jobId}</p>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <p>Total records: {formatJobCount(job.totalRecords)}</p>
                <p>Processed: {formatJobCount(job.processedCount)}</p>
                <p>Failed: {formatJobCount(job.failedCount)}</p>
                <p>Updated: {formatDateTime(job.updatedAt)}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(job.progressPercent)}%</span>
                </div>
                <Progress value={job.progressPercent} />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <span>View details</span>
              <ChevronRight className="size-4" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

export function IngestionPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const jobsQuery = useQuery({
    queryKey: ingestionQueryKeys.jobs(page, JOBS_PAGE_SIZE),
    queryFn: () => getIngestionJobs(page, JOBS_PAGE_SIZE),
    refetchInterval: (query) => {
      const jobs = query.state.data?.items ?? []
      return jobs.some(shouldPollJob) ? 4000 : false
    },
  })

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      mobile: "",
    },
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, mobile }: UploadFormValues) => uploadIngestionFile(file, mobile),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["ingestion"] })
      navigate(`/ingestion/${data.jobId}`, {
        state: { uploadMessage: data.message },
      })
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setSubmitError(error.message)
        return
      }

      setSubmitError("Unable to start ingestion right now.")
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    await uploadMutation.mutateAsync(values)
  })

  const pagination = useMemo(() => {
    const data = jobsQuery.data
    if (!data) {
      return null
    }

    return {
      hasNextPage: data.page + 1 < data.totalPages,
      hasPreviousPage: data.page > 0,
      pageLabel: `Page ${data.page + 1} of ${Math.max(data.totalPages, 1)}`,
      totalItems: data.totalItems,
    }
  }, [jobsQuery.data])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>Ingestion</Badge>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Statement uploads</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Upload statements, track processing progress, and inspect parsed transaction previews before moving into investigation workflows.
          </p>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upload statement</CardTitle>
            <CardDescription>Start a new ingestion job with a statement file and mobile number.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="9999999999"
                  className="h-11 px-3.5 text-sm focus-visible:ring-primary/40"
                  {...form.register("mobile")}
                />
                {form.formState.errors.mobile ? (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.mobile.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Statement file</Label>
                <input
                  id="file"
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  className="block h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-primary/90"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    form.setValue("file", file as File, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }}
                />
                {form.formState.errors.file ? (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.file.message}
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
                className="h-11 w-full justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    <span>Starting ingestion...</span>
                  </>
                ) : (
                  <>
                    <FileUp className="size-4" />
                    <span>Upload and process</span>
                  </>
                )}
              </Button>
            </form>

            <div className="rounded-lg border border-border bg-muted/60 p-4 text-sm text-muted-foreground">
              Jobs move from processing to completed automatically. Partial success and failed records will appear in the job detail view.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Recent jobs</CardTitle>
                <CardDescription>Monitor ingestion progress and open any job for parsed transaction previews.</CardDescription>
              </div>
              {jobsQuery.data ? (
                <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>{jobsQuery.data.totalItems.toLocaleString("en-IN")} total jobs</span>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <JobsList
              jobs={jobsQuery.data?.items ?? []}
              isLoading={jobsQuery.isLoading}
              isError={jobsQuery.isError}
            />

            {pagination ? (
              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {pagination.pageLabel}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 0))}
                    disabled={!pagination.hasPreviousPage}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((currentPage) => currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
