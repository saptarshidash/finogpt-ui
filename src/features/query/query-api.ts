import { apiClient } from "@/lib/api/client"
import type {
  QueryHistoryDetail,
  QueryHistoryPageData,
  QueryHistoryParams,
  QueryRequest,
  QueryResponse,
} from "@/features/query/query-types"

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

export const queryWorkspaceKeys = {
  historyDetail: (historyId: number) => ["query", "history", "detail", historyId] as const,
  historyList: (params: QueryHistoryParams) => ["query", "history", "list", params] as const,
  historyRoot: ["query", "history"] as const,
}

export async function submitQuery(payload: QueryRequest) {
  return apiClient.postRaw<QueryResponse>("/api/query", payload)
}

export async function getQueryHistory(params: QueryHistoryParams) {
  return (
    await apiClient.get<QueryHistoryPageData>(
      `/api/query/history${buildQueryString({
        page: params.page,
        size: params.size,
      })}`,
    )
  ).data
}

export async function getQueryHistoryDetail(historyId: number) {
  return (await apiClient.get<QueryHistoryDetail>(`/api/query/history/${historyId}`)).data
}

export async function deleteQueryHistory(historyId: number) {
  await apiClient.delete<null>(`/api/query/history/${historyId}`)
}
