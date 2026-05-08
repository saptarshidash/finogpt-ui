export type DashboardPeriod = "this_month" | "last_month" | "year_to_date"

export interface DashboardOverview {
  period: string
  startDate: string
  endDate: string
  totalSpend: number
  totalCredit: number
  txnCount: number
}

export interface DashboardTrendPoint {
  label: string
  totalSpend: number
  totalCredit: number
  txnCount: number
}

export interface DashboardCashflowPoint {
  label: string
  credit: number
  debit: number
  txnCount: number
}

export interface DashboardBreakdownItem {
  id: number
  label: string
  totalAmount: number
  txnCount: number
}

export interface DashboardAnomalyItem {
  id: number
  anomalyType: string
  description: string
  severity: string
  txnDate: string | null
  amount: number | null
  entityName: string | null
}

export interface DashboardRecurringItem {
  id: number
  entityId: number | null
  entityName: string | null
  categoryId: number | null
  categoryName: string | null
  frequencyDays: number | null
  avgAmount: number | null
  lastSeen: string | null
  nextExpectedDate: string | null
  createdAt: string
}

export interface DashboardAnomalySummary {
  totalAnomalies: number
  highSeverityCount: number
  mediumSeverityCount: number
  lowSeverityCount: number
  recentAnomalies: DashboardAnomalyItem[]
}

export interface DashboardRecurringSummary {
  totalRecurring: number
  dueSoonCount: number
  recurringItems: DashboardRecurringItem[]
}
