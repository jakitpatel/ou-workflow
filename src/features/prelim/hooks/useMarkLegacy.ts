import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@/context/UserContext'
import { markPrelimApplicationLegacy } from '@/features/prelim/api/markLegacy'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'

export function useMarkLegacy() {
  const { token } = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (applicationId: string | number) => markPrelimApplicationLegacy(applicationId, token),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: prelimQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: prelimQueryKeys.details() }),
      ])
    },
  })
}
