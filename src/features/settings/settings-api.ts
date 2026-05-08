import { apiClient } from "@/lib/api/client"
import type {
  CategoryMetadata,
  EntitySearchOption,
  UpdateSettingsPayload,
  UserCategoryMapping,
  UserCategoryMappingPayload,
  UserSettings,
} from "@/features/settings/settings-types"

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

export const settingsQueryKeys = {
  categories: ["settings", "categories"] as const,
  entitySearch: (query: string, limit: number) =>
    ["settings", "entity-search", query, limit] as const,
  mappings: ["settings", "mappings"] as const,
  profile: ["settings", "profile"] as const,
}

export async function getSettings() {
  return (await apiClient.get<UserSettings>("/api/settings")).data
}

export async function updateSettings(payload: UpdateSettingsPayload) {
  return (await apiClient.put<UserSettings>("/api/settings", payload)).data
}

export async function deleteAllUserData() {
  return (await apiClient.delete<null>("/api/settings")).data
}

export async function getCategories() {
  return (await apiClient.get<CategoryMetadata[]>("/api/categories")).data
}

export async function searchEntities(query: string, limit = 10) {
  return (
    await apiClient.get<EntitySearchOption[]>(
      `/api/entities/search${buildQueryString({ limit, q: query })}`,
    )
  ).data
}

export async function getUserCategoryMappings() {
  return (await apiClient.get<UserCategoryMapping[]>("/api/user-category-mappings")).data
}

export async function createUserCategoryMapping(payload: UserCategoryMappingPayload) {
  return (
    await apiClient.post<UserCategoryMapping>("/api/user-category-mappings", payload)
  ).data
}

export async function updateUserCategoryMapping(
  mappingId: number,
  payload: UserCategoryMappingPayload,
) {
  return (
    await apiClient.put<UserCategoryMapping>(
      `/api/user-category-mappings/${mappingId}`,
      payload,
    )
  ).data
}

export async function deleteUserCategoryMapping(mappingId: number) {
  return (await apiClient.delete<null>(`/api/user-category-mappings/${mappingId}`)).data
}
