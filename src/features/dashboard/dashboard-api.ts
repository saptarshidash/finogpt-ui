import { apiClient } from "@/lib/api/client"
import { formatDate } from "@/lib/format/date"
import type {
  DashboardAnomalyItem,
  DashboardAnomalySummary,
  DashboardPeriod,
  DashboardBreakdownItem,
  DashboardCashflowPoint,
  DashboardOverview,
  DashboardRecurringItem,
  DashboardRecurringSummary,
  DashboardTrendPoint,
} from "@/features/dashboard/dashboard-types"

const MONTHS = 6
const DAYS = 30
const TOP_LIMIT = 5
const DEFAULT_DASHBOARD_PERIOD: DashboardPeriod = "this_month"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

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

function pickNumber(record: Record<string, unknown>, keys: string[], fallback = 0) {
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

  return fallback
}

function pickNullableNumber(record: Record<string, unknown>, keys: string[]) {
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

function pickString(record: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
  }

  return fallback
}

function pickNullableString(record: Record<string, unknown>, keys: string[]) {
  const value = pickString(record, keys)
  return value || null
}

function getArrayPayload(data: unknown) {
  if (Array.isArray(data)) {
    return data
  }

  if (!isRecord(data)) {
    return []
  }

  const candidateKeys = ["items", "points", "series", "data", "rows"]

  for (const key of candidateKeys) {
    const value = data[key]
    if (Array.isArray(value)) {
      return value
    }
  }

  return []
}

function normalizeTimeLabel(rawLabel: string, fallback: string) {
  if (!rawLabel) {
    return fallback
  }

  if (/^\d{4}-\d{2}$/.test(rawLabel)) {
    return formatDate(`${rawLabel}-01`, "en-IN", {
      month: "short",
      year: "2-digit",
    })
  }

  const date = new Date(rawLabel)

  if (!Number.isNaN(date.getTime())) {
    return formatDate(date, "en-IN", {
      day: "numeric",
      month: "short",
    })
  }

  return rawLabel
}

function normalizeBreakdownItems(data: unknown) {
  return getArrayPayload(data)
    .map((item, index): DashboardBreakdownItem | null => {
      if (!isRecord(item)) {
        return null
      }

      return {
        id: pickNumber(item, ["id"], index + 1),
        label: pickString(
          item,
          ["name", "entityName", "categoryName", "merchant", "entity", "category"],
          `Item ${index + 1}`,
        ),
        totalAmount: pickNumber(item, ["totalAmount", "totalSpend", "amount", "value"]),
        txnCount: pickNumber(item, ["txnCount", "count", "transactions"]),
      }
    })
    .filter((item): item is DashboardBreakdownItem => Boolean(item))
}

function normalizeSpendTrend(data: unknown) {
  return getArrayPayload(data)
    .map((item, index): DashboardTrendPoint | null => {
      if (!isRecord(item)) {
        return null
      }

      const month = pickNullableNumber(item, ["month"])
      const year = pickNullableNumber(item, ["year"])
      const rawLabel =
        month !== null && year !== null
          ? `${year}-${String(month).padStart(2, "0")}`
          : pickString(item, ["label", "period", "date", "monthLabel", "name"])

      return {
        label: normalizeTimeLabel(rawLabel, `P${index + 1}`),
        totalSpend: pickNumber(item, ["totalSpend", "spend", "amount", "value"]),
        totalCredit: pickNumber(item, ["totalCredit", "credit"]),
        txnCount: pickNumber(item, ["txnCount", "count", "transactions"]),
      }
    })
    .filter((item): item is DashboardTrendPoint => Boolean(item))
}

function normalizeCashflowTrend(data: unknown) {
  return getArrayPayload(data)
    .map((item, index): DashboardCashflowPoint | null => {
      if (!isRecord(item)) {
        return null
      }

      return {
        label: normalizeTimeLabel(
          pickString(item, ["date", "label", "day", "period", "name"]),
          `D${index + 1}`,
        ),
        credit: pickNumber(item, ["totalCredit", "credit", "inflow", "credits"]),
        debit: pickNumber(item, [
          "totalDebit",
          "totalSpend",
          "spend",
          "debit",
          "outflow",
        ]),
        txnCount: pickNumber(item, ["txnCount", "count", "transactions"]),
      }
    })
    .filter((item): item is DashboardCashflowPoint => Boolean(item))
}

function normalizeRecentAnomalies(data: unknown) {
  return getArrayPayload(data)
    .map((item): DashboardAnomalyItem | null => {
      if (!isRecord(item)) {
        return null
      }

      return {
        id: pickNumber(item, ["id"]),
        anomalyType: pickString(item, ["anomalyType"]),
        description: pickString(item, ["description"]),
        severity: pickString(item, ["severity"]),
        txnDate: pickNullableString(item, ["txnDate"]),
        amount: pickNullableNumber(item, ["amount"]),
        entityName: pickNullableString(item, ["entityName"]),
      }
    })
    .filter((item): item is DashboardAnomalyItem => Boolean(item))
}

function normalizeRecurringItems(data: unknown) {
  return getArrayPayload(data)
    .map((item): DashboardRecurringItem | null => {
      if (!isRecord(item)) {
        return null
      }

      return {
        id: pickNumber(item, ["id"]),
        entityId: pickNullableNumber(item, ["entityId"]),
        entityName: pickNullableString(item, ["entityName"]),
        categoryId: pickNullableNumber(item, ["categoryId"]),
        categoryName: pickNullableString(item, ["categoryName"]),
        frequencyDays: pickNullableNumber(item, ["frequencyDays"]),
        avgAmount: pickNullableNumber(item, ["avgAmount"]),
        lastSeen: pickNullableString(item, ["lastSeen"]),
        nextExpectedDate: pickNullableString(item, ["nextExpectedDate"]),
        createdAt: pickString(item, ["createdAt"]),
      }
    })
    .filter((item): item is DashboardRecurringItem => Boolean(item))
}

function normalizeAnomalySummary(data: unknown): DashboardAnomalySummary {
  const record = isRecord(data) ? data : {}

  return {
    totalAnomalies: pickNumber(record, ["totalAnomalies", "count", "total"]),
    highSeverityCount: pickNumber(record, ["highSeverityCount", "high"]),
    mediumSeverityCount: pickNumber(record, ["mediumSeverityCount", "medium"]),
    lowSeverityCount: pickNumber(record, ["lowSeverityCount", "low"]),
    recentAnomalies: normalizeRecentAnomalies(record.recentAnomalies),
  }
}

function normalizeRecurringSummary(data: unknown): DashboardRecurringSummary {
  const record = isRecord(data) ? data : {}

  return {
    totalRecurring: pickNumber(record, ["totalRecurring", "count", "total"]),
    dueSoonCount: pickNumber(record, ["dueSoonCount", "dueSoon"]),
    recurringItems: normalizeRecurringItems(record.recurringItems),
  }
}

export const dashboardQueryKeys = {
  anomaliesSummary: ["dashboard", "anomalies-summary", TOP_LIMIT] as const,
  cashflowDaily: ["dashboard", "cashflow-daily", DAYS] as const,
  overview: (period: DashboardPeriod) => ["dashboard", "overview", period] as const,
  recurringSummary: ["dashboard", "recurring-summary", TOP_LIMIT] as const,
  spendTrend: ["dashboard", "spend-trend", MONTHS] as const,
  topCategories: (period: DashboardPeriod) => {
    const scope = getBreakdownScope(period)

    return [
      "dashboard",
      "top-categories",
      scope.year,
      scope.month ?? "all",
      TOP_LIMIT,
    ] as const
  },
  topMerchants: (period: DashboardPeriod) => {
    const scope = getBreakdownScope(period)

    return [
      "dashboard",
      "top-merchants",
      scope.year,
      scope.month ?? "all",
      TOP_LIMIT,
    ] as const
  },
}

function getBreakdownScope(period: DashboardPeriod) {
  const currentDate = new Date()

  if (period === "year_to_date") {
    return {
      year: currentDate.getFullYear(),
      month: undefined,
    }
  }

  if (period === "last_month") {
    const previousMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)

    return {
      year: previousMonthDate.getFullYear(),
      month: previousMonthDate.getMonth() + 1,
    }
  }

  return {
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
  }
}

export async function getDashboardOverview(
  period: DashboardPeriod = DEFAULT_DASHBOARD_PERIOD,
) {
  return (
    await apiClient.get<DashboardOverview>(
      `/api/dashboard/overview${buildQueryString({ period })}`,
    )
  ).data
}

export async function getDashboardSpendTrend() {
  const data = (
    await apiClient.get<unknown>(
      `/api/dashboard/spend-trend${buildQueryString({ months: MONTHS })}`,
    )
  ).data

  return normalizeSpendTrend(data)
}

export async function getDashboardCashflowDaily() {
  const data = (
    await apiClient.get<unknown>(
      `/api/dashboard/cashflow-daily${buildQueryString({ days: DAYS })}`,
    )
  ).data

  return normalizeCashflowTrend(data)
}

export async function getDashboardTopMerchants(
  period: DashboardPeriod = DEFAULT_DASHBOARD_PERIOD,
) {
  const scope = getBreakdownScope(period)
  const data = (
    await apiClient.get<unknown>(
      `/api/dashboard/top-merchants${buildQueryString({
        year: scope.year,
        month: scope.month,
        limit: TOP_LIMIT,
      })}`,
    )
  ).data

  return normalizeBreakdownItems(data)
}

export async function getDashboardTopCategories(
  period: DashboardPeriod = DEFAULT_DASHBOARD_PERIOD,
) {
  const scope = getBreakdownScope(period)
  const data = (
    await apiClient.get<unknown>(
      `/api/dashboard/top-categories${buildQueryString({
        year: scope.year,
        month: scope.month,
        limit: TOP_LIMIT,
      })}`,
    )
  ).data

  return normalizeBreakdownItems(data)
}

export async function getDashboardAnomaliesSummary() {
  const data = (
    await apiClient.get<unknown>(
      `/api/dashboard/anomalies/summary${buildQueryString({ limit: TOP_LIMIT })}`,
    )
  ).data
  return normalizeAnomalySummary(data)
}

export async function getDashboardRecurringSummary() {
  const data = (
    await apiClient.get<unknown>(
      `/api/dashboard/recurring/summary${buildQueryString({ limit: TOP_LIMIT })}`,
    )
  ).data
  return normalizeRecurringSummary(data)
}

export { DEFAULT_DASHBOARD_PERIOD, DAYS, MONTHS, TOP_LIMIT }
