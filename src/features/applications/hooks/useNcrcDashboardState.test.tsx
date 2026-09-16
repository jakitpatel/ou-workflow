import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNcrcDashboardState } from '@/features/applications/hooks/useNcrcDashboardState'
import { renderWithProviders } from '@/test/renderWithProviders'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'

const fetchApplicantsMock = vi.fn()
vi.mock('@/features/applications/api', () => ({
  fetchApplicants: (...args: unknown[]) => fetchApplicantsMock(...args),
}))

const fetchMyMessagesMock = vi.fn()
const markTaskNoteAsReadMock = vi.fn()
const updateTaskNoteTagMock = vi.fn()
const mutateAsyncMock = vi.fn()
const fetchNextPageMock = vi.fn()
const navigateMock = vi.fn()

vi.mock('@/features/tasks/api', () => ({
  fetchMyMessages: (...args: unknown[]) => fetchMyMessagesMock(...args),
  markTaskNoteAsRead: (...args: unknown[]) => markTaskNoteAsReadMock(...args),
  updateTaskNoteTag: (...args: unknown[]) => updateTaskNoteTagMock(...args),
}))

vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({
  useCreateTaskNoteMutation: () => ({
    isPending: false,
    mutateAsync: (...args: unknown[]) => mutateAsyncMock(...args),
  }),
}))

vi.mock('@/features/applications/hooks/usePagedApplications', () => ({
  usePagedApplications: () => ({
    isLoading: false,
    isError: false,
    error: null,
    data: {
      data: [],
      meta: {
        total_count: 0,
      },
    },
  }),
}))

vi.mock('@/features/applications/hooks/useInfiniteApplications', () => ({
  useInfiniteApplications: () => ({
    isLoading: false,
    isError: false,
    error: null,
    data: undefined,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: fetchNextPageMock,
  }),
}))

function DashboardStateHarness() {
  const dashboard = useNcrcDashboardState({
    search: {
      q: '',
      status: '',
      priority: '',
      page: 0,
      myOnly: false,
    },
    navigate: navigateMock,
  })

  return (
    <div>
      <button type="button" onClick={dashboard.openMyNotesDrawer}>
        open-my-messages
      </button>
      <div>my-notes-open:{dashboard.myNotesOpen ? 'yes' : 'no'}</div>
      <div>incoming-count:{dashboard.myNotes.incoming.length}</div>
    </div>
  )
}

describe('useNcrcDashboardState', () => {
  beforeEach(() => {
    sessionStorage.clear()
    sessionStorage.setItem(
      'user',
      JSON.stringify({
        username: 'S.Benjamin',
        role: 'ALL',
        roles: [],
        delegated: [],
        loginTime: Date.now(),
      }),
    )
    sessionStorage.setItem('access_token', 'test-access-token')

    fetchMyMessagesMock.mockReset()
    markTaskNoteAsReadMock.mockReset()
    updateTaskNoteTagMock.mockReset()
    mutateAsyncMock.mockReset()
    fetchNextPageMock.mockReset()
    navigateMock.mockReset()
    fetchApplicantsMock.mockReset()

    fetchMyMessagesMock.mockResolvedValue({
      incoming: [{ MessageID: '101', MessageText: 'Direct note', ToUser: 'S.Benjamin' }],
      outgoing: [],
      mention: [],
      private: [],
    })
  })

  it('opens an SSE connection for My Messages and refreshes on message notifications', async () => {
    const eventSources: Array<{
      url: string
      onmessage: ((event: MessageEvent) => void) | null
      onerror: ((event: Event) => void) | null
      close: ReturnType<typeof vi.fn>
    }> = []

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (!url.endsWith('/events/')) return Response.json({})
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          eventSources.push({
            url,
            onmessage: (event) => controller.enqueue(new TextEncoder().encode(`data: ${event.data}\n\n`)),
            onerror: null,
            close: vi.fn(),
          })
        },
      })
      return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })
    }))

    try {
      const { queryClient } = renderWithProviders(<DashboardStateHarness />)
      const key = applicationsQueryKeys.paged({ page: 0 })
      queryClient.setQueryData(key, { data: [{ applicationId: 1332, status: 'new' }] })
      fetchApplicantsMock.mockResolvedValue({ data: [{ applicationId: 1332, status: 'completed' }] })

      await waitFor(() => expect(eventSources).toHaveLength(1))
      expect(fetchMyMessagesMock).not.toHaveBeenCalled()

      act(() => {
        eventSources[0]?.onmessage?.({
          data: JSON.stringify({
            type: 'reload_workflow_application',
            data: { ApplicationType: 'WORKFLOW', application_id: 1332, task_instance_id: 18580 },
          }),
        } as MessageEvent)
      })
      await waitFor(() => {
        expect(queryClient.getQueryData(key)).toEqual({
          data: [{ applicationId: 1332, status: 'completed' }],
        })
      })
      expect(fetchApplicantsMock).toHaveBeenCalledExactlyOnceWith({
        applicationId: 1332, limit: 1, myOnly: false, page: 0, token: 'test-access-token',
      })
      expect(fetchMyMessagesMock).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole('button', { name: 'open-my-messages' }))

      await waitFor(() => {
        expect(screen.getByText('my-notes-open:yes')).toBeTruthy()
        expect(screen.getByText('incoming-count:1')).toBeTruthy()
        expect(fetchMyMessagesMock).toHaveBeenCalledTimes(1)
        expect(eventSources).toHaveLength(1)
      })

      expect(eventSources[0]?.url).toBe('/events/')

      act(() => {
        eventSources[0]?.onmessage?.({
          data: JSON.stringify({
            type: 'refresh_messages',
            data: {
              ApplicationId: 1410,
              FromUser: 'TYLER.BAND',
              MessageId: 40,
              MessageType: 'Text',
              TaskInstanceId: 0,
              ToUser: 'S.Benjamin',
              root_conversation_id: 40,
            },
          }),
        } as MessageEvent)
      })

      await waitFor(() => {
        expect(fetchMyMessagesMock).toHaveBeenCalledTimes(2)
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
