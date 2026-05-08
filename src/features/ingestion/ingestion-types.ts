import type { PagedData } from "@/lib/types/api"

export type IngestionJobStatus =
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIAL_SUCCESS"
  | "FAILED"

export interface IngestionJobSummary {
  jobId: string
  status: IngestionJobStatus
  totalRecords: number | null
  processedCount: number | null
  failedCount: number | null
  progressPercent: number
  createdAt: string
  updatedAt: string
}

export interface IngestionJobDetail extends IngestionJobSummary {
  mobileNumber?: string | null
  completionSignalReceived?: boolean
  errorMessage?: string | null
}

export interface IngestionUploadResponse {
  jobId: string
  status: IngestionJobStatus
  message: string
}

export type TransactionPreviewRow = Record<string, unknown>

export type IngestionJobsPage = PagedData<IngestionJobSummary>
export type IngestionTransactionsPage = PagedData<TransactionPreviewRow>
