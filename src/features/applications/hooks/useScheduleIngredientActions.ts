import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { useUser } from '@/context/UserContext'

import {
  deleteScheduleIngredient,
  patchScheduleIngredient,
  type ScheduleIngredientEdit,
} from '../api/scheduleIngredientMutations'
import { applicationsQueryKeys } from '../model/queryKeys'
import type { ScheduleAIngredientRow } from './useScheduleAIngredients'

export function useScheduleIngredientActions(applicationId?: string) {
  const { token } = useUser()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ScheduleIngredientEdit | null>(null)
  const mutation = useMutation({
    mutationFn: async ({ id, attributes }: { id: string; attributes?: ScheduleIngredientEdit }) => {
      if (!applicationId || !id) throw new Error('Application and ingredient IDs are required.')
      if (attributes) {
        if (!attributes.ingredientLabelName.trim()) throw new Error('Ingredient Name is required.')
        return patchScheduleIngredient(id, applicationId, attributes, token)
      }
      return deleteScheduleIngredient(id, token)
    },
    onSuccess: async (_, variables) => {
      if (variables.attributes || variables.id === editingId) {
        setEditingId(null)
        setDraft(null)
      }
      await queryClient.invalidateQueries({
        queryKey: applicationsQueryKeys.scheduleAIngredients(applicationId),
      })
    },
    onError: (error) => toast.error(error.message),
  })
  return {
    editingId,
    draft,
    pending: mutation.isPending,
    start: (row: ScheduleAIngredientRow) => {
      setEditingId(row.ingredientId ?? null)
      setDraft({
        ingredientLabelName: row.name,
        manufacturer: String((row.raw as { manufacturer?: string })?.manufacturer ?? ''),
        source: row.source,
        brandName: row.brand,
        rawMaterialCode: row.rmc,
        certifyingAgency: String(
          (row.raw as { certifyingAgency?: string })?.certifyingAgency ?? '',
        ),
      })
    },
    change: (key: keyof ScheduleIngredientEdit, value: string) =>
      setDraft((current) => (current ? {
        ...current,
        [key]: value,
        ...(key === 'source' ? { manufacturer: value } : {}),
      } : current)),
    cancel: () => {
      setEditingId(null)
      setDraft(null)
    },
    save: () => {
      if (editingId && draft) mutation.mutate({ id: editingId, attributes: draft })
    },
    remove: (id: string) => mutation.mutate({ id }),
  }
}
