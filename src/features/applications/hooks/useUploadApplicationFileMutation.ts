import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadApplicationFile } from '@/features/applications/api'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'

type UploadPayload = {
  file?: File
  fileUrl?: string
  fileName?: string
  applicationId?: string | number | null
  taskInstanceID?: string | number | null
  description?: string
  token?: string | null
}

type Options = {
  onError?: (message: string) => void
}

const resolveUploadErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const maybeError = error as { message?: string; error?: string }
    return (
      maybeError.message ??
      maybeError.error ??
      'Failed to upload and submit the document. Please try again.'
    )
  }

  return 'Failed to upload and submit the document. Please try again.'
}

export const useUploadApplicationFileMutation = (options: Options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadApplicationFile,
    onSuccess: async (_response, variables) => {
      const appId = (variables as UploadPayload).applicationId
      if (appId != null && appId !== '') {
        await queryClient.invalidateQueries({
          queryKey: applicationsQueryKeys.detail(String(appId)),
        })
      }
    },
    onError: (error: unknown) => {
      options.onError?.(resolveUploadErrorMessage(error))
    },
  })
}
