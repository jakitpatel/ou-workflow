import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@/context/UserContext'
import { applicationsQueryKeys } from '../model/queryKeys'
import { saveScheduleProductSelection } from '../api/scheduleProductSelection'
import type { ScheduleBProductsResult } from '@/types/application'
import type { ScheduleBProductRow } from './useScheduleBProducts'

export function useSaveScheduleProductSelection(applicationId?: string | number) {
  const { token } = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    scope: { id: 'schedule-product-selection' },
    mutationFn: ({ rows, selected }: { rows: ScheduleBProductRow[]; selected: boolean }) => {
      const productIds = Array.from(new Set(
        rows.filter((row) => row.origin === 'Application').map((row) => row.productId).filter(
          (id): id is string => Boolean(id),
        ),
      ))
      if (!productIds.length) return Promise.resolve()
      return saveScheduleProductSelection(productIds, selected, token)
    },
    onSuccess: (_data, { rows, selected }) => {
      const ids = new Set(rows.map((row) => row.productId))
      queryClient.setQueryData<ScheduleBProductsResult>(
        applicationsQueryKeys.scheduleBProducts(applicationId == null ? undefined : String(applicationId)),
        (current) => current ? {
          ...current,
          scheduleProducts: current.scheduleProducts.map((product) =>
            ids.has(String(product.ScheduleProductId)) ? { ...product, isSelected: selected } : product),
        } : current,
      )
    },
  })
}

