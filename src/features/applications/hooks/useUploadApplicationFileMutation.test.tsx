import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, render, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useUploadApplicationFileMutation } from './useUploadApplicationFileMutation'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'

const upload = vi.hoisted(() => vi.fn())
vi.mock('@/features/applications/api', () => ({ uploadApplicationFile: upload }))

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

describe('useUploadApplicationFileMutation', () => {
  it('refreshes the open Application Intake details so the new file appears without reloading', async () => {
    upload.mockResolvedValue({ file_path: '/file/9' })
    const { wrapper } = setup()
    // The Intake details drawer reads get_prelim_application_details keyed by externalReferenceId.
    const fetchIntakeDetails = vi.fn()
      .mockResolvedValueOnce({ files: [] })
      .mockResolvedValueOnce({ files: [{ fileName: 'new.pdf' }] })
    function IntakeFiles() {
      const { data } = useQuery({ queryKey: prelimQueryKeys.detail(555), queryFn: fetchIntakeDetails })
      return <span data-testid="files">{data?.files.map((file: { fileName: string }) => file.fileName).join(',')}</span>
    }
    const view = render(<IntakeFiles />, { wrapper })
    await waitFor(() => expect(fetchIntakeDetails).toHaveBeenCalledTimes(1))

    const { result } = renderHook(() => useUploadApplicationFileMutation(), { wrapper })
    await act(() => result.current.mutateAsync({ applicationId: 42, description: 'Tag', file: new File(['x'], 'new.pdf') }))

    expect(fetchIntakeDetails).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(view.getByTestId('files').textContent).toBe('new.pdf'))
  })

  it('also refreshes the Application Dashboard details and leaves unrelated queries alone', async () => {
    upload.mockResolvedValue({ file_path: '/file/9' })
    const { client, wrapper } = setup()
    client.setQueryData(applicationsQueryKeys.detail('42'), { files: [] })
    client.setQueryData(applicationsQueryKeys.detail('43'), { files: [] })
    client.setQueryData(prelimQueryKeys.list({ page: 0 }), { data: [] })

    const { result } = renderHook(() => useUploadApplicationFileMutation(), { wrapper })
    await act(() => result.current.mutateAsync({ applicationId: 42, description: 'Tag', file: new File(['x'], 'a.pdf') }))

    expect(client.getQueryState(applicationsQueryKeys.detail('42'))?.isInvalidated).toBe(true)
    expect(client.getQueryState(applicationsQueryKeys.detail('43'))?.isInvalidated).toBe(false)
    expect(client.getQueryState(prelimQueryKeys.list({ page: 0 }))?.isInvalidated).toBe(false)
  })

  it('refreshes nothing when the upload fails', async () => {
    upload.mockRejectedValue(new Error('Upload failed'))
    const onError = vi.fn()
    const { client, wrapper } = setup()
    client.setQueryData(prelimQueryKeys.detail(555), { files: [] })

    const { result } = renderHook(() => useUploadApplicationFileMutation({ onError }), { wrapper })
    await act(async () => {
      await expect(result.current.mutateAsync({ applicationId: 42, file: new File(['x'], 'a.pdf') })).rejects.toThrow('Upload failed')
    })

    expect(onError).toHaveBeenCalledWith('Upload failed')
    expect(client.getQueryState(prelimQueryKeys.detail(555))?.isInvalidated).toBe(false)
  })
})
