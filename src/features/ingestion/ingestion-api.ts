import { apiClient } from "@/lib/api/client"
import type {
  IngestionJobDetail,
  IngestionJobsPage,
  IngestionTransactionsPage,
  IngestionUploadResponse,
} from "@/features/ingestion/ingestion-types"

const JOBS_PAGE_SIZE = 10
const TRANSACTIONS_PAGE_SIZE = 10

function buildQueryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue
    }

    searchParams.set(key, String(value))
  }

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ""
}

export const ingestionQueryKeys = {
  job: (jobId: string) => ["ingestion", "job", jobId] as const,
  jobs: (page: number, size: number) => ["ingestion", "jobs", page, size] as const,
  jobTransactions: (jobId: string, page: number, size: number) =>
    ["ingestion", "job-transactions", jobId, page, size] as const,
}

export async function uploadIngestionFile(file: File, mobile: string) {
  const payload = new FormData()
  payload.append("file", file)
  payload.append("mobile", mobile)

  return (
    await apiClient.post<IngestionUploadResponse>("/api/ingestion/upload", payload)
  ).data
}

export async function getIngestionJobs(page = 0, size = JOBS_PAGE_SIZE) {
  return (
    await apiClient.get<IngestionJobsPage>(
      `/api/ingestion/jobs${buildQueryString({ page, size })}`,
    )
  ).data
}

export async function getIngestionJob(jobId: string) {
  return (await apiClient.get<IngestionJobDetail>(`/api/ingestion/jobs/${jobId}`)).data
}

export async function getIngestionJobTransactions(
  jobId: string,
  page = 0,
  size = TRANSACTIONS_PAGE_SIZE,
) {
  return (
    await apiClient.get<IngestionTransactionsPage>(
      `/api/ingestion/jobs/${jobId}/transactions${buildQueryString({ page, size })}`,
    )
  ).data
}

export { JOBS_PAGE_SIZE, TRANSACTIONS_PAGE_SIZE }
