export interface UserSettings {
  name: string | null
  email: string
  phone: string | null
}

export interface UpdateSettingsPayload {
  name: string | null
  phone: string | null
}

export interface EntitySearchOption {
  id: number
  name: string
}

export interface CategoryMetadata {
  id: number
  name: string
  type: string | null
}

export interface UserCategoryMapping {
  id: number
  entityId: number
  entityName: string
  categoryId: number
  categoryName: string
  createdAt: string
}

export interface UserCategoryMappingPayload {
  entityId: number
  categoryId: number
}
