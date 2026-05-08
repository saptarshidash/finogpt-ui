import type { FilterOption, TransactionListItem } from "@/features/transactions/transactions-types"

export interface RecurringListItem {
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

export interface RecurringDetail extends RecurringListItem {
  recentTransactions: TransactionListItem[]
}

export interface RecurringPageData {
  items: RecurringListItem[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export interface RecurringQueryParams {
  entityId?: number
  categoryId?: number
  page: number
  size: number
}

export interface RecurringFilters {
  entities: FilterOption[]
  categories: FilterOption[]
}
