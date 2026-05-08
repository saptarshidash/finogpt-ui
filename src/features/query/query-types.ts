import type { PagedData } from "@/lib/types/api"

export interface ClarificationOption {
  type: string
  id: number
  label: string
  score: number
}

export interface QueryDecision {
  action: string
  executed: boolean
  requiresClarification: boolean
  reason: string | null
  classificationConfidence: number | null
  resolutionConfidence: number | null
  clarificationToken: string | null
  clarificationQuestion: string | null
  clarificationOptions: ClarificationOption[]
}

export interface QueryTimeWindow {
  year: number | null
  month: number | null
  day: number | null
  lastNMonths: number | null
  fromDate: string | null
  toDate: string | null
  today: boolean
  yesterday: boolean
  lastMonth: boolean
  thisMonth: boolean
  thisWeek: boolean
  lastWeek: boolean
}

export interface QueryMetadata {
  originalQuery: string
  queryType: string
  classificationConfidence: number
  hybrid: boolean
  intent: string | null
  txnDirection: string | null
  limit: number | null
  requestedDimension: string | null
  resolutionMode: string | null
  ambiguousResolution: boolean
  ambiguousEntity: boolean
  ambiguousCategory: boolean
  resolutionConfidence: number | null
  entityIds: number[] | null
  entityNames: string[] | null
  entityCandidateIds: number[] | null
  entityCandidateNames: string[] | null
  entityCandidateScores: number[] | null
  categoryIds: number[] | null
  categoryNames: string[] | null
  categoryCandidateIds: number[] | null
  categoryCandidateNames: string[] | null
  categoryCandidateScores: number[] | null
  timeWindow: QueryTimeWindow | null
}

export interface QueryResponse {
  answer: string
  data: Record<string, unknown>[]
  decision: QueryDecision | null
  metadata: QueryMetadata | null
}

export interface QueryRequest {
  query?: string
  clarificationToken?: string | null
  selectedEntityId?: number | null
  selectedCategoryId?: number | null
  selectedEntityIds?: number[] | null
  selectedCategoryIds?: number[] | null
}

export interface QueryHistoryItem {
  id: number
  query: string
  answerPreview: string | null
  queryType: string | null
  createdAt: string
}

export interface QueryHistoryDetail {
  id: number
  query: string
  response: unknown
  createdAt: string
}

export interface QueryHistoryParams {
  page: number
  size: number
}

export type QueryHistoryPageData = PagedData<QueryHistoryItem>
