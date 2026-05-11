import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Check,
  LoaderCircle,
  PencilLine,
  Save,
  Search,
  SearchX,
  Trash2,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useNavigate } from "react-router"
import { z } from "zod"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { settingsQueryKeys } from "@/features/settings/settings-api"
import {
  createUserCategoryMapping,
  deleteAllUserData,
  deleteUserCategoryMapping,
  getCategories,
  getSettings,
  getUserCategoryMappings,
  searchEntities,
  updateSettings,
  updateUserCategoryMapping,
} from "@/features/settings/settings-api"
import { useAuth } from "@/features/auth/auth-context"
import type {
  EntitySearchOption,
  UserCategoryMapping,
} from "@/features/settings/settings-types"
import type { User } from "@/features/auth/auth-types"
import { ApiError } from "@/lib/api/client"
import { formatDate } from "@/lib/format/date"

const phonePattern = /^[0-9]{10,15}$/

const settingsSchema = z.object({
  name: z.string().trim().max(120, "Name must be 120 characters or fewer."),
  phone: z
    .string()
    .trim()
    .refine((value) => !value || phonePattern.test(value), "Enter a valid mobile number."),
})

const mappingSchema = z.object({
  categoryId: z.coerce
    .number()
    .int()
    .refine((value) => value > 0, "Choose a category."),
  entityId: z
    .number()
    .nullable()
    .refine((value) => value !== null && value > 0, "Select a merchant."),
})

type SettingsFormValues = z.infer<typeof settingsSchema>
type MappingFormInput = z.input<typeof mappingSchema>
type MappingFormValues = z.output<typeof mappingSchema>
const DELETE_CONFIRMATION_TEXT = "DELETE"

function formatDateTime(value: string) {
  return formatDate(value, "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function EmptyMappingsState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 px-5 py-12 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-border bg-background">
        <SearchX className="size-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">No category overrides yet</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Search for a merchant, choose a category, and save the mapping to override future views.
      </p>
    </div>
  )
}

function MappingRow({
  isDeleting,
  isEditing,
  mapping,
  onDelete,
  onEdit,
}: {
  isDeleting: boolean
  isEditing: boolean
  mapping: UserCategoryMapping
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-4 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isEditing ? "default" : "outline"}>
              {isEditing ? "Editing" : "Override"}
            </Badge>
            <Badge variant="outline">#{mapping.id}</Badge>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{mapping.entityName}</p>
            <p className="text-sm text-muted-foreground">
              Reassigned to <span className="font-medium text-foreground">{mapping.categoryName}</span>
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Created {formatDateTime(mapping.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            <PencilLine className="size-4" />
            <span>Edit</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            <span>{isDeleting ? "Deleting..." : "Delete"}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function DeleteDataModal({
  confirmationValue,
  email,
  error,
  isPending,
  onChangeConfirmation,
  onClose,
  onConfirm,
}: {
  confirmationValue: string
  email: string
  error: string | null
  isPending: boolean
  onChangeConfirmation: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}) {
  const isConfirmationMatched = confirmationValue.trim().toUpperCase() === DELETE_CONFIRMATION_TEXT

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
      <Card className="w-full max-w-xl border-red-500/30 shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base text-red-400">Delete all user data</CardTitle>
              <CardDescription>
                This permanently deletes the account and all user-owned data for{" "}
                <span className="font-medium text-foreground">{email}</span>.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              aria-label="Close delete data confirmation"
            >
              <X className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            <p className="font-medium text-red-800 dark:text-red-100">This action cannot be undone.</p>
            <p className="mt-1">
              Transactions, uploads, mappings, saved query history, and account access are removed immediately after confirmation.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-confirmation">
              Type <span className="font-semibold text-foreground">{DELETE_CONFIRMATION_TEXT}</span> to continue
            </Label>
            <Input
              id="delete-confirmation"
              value={confirmationValue}
              onChange={(event) => onChangeConfirmation(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="h-11"
              placeholder={DELETE_CONFIRMATION_TEXT}
              disabled={isPending}
            />
          </div>

          {error ? <ErrorBanner message={error} /> : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="h-11"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isPending || !isConfirmationMatched}
              className="h-11 bg-red-600 text-white hover:bg-red-500"
            >
              {isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  <span>Deleting account...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  <span>Delete all data</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function SettingsPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [mappingMessage, setMappingMessage] = useState<string | null>(null)
  const [mappingError, setMappingError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteConfirmationValue, setDeleteConfirmationValue] = useState("")
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [entityQuery, setEntityQuery] = useState("")
  const [selectedEntity, setSelectedEntity] = useState<EntitySearchOption | null>(null)
  const [editingMappingId, setEditingMappingId] = useState<number | null>(null)

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  })

  const mappingForm = useForm<MappingFormInput, undefined, MappingFormValues>({
    resolver: zodResolver(mappingSchema),
    defaultValues: {
      categoryId: 0,
      entityId: null,
    },
  })

  const settingsQuery = useQuery({
    queryKey: settingsQueryKeys.profile,
    queryFn: getSettings,
    staleTime: 5 * 60_000,
  })

  const categoriesQuery = useQuery({
    queryKey: settingsQueryKeys.categories,
    queryFn: getCategories,
    staleTime: 5 * 60_000,
  })

  const mappingsQuery = useQuery({
    queryKey: settingsQueryKeys.mappings,
    queryFn: getUserCategoryMappings,
  })

  const trimmedEntityQuery = entityQuery.trim()
  const entitySearchQuery = useQuery({
    queryKey: settingsQueryKeys.entitySearch(trimmedEntityQuery, 10),
    queryFn: () => searchEntities(trimmedEntityQuery, 10),
    enabled: trimmedEntityQuery.length > 0,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!settingsQuery.data) {
      return
    }

    settingsForm.reset({
      name: settingsQuery.data.name ?? "",
      phone: settingsQuery.data.phone ?? "",
    })
  }, [settingsForm, settingsQuery.data])

  const categories = useMemo(() => {
    const nextCategories = [...(categoriesQuery.data ?? [])]
    nextCategories.sort((left, right) => left.name.localeCompare(right.name))
    return nextCategories
  }, [categoriesQuery.data])

  const mappings = useMemo(() => {
    const nextMappings = [...(mappingsQuery.data ?? [])]
    nextMappings.sort((left, right) => left.entityName.localeCompare(right.entityName))
    return nextMappings
  }, [mappingsQuery.data])

  function clearMappingEditor() {
    setEditingMappingId(null)
    setSelectedEntity(null)
    setEntityQuery("")
    mappingForm.reset({
      categoryId: 0,
      entityId: null,
    })
  }

  function resetMappingEditor() {
    clearMappingEditor()
    setMappingError(null)
    setMappingMessage(null)
  }

  function openDeleteModal() {
    setDeleteError(null)
    setDeleteConfirmationValue("")
    setIsDeleteModalOpen(true)
  }

  function closeDeleteModal() {
    if (deleteAccountMutation.isPending) {
      return
    }

    setDeleteError(null)
    setDeleteConfirmationValue("")
    setIsDeleteModalOpen(false)
  }

  function handleEntityQueryChange(value: string) {
    setEntityQuery(value)

    if (selectedEntity && value !== selectedEntity.name) {
      setSelectedEntity(null)
      mappingForm.setValue("entityId", null, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  function handleEntitySelect(entity: EntitySearchOption) {
    setSelectedEntity(entity)
    setEntityQuery(entity.name)
    mappingForm.setValue("entityId", entity.id, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  function beginEditMapping(mapping: UserCategoryMapping) {
    setEditingMappingId(mapping.id)
    setSelectedEntity({
      id: mapping.entityId,
      name: mapping.entityName,
    })
    setEntityQuery(mapping.entityName)
    setMappingMessage(null)
    setMappingError(null)
    mappingForm.reset({
      categoryId: mapping.categoryId,
      entityId: mapping.entityId,
    })
  }

  const updateSettingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: async (data) => {
      setProfileError(null)
      setProfileMessage("Profile settings updated.")
      settingsForm.reset({
        name: data.name ?? "",
        phone: data.phone ?? "",
      })
      queryClient.setQueryData(settingsQueryKeys.profile, data)
      queryClient.setQueryData(["auth", "me"], (currentUser: User | undefined) => {
        if (!currentUser) {
          return currentUser
        }

        return {
          ...currentUser,
          email: data.email,
          name: data.name ?? currentUser.name,
          phone: data.phone ?? "",
        }
      })
      await queryClient.invalidateQueries({ queryKey: settingsQueryKeys.profile })
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setProfileError(error.message)
        return
      }

      setProfileError("Unable to update profile settings right now.")
    },
  })

  const saveMappingMutation = useMutation({
    mutationFn: ({
      categoryId,
      entityId,
      mappingId,
    }: {
      categoryId: number
      entityId: number
      mappingId: number | null
    }) =>
      mappingId === null
        ? createUserCategoryMapping({ categoryId, entityId })
        : updateUserCategoryMapping(mappingId, { categoryId, entityId }),
    onSuccess: async (_, variables) => {
      setMappingError(null)
      setMappingMessage(
        variables.mappingId === null
          ? "Category override created."
          : "Category override updated.",
      )
      clearMappingEditor()
      await queryClient.invalidateQueries({ queryKey: settingsQueryKeys.mappings })
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setMappingError(error.message)
        return
      }

      setMappingError("Unable to save the category override right now.")
    },
  })

  const deleteMappingMutation = useMutation({
    mutationFn: deleteUserCategoryMapping,
    onSuccess: async () => {
      setMappingError(null)
      setMappingMessage("Category override deleted.")
      await queryClient.invalidateQueries({ queryKey: settingsQueryKeys.mappings })
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setMappingError(error.message)
        return
      }

      setMappingError("Unable to delete the category override right now.")
    },
  })

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAllUserData,
    onSuccess: () => {
      closeDeleteModal()
      auth.logout()
      navigate("/login", { replace: true })
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setDeleteError(error.message)
        return
      }

      setDeleteError("Unable to delete this account right now.")
    },
  })

  useEffect(() => {
    if (!isDeleteModalOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        if (!deleteAccountMutation.isPending) {
          setDeleteError(null)
          setDeleteConfirmationValue("")
          setIsDeleteModalOpen(false)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [deleteAccountMutation.isPending, isDeleteModalOpen])

  const onSubmitSettings = settingsForm.handleSubmit(async (values) => {
    setProfileMessage(null)
    setProfileError(null)

    await updateSettingsMutation.mutateAsync({
      name: values.name.trim() || null,
      phone: values.phone.trim() || null,
    })
  })

  const onSubmitMapping = mappingForm.handleSubmit(async (values) => {
    if (values.entityId === null) {
      return
    }

    setMappingMessage(null)
    setMappingError(null)

    await saveMappingMutation.mutateAsync({
      categoryId: values.categoryId,
      entityId: values.entityId,
      mappingId: editingMappingId,
    })
  })

  const selectedCategoryId = useWatch({
    control: mappingForm.control,
    name: "categoryId",
  })
  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) {
      return null
    }

    return categories.find((category) => category.id === selectedCategoryId) ?? null
  }, [categories, selectedCategoryId])

  const entityResults = entitySearchQuery.data ?? []

  async function handleDeleteAllData() {
    setDeleteError(null)
    await deleteAccountMutation.mutateAsync()
  }

  return (
    <>
      {isDeleteModalOpen ? (
        <DeleteDataModal
          confirmationValue={deleteConfirmationValue}
          email={settingsQuery.data?.email ?? auth.user?.email ?? "this account"}
          error={deleteError}
          isPending={deleteAccountMutation.isPending}
          onChangeConfirmation={setDeleteConfirmationValue}
          onClose={closeDeleteModal}
          onConfirm={() => {
            void handleDeleteAllData()
          }}
        />
      ) : null}

      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge>Settings</Badge>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground">Profile and taxonomy</h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Manage profile details and override merchant-to-category mappings that affect downstream transaction and category views.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{mappings.length} override{mappings.length === 1 ? "" : "s"}</Badge>
            <Badge variant="outline">{categories.length} categories</Badge>
          </div>
        </div>

        <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile settings</CardTitle>
                <CardDescription>Update the account details used across authenticated workspace surfaces.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {settingsQuery.isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-11 w-full" />
                    <Skeleton className="h-11 w-full" />
                    <Skeleton className="h-11 w-full" />
                  </div>
                ) : settingsQuery.isError ? (
                  <ErrorBanner message="Unable to load profile settings right now." />
                ) : (
                  <form className="space-y-4" onSubmit={onSubmitSettings}>
                    <div className="space-y-2">
                      <Label htmlFor="settings-name">Name</Label>
                      <Input
                        id="settings-name"
                        placeholder="Your display name"
                        className="h-11"
                        {...settingsForm.register("name")}
                      />
                      {settingsForm.formState.errors.name ? (
                        <p className="text-sm text-red-400">
                          {settingsForm.formState.errors.name.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="settings-email">Email</Label>
                      <Input
                        id="settings-email"
                        value={settingsQuery.data?.email ?? ""}
                        disabled
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="settings-phone">Phone</Label>
                      <Input
                        id="settings-phone"
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="9999999999"
                        className="h-11"
                        {...settingsForm.register("phone")}
                      />
                      {settingsForm.formState.errors.phone ? (
                        <p className="text-sm text-red-400">
                          {settingsForm.formState.errors.phone.message}
                        </p>
                      ) : null}
                    </div>

                    {profileError ? <ErrorBanner message={profileError} /> : null}
                    {profileMessage ? (
                      <div className="flex items-start gap-2 rounded-md border border-green-500/20 bg-green-500/10 px-3 py-2.5 text-sm text-green-300">
                        <Check className="mt-0.5 size-4 shrink-0" />
                        <span>{profileMessage}</span>
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      className="h-11 w-full justify-center"
                      disabled={
                        updateSettingsMutation.isPending ||
                        !settingsForm.formState.isDirty
                      }
                    >
                      {updateSettingsMutation.isPending ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          <span>Saving profile...</span>
                        </>
                      ) : (
                        <>
                          <Save className="size-4" />
                          <span>Save profile</span>
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card className="border-red-500/20">
              <CardHeader>
              <CardTitle className="text-red-700 dark:text-red-400">Danger zone</CardTitle>
                <CardDescription>
                  Permanently remove the account and all user-owned data from the workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                  <p className="font-medium text-red-800 dark:text-red-100">This action is irreversible.</p>
                  <p className="mt-1">
                    Deleting this account removes statement uploads, transactions, mappings, query history, and session access.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={openDeleteModal}
                  className="h-11 w-full justify-center bg-red-600 text-white hover:bg-red-500"
                  disabled={settingsQuery.isLoading || deleteAccountMutation.isPending}
                >
                  <Trash2 className="size-4" />
                  <span>Delete all user data</span>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {editingMappingId === null ? "Add category override" : "Edit category override"}
                </CardTitle>
                <CardDescription>
                  Search for a merchant entity, then assign the category you want transaction and analytics views to use.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <form className="space-y-4" onSubmit={onSubmitMapping}>
                  <div className="space-y-2">
                    <Label htmlFor="mapping-entity-search">Merchant search</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="mapping-entity-search"
                        value={entityQuery}
                        onChange={(event) => handleEntityQueryChange(event.target.value)}
                        placeholder="Search merchants by name"
                        className="h-11 pl-9 pr-10"
                      />
                      {entityQuery ? (
                        <button
                          type="button"
                          onClick={() => handleEntityQueryChange("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="Clear merchant search"
                        >
                          <X className="size-4" />
                        </button>
                      ) : null}
                    </div>
                    {mappingForm.formState.errors.entityId ? (
                      <p className="text-sm text-red-400">
                        {mappingForm.formState.errors.entityId.message}
                      </p>
                    ) : null}
                  </div>

                  {selectedEntity ? (
                    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-3">
                      <div className="flex size-9 items-center justify-center rounded-full border border-border bg-background">
                        <UserRound className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {selectedEntity.name}
                        </p>
                        <p className="text-xs text-muted-foreground">Selected merchant</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEntityQueryChange("")}
                      >
                        Clear
                      </Button>
                    </div>
                  ) : null}

                  {trimmedEntityQuery.length > 0 && !selectedEntity ? (
                    <div className="rounded-md border border-border bg-muted/40">
                      {entitySearchQuery.isLoading ? (
                        <div className="space-y-2 p-3">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : entitySearchQuery.isError ? (
                        <div className="px-3 py-4 text-sm text-muted-foreground">
                          Unable to search merchants right now.
                        </div>
                      ) : entityResults.length ? (
                        <div className="max-h-64 space-y-1 overflow-y-auto p-2">
                          {entityResults.map((entity) => (
                            <button
                              key={entity.id}
                              type="button"
                              onClick={() => handleEntitySelect(entity)}
                              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                            >
                              <span className="truncate">{entity.name}</span>
                              <Badge variant="outline">#{entity.id}</Badge>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-4 text-sm text-muted-foreground">
                          No merchants matched this search.
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="mapping-category">Category</Label>
                    <select
                      id="mapping-category"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      {...mappingForm.register("categoryId")}
                    >
                      <option value={0}>Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.type ? `${category.name} (${category.type})` : category.name}
                        </option>
                      ))}
                    </select>
                    {mappingForm.formState.errors.categoryId ? (
                      <p className="text-sm text-red-400">
                        {mappingForm.formState.errors.categoryId.message}
                      </p>
                    ) : null}
                  </div>

                  {selectedCategory ? (
                    <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {selectedCategory.name}
                        </p>
                        {selectedCategory.type ? (
                          <Badge variant="outline">{selectedCategory.type}</Badge>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {mappingError ? <ErrorBanner message={mappingError} /> : null}
                  {mappingMessage ? (
                    <div className="flex items-start gap-2 rounded-md border border-green-500/20 bg-green-500/10 px-3 py-2.5 text-sm text-green-300">
                      <Check className="mt-0.5 size-4 shrink-0" />
                      <span>{mappingMessage}</span>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="submit"
                      className="h-11 flex-1 justify-center"
                      disabled={saveMappingMutation.isPending || categoriesQuery.isLoading}
                    >
                      {saveMappingMutation.isPending ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          <span>
                            {editingMappingId === null ? "Saving override..." : "Updating override..."}
                          </span>
                        </>
                      ) : (
                        <>
                          <Save className="size-4" />
                          <span>
                            {editingMappingId === null ? "Save override" : "Update override"}
                          </span>
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      onClick={resetMappingEditor}
                      disabled={saveMappingMutation.isPending}
                    >
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Category override mappings</CardTitle>
              <CardDescription>
                Review existing merchant overrides and adjust them when your taxonomy changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mappingsQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-28 w-full rounded-lg" />
                  <Skeleton className="h-28 w-full rounded-lg" />
                  <Skeleton className="h-28 w-full rounded-lg" />
                </div>
              ) : mappingsQuery.isError ? (
                <ErrorBanner message="Unable to load category override mappings right now." />
              ) : !mappings.length ? (
                <EmptyMappingsState />
              ) : (
                <div className="space-y-3">
                  {mappings.map((mapping) => (
                    <MappingRow
                      key={mapping.id}
                      mapping={mapping}
                      isEditing={editingMappingId === mapping.id}
                      isDeleting={
                        deleteMappingMutation.isPending &&
                        deleteMappingMutation.variables === mapping.id
                      }
                      onEdit={() => beginEditMapping(mapping)}
                      onDelete={() => {
                        setMappingMessage(null)
                        setMappingError(null)
                        if (editingMappingId === mapping.id) {
                          clearMappingEditor()
                        }
                        deleteMappingMutation.mutate(mapping.id)
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  )
}
