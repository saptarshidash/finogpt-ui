import { apiClient } from "@/lib/api/client"
import type {
  AnomalyDetail,
  AnomalyFilters,
  AnomaliesPageData,
  AnomaliesQueryParams,
} from "@/features/alerts/alerts-types"

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

export const alertsQueryKeys = {
  detail: (anomalyId: number) => ["alerts", "detail", anomalyId] as const,
  filters: ["alerts", "filters"] as const,
  list: (params: AnomaliesQueryParams) => ["alerts", "list", params] as const,
}

export async function getAnomalies(params: AnomaliesQueryParams) {
  return (
    await apiClient.get<AnomaliesPageData>(
      `/api/anomalies${buildQueryString({
        anomalyType: params.anomalyType,
        page: params.page,
        severity: params.severity,
        size: params.size,
      })}`,
    )
  ).data
}

export async function getAnomalyDetail(anomalyId: number) {
  return (await apiClient.get<AnomalyDetail>(`/api/anomalies/${anomalyId}`)).data
}

export async function getAnomalyFilters() {
  return (await apiClient.get<AnomalyFilters>("/api/anomalies/filters")).data
}
