import { apiClient } from "@/lib/api/client"
import { getTransactionFilters } from "@/features/transactions/transactions-api"
import type {
  RecurringDetail,
  RecurringFilters,
  RecurringPageData,
  RecurringQueryParams,
} from "@/features/recurring/recurring-types"

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

export const recurringQueryKeys = {
  detail: (recurringId: number) => ["recurring", "detail", recurringId] as const,
  filters: ["recurring", "filters"] as const,
  list: (params: RecurringQueryParams) => ["recurring", "list", params] as const,
}

export async function getRecurring(params: RecurringQueryParams) {
  return (
    await apiClient.get<RecurringPageData>(
      `/api/recurring${buildQueryString({
        categoryId: params.categoryId,
        entityId: params.entityId,
        page: params.page,
        size: params.size,
      })}`,
    )
  ).data
}

export async function getRecurringDetail(recurringId: number) {
  return (await apiClient.get<RecurringDetail>(`/api/recurring/${recurringId}`)).data
}

export async function getRecurringFilters(): Promise<RecurringFilters> {
  const filters = await getTransactionFilters()
  return {
    categories: filters.categories,
    entities: filters.entities,
  }
}
