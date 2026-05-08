export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface PagedData<T> {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export type PagedResponse<T> = ApiResponse<PagedData<T>>
