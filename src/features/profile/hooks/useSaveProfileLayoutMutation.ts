import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveProfileLayout } from '@/features/profile/api'
import { profileQueryKeys } from '@/features/profile/model/queryKeys'

type SaveProfileLayoutInput = {
  token?: string | null
  username: string
  profileLayout: string
}

type Options = {
  onSuccess?: () => void
  onError?: (error: unknown) => void
}

export const useSaveProfileLayoutMutation = (options: Options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SaveProfileLayoutInput) => saveProfileLayout(payload),
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({
        queryKey: profileQueryKeys.layout(variables.username),
      })
      options.onSuccess?.()
    },
    onError: (error) => {
      options.onError?.(error)
    },
  })
}
