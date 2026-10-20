import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'
import { deleteScheduleProduct, patchScheduleProduct, type ScheduleProductEdit } from '../api/scheduleProductMutations'
import { applicationsQueryKeys } from '../model/queryKeys'
import type { ScheduleBProductRow } from './useScheduleBProducts'

export function useScheduleProductActions(applicationId?: string) {
  const { token } = useUser()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ScheduleProductEdit | null>(null)
  const mutation = useMutation({
    mutationFn: ({ id, attributes }: { id: string; attributes?: ScheduleProductEdit }) => {
      if (!applicationId || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
        throw new Error('Application and product IDs are required.')
      }
      if (attributes) {
        if (!attributes.productName.trim()) throw new Error('Product Name is required.')
        return patchScheduleProduct(id, applicationId, attributes, token)
      }
      return deleteScheduleProduct(id, token)
    },
    onSuccess: async (_, variables) => {
      if (variables.attributes || variables.id === editingId) {
        setEditingId(null)
        setDraft(null)
      }
      await queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.scheduleBProducts(applicationId) })
    },
    onError: (error) => toast.error(error.message),
  })
  return {
    editingId, draft, pending: mutation.isPending,
    start: (row: ScheduleBProductRow) => {
      if (row.origin !== 'Application' || !row.productId || mutation.isPending) return
      setEditingId(row.productId)
      setDraft({
        productName: row.labelName, BrandName: row.brand, privateLabelCo: row.labelCo,
        privateLabel: row.excl === 'Y', Retail: row.use.includes('Consumer'), Industrial: row.use.includes('Industrial'),
        bulkShipped: row.bulk, list: row.list, symbol: row.symbol,
        internal_use_only: row.internal, passover: row.passover, UPC: row.upc,
      })
    },
    change: <K extends keyof ScheduleProductEdit>(key: K, value: ScheduleProductEdit[K]) =>
      setDraft((current) => current ? { ...current, [key]: value } : current),
    cancel: () => { setEditingId(null); setDraft(null) },
    save: () => { if (editingId && draft) mutation.mutate({ id: editingId, attributes: draft }) },
    remove: (id: string) => mutation.mutate({ id }),
  }
}
