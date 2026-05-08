import { apiClient } from "@/lib/api/client"
import type {
  AnalyticsBreakdown,
  AnalyticsBreakdownQueryParams,
  AnalyticsSummaryQueryParams,
  AnalyticsSeries,
  DimensionKind,
  DimensionSummaryDetail,
  SummaryQueryParams,
} from "@/features/analytics/analytics-types"

function buildQueryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue
    }

    searchParams.set(key, String(value))
  }

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ""
}

export const analyticsQueryKeys = {
  analyticsBreakdown: (
    dimension: DimensionKind,
    params: AnalyticsBreakdownQueryParams,
  ) => ["analytics", "breakdown", dimension, params] as const,
  analyticsCategories: (params: AnalyticsBreakdownQueryParams) =>
    ["analytics", "categories", params] as const,
  analyticsEntities: (params: AnalyticsBreakdownQueryParams) =>
    ["analytics", "entities", params] as const,
  analyticsSummary: (params: AnalyticsSummaryQueryParams) =>
    ["analytics", "summary", params] as const,
  categoryDetail: (categoryId: number, params: SummaryQueryParams) =>
    ["categories", "detail", categoryId, params] as const,
  categorySummary: (params: SummaryQueryParams) => ["categories", "summary", params] as const,
  entityDetail: (entityId: number, params: SummaryQueryParams) =>
    ["entities", "detail", entityId, params] as const,
  entitySummary: (params: SummaryQueryParams) => ["entities", "summary", params] as const,
}

export async function getEntitySummary(params: SummaryQueryParams) {
  return (
    await apiClient.get<AnalyticsBreakdown["items"]>(
      `/api/entities/summary${buildQueryString({
        limit: params.limit,
        month: params.month,
        months: params.months,
        year: params.year,
      })}`,
    )
  ).data
}

export async function getEntityDetail(entityId: number, params: SummaryQueryParams) {
  return (
    await apiClient.get<DimensionSummaryDetail>(
      `/api/entities/${entityId}/summary${buildQueryString({
        month: params.month,
        months: params.months,
        year: params.year,
      })}`,
    )
  ).data
}

export async function getCategorySummary(params: SummaryQueryParams) {
  return (
    await apiClient.get<AnalyticsBreakdown["items"]>(
      `/api/categories/summary${buildQueryString({
        limit: params.limit,
        month: params.month,
        months: params.months,
        year: params.year,
      })}`,
    )
  ).data
}

export async function getCategoryDetail(categoryId: number, params: SummaryQueryParams) {
  return (
    await apiClient.get<DimensionSummaryDetail>(
      `/api/categories/${categoryId}/summary${buildQueryString({
        month: params.month,
        months: params.months,
        year: params.year,
      })}`,
    )
  ).data
}

export async function getAnalyticsSummary(params: AnalyticsSummaryQueryParams) {
  return (
    await apiClient.get<AnalyticsSeries>(
      `/api/analytics/summary${buildQueryString({
        from: params.from,
        grain: params.grain,
        metric: params.metric,
        to: params.to,
      })}`,
    )
  ).data
}

export async function getAnalyticsEntities(params: AnalyticsBreakdownQueryParams) {
  return (
    await apiClient.get<AnalyticsBreakdown>(
      `/api/analytics/entities${buildQueryString({
        from: params.from,
        limit: params.limit,
        sort: params.sort,
        to: params.to,
      })}`,
    )
  ).data
}

export async function getAnalyticsCategories(params: AnalyticsBreakdownQueryParams) {
  return (
    await apiClient.get<AnalyticsBreakdown>(
      `/api/analytics/categories${buildQueryString({
        from: params.from,
        limit: params.limit,
        sort: params.sort,
        to: params.to,
      })}`,
    )
  ).data
}

export async function getAnalyticsBreakdown(
  dimension: DimensionKind,
  params: AnalyticsBreakdownQueryParams,
) {
  return (
    await apiClient.get<AnalyticsBreakdown>(
      `/api/analytics/breakdown${buildQueryString({
        dimension,
        from: params.from,
        limit: params.limit,
        sort: params.sort,
        to: params.to,
      })}`,
    )
  ).data
}
