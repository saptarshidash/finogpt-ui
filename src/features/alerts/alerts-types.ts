export type AnomalySeverity = "HIGH" | "MEDIUM" | "LOW"

export interface AnomalyListItem {
  id: number
  anomalyType: string
  description: string
  severity: string
  txnId: number | null
  txnDate: string | null
  amount: number | null
  entityId: number | null
  entityName: string | null
  createdAt: string
}

export interface AnomalyDetail extends AnomalyListItem {
  txnType: string | null
  categoryId: number | null
  categoryName: string | null
  rawDetails: string | null
  source: string | null
}

export interface AnomalyFilterOption {
  value: string
  count: number
}

export interface AnomalyFilters {
  severities: AnomalyFilterOption[]
  anomalyTypes: AnomalyFilterOption[]
}

export interface AnomaliesPageData {
  items: AnomalyListItem[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export interface AnomaliesQueryParams {
  severity?: string
  anomalyType?: string
  page: number
  size: number
}
