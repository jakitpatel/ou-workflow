import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNcrcDashboardState } from '@/features/applications/hooks/useNcrcDashboardState'
import { renderWithProviders } from '@/test/renderWithProviders'

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

    class MockEventSource {
      url: string
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      close = vi.fn()

      constructor(url: string) {
        this.url = url
        eventSources.push(this)
      }
    }

    vi.stubGlobal('EventSource', MockEventSource)

    try {
      renderWithProviders(<DashboardStateHarness />)

      expect(eventSources).toHaveLength(0)

      fireEvent.click(screen.getByRole('button', { name: 'open-my-messages' }))

      await waitFor(() => {
        expect(screen.getByText('my-notes-open:yes')).toBeTruthy()
        expect(screen.getByText('incoming-count:1')).toBeTruthy()
        expect(fetchMyMessagesMock).toHaveBeenCalledTimes(1)
        expect(eventSources).toHaveLength(1)
      })

      expect(eventSources[0]?.url).toBe('/events')

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
