import type { PagedData } from "@/lib/types/api"

export type TransactionType = "DEBIT" | "CREDIT"
export type TransactionSortBy = "txnDate" | "amount" | "createdAt"
export type TransactionSortDir = "asc" | "desc"

export interface FilterOption {
  id: number
  name: string
}

export interface TransactionListItem {
  id: number
  txnDate: string
  txnTime: string | null
  entityId: number | null
  entityName: string | null
  categoryId: number | null
  categoryName: string | null
  amount: number
  txnType: TransactionType | null
  rawDetails: string | null
  source: string | null
  externalTxnId: string | null
  createdAt: string
}

export interface TransactionDetail extends TransactionListItem {
  userCategoryId: number | null
  ingestionJobId: string | null
}

export interface TransactionFilters {
  minDate: string | null
  maxDate: string | null
  entities: FilterOption[]
  categories: FilterOption[]
  types: string[]
}

export interface TransactionsQueryParams {
  from?: string
  to?: string
  type?: TransactionType
  entityId?: number
  categoryId?: number
  page: number
  size: number
  sortBy: TransactionSortBy
  sortDir: TransactionSortDir
}

export type TransactionsPageData = PagedData<TransactionListItem>
