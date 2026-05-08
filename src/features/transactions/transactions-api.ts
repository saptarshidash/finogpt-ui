import { apiClient } from "@/lib/api/client"
import type {
  TransactionDetail,
  TransactionFilters,
  TransactionsPageData,
  TransactionsQueryParams,
} from "@/features/transactions/transactions-types"

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

export const transactionsQueryKeys = {
  detail: (txnId: number) => ["transactions", "detail", txnId] as const,
  filters: ["transactions", "filters"] as const,
  list: (params: TransactionsQueryParams) => ["transactions", "list", params] as const,
}

export async function getTransactions(params: TransactionsQueryParams) {
  return (
    await apiClient.get<TransactionsPageData>(
      `/api/transactions${buildQueryString({
        categoryId: params.categoryId,
        entityId: params.entityId,
        from: params.from,
        page: params.page,
        size: params.size,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
        to: params.to,
        type: params.type,
      })}`,
    )
  ).data
}

export async function getTransactionDetail(txnId: number) {
  return (await apiClient.get<TransactionDetail>(`/api/transactions/${txnId}`)).data
}

export async function getTransactionFilters() {
  return (await apiClient.get<TransactionFilters>("/api/transactions/filters")).data
}
