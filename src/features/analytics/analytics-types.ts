export type DimensionKind = "entity" | "category"
export type AnalyticsGrain = "daily" | "monthly"
export type AnalyticsMetric = "spend" | "credit" | "txn_count"
export type AnalyticsSort = "amount" | "count"

export interface BreakdownItem {
  id: number
  name: string
  totalAmount: number
  txnCount: number
}

export interface DimensionTrendPoint {
  year: number
  month: number
  totalAmount: number
  txnCount: number
}

export interface DimensionSummaryDetail {
  id: number
  name: string
  dimension: string
  period: string
  totalAmount: number
  txnCount: number
  trend: DimensionTrendPoint[]
}

export interface AnalyticsPoint {
  periodStart: string | null
  year: number | null
  month: number | null
  value: number
}

export interface AnalyticsSeries {
  grain: string
  metric: string
  from: string | null
  to: string | null
  points: AnalyticsPoint[]
}

export interface AnalyticsBreakdown {
  dimension: string
  from: string | null
  to: string | null
  sort: string
  items: BreakdownItem[]
}

export interface SummaryQueryParams {
  year?: number
  month?: number
  months?: number
  limit?: number
}

export interface AnalyticsSummaryQueryParams {
  grain?: AnalyticsGrain
  metric?: AnalyticsMetric
  from?: string
  to?: string
}

export interface AnalyticsBreakdownQueryParams {
  from?: string
  to?: string
  limit?: number
  sort?: AnalyticsSort
}
