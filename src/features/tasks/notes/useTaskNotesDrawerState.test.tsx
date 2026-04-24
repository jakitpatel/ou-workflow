import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTaskNotesDrawerState } from '@/features/tasks/notes/useTaskNotesDrawerState'
import { renderWithProviders } from '@/test/renderWithProviders'

const fetchMyMessagesMock = vi.fn()
const markTaskNoteAsReadMock = vi.fn()
const mutateAsyncMock = vi.fn()

vi.mock('@/features/tasks/api', () => ({
  fetchMyMessages: (...args: unknown[]) => fetchMyMessagesMock(...args),
  markTaskNoteAsRead: (...args: unknown[]) => markTaskNoteAsReadMock(...args),
}))

vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({
  useCreateTaskNoteMutation: () => ({
    isPending: false,
    mutateAsync: (...args: unknown[]) => mutateAsyncMock(...args),
  }),
}))

vi.mock('@/features/profile/api', () => ({
  fetchProfileLayout: vi.fn(async () => []),
}))

function NotesHookHarness() {
  const notes = useTaskNotesDrawerState({
    applicationId: 42,
  })

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          void notes.openDrawer({
            contextKey: 'application:42',
            taskName: 'Application 42',
            tab: 'mention',
          })
        }
      >
        open-drawer
      </button>

      <input
        aria-label="compose-text"
        value={notes.composeText}
        onChange={(e) => notes.setComposeText(e.target.value)}
      />

      <button type="button" onClick={() => void notes.submitNote()}>
        submit-note
      </button>

      <button type="button" onClick={() => notes.setActiveTab('incoming')}>
        tab-incoming
      </button>

      <button type="button" onClick={() => notes.setActiveTab('outgoing')}>
        tab-outgoing
      </button>

      <button type="button" onClick={() => notes.setActiveTab('private')}>
        tab-private
      </button>

      <button type="button" onClick={() => notes.setActiveTab('mention')}>
        tab-mention
      </button>

      <button type="button" onClick={() => notes.setComposeToUserId('BenjaminD')}>
        set-to-user
      </button>

      <button
        type="button"
        onClick={() =>
          void notes.submitReply({
            parentMessageId: 'public-note-1',
            text: 'Reply from harness',
          })
        }
      >
        submit-reply
      </button>

      <button type="button" onClick={() => notes.openApplicationFilter(77)}>
        open-application-filter
      </button>

      <button type="button" onClick={() => notes.closeApplicationFilter()}>
        close-application-filter
      </button>

      <div>active-tab:{notes.drawer?.activeTab ?? 'closed'}</div>
      <div>incoming-count:{notes.getCounts('application:42').incoming}</div>
      <div>error:{notes.error || 'none'}</div>
      <div>outgoing-count:{notes.getCounts('application:42').outgoing}</div>
      <div>private-count:{notes.getCounts('application:42').private}</div>
      <div>mention-count:{notes.getCounts('application:42').mention}</div>
      <div>to-user:{notes.composeToUserId ?? 'none'}</div>
      <div>selected-filter-app:{notes.selectedApplicationFilterId ?? 'none'}</div>
    </div>
  )
}

describe('useTaskNotesDrawerState', () => {
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
    mutateAsyncMock.mockReset()

    fetchMyMessagesMock.mockImplementation(async () => ({
      incoming: [{ MessageID: 'incoming-note-1', MessageText: 'Incoming note', ToUser: 'A.User' }],
      outgoing: [{ MessageID: 'outgoing-note-1', MessageText: 'Outgoing note' }],
      private: [{ MessageID: 'private-note-1', MessageText: 'Private note' }],
      mention: [{ MessageID: 'mention-note-1', MessageText: 'Mention note' }],
    }))

    mutateAsyncMock.mockResolvedValue({ status: 'ok' })
    markTaskNoteAsReadMock.mockResolvedValue({ status: 'ok' })
  })

  it('preloads all note tabs when the drawer opens', async () => {
    renderWithProviders(<NotesHookHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'open-drawer' }))

    await waitFor(() => {
      expect(screen.getByText('active-tab:mention')).toBeTruthy()
      expect(screen.getByText('incoming-count:1')).toBeTruthy()
      expect(screen.getByText('outgoing-count:1')).toBeTruthy()
      expect(screen.getByText('private-count:1')).toBeTruthy()
      expect(screen.getByText('mention-count:1')).toBeTruthy()
    })

    expect(fetchMyMessagesMock).toHaveBeenCalledTimes(1)
    expect(fetchMyMessagesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 42,
        token: 'test-access-token',
      }),
    )
  })

  it('validates empty notes and refreshes the public tab after a successful note submission', async () => {
    renderWithProviders(<NotesHookHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'open-drawer' }))

    await waitFor(() => {
      expect(screen.getByText('active-tab:mention')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'submit-note' }))

    await waitFor(() => {
      expect(screen.getByText('error:Note text is required')).toBeTruthy()
    })

    fireEvent.change(screen.getByLabelText('compose-text'), {
      target: { value: 'A new public note' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'submit-note' }))

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 42,
          note: 'A new public note',
          isPrivate: false,
          fromUser: 'S.Benjamin',
          token: 'test-access-token',
        }),
      )
    })

    await waitFor(() => {
      expect(fetchMyMessagesMock).toHaveBeenCalledTimes(2)
      expect(screen.getByText('error:none')).toBeTruthy()
      expect(screen.getByDisplayValue('')).toBeTruthy()
    })
  })

  it('refreshes public notes after a successful reply submission', async () => {
    renderWithProviders(<NotesHookHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'open-drawer' }))

    await waitFor(() => {
      expect(screen.getByText('active-tab:mention')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'submit-reply' }))

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 42,
          note: 'Reply from harness',
          isPrivate: false,
          parentMessageId: 'public-note-1',
          fromUser: 'S.Benjamin',
          token: 'test-access-token',
        }),
      )
    })

    await waitFor(() => {
      expect(fetchMyMessagesMock).toHaveBeenCalledTimes(2)
    })
  })

  it('posts directed notes as private notes that require a To User', async () => {
    function DirectedHarness() {
      const notes = useTaskNotesDrawerState({
        applicationId: 42,
      })

      return (
        <div>
          <button
            type="button"
            onClick={() =>
              void notes.openDrawer({
                contextKey: 'application:42',
                taskName: 'Application 42',
                tab: 'incoming',
              })
            }
          >
            open-directed
          </button>
          <button type="button" onClick={() => notes.setComposeText('Directed message')}>
            set-directed-text
          </button>
          <button type="button" onClick={() => notes.setComposeToUserId('BenjaminD')}>
            set-directed-user
          </button>
          <button type="button" onClick={() => void notes.submitNote()}>
            submit-directed
          </button>
          <div>active-tab:{notes.drawer?.activeTab ?? 'closed'}</div>
          <div>error:{notes.error || 'none'}</div>
        </div>
      )
    }

    renderWithProviders(<DirectedHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'open-directed' }))

    await waitFor(() => {
      expect(screen.getByText('active-tab:incoming')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'set-directed-text' }))
    fireEvent.click(screen.getByRole('button', { name: 'submit-directed' }))

    await waitFor(() => {
      expect(screen.getByText('error:Incoming notes require a To User')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'set-directed-user' }))
    fireEvent.click(screen.getByRole('button', { name: 'submit-directed' }))

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 42,
          note: 'Directed message',
          isPrivate: true,
          toUser: 'BenjaminD',
          fromUser: 'S.Benjamin',
          token: 'test-access-token',
        }),
      )
    })
  })

  it('posts outgoing notes as private notes that require a To User', async () => {
    function OutgoingHarness() {
      const notes = useTaskNotesDrawerState({
        applicationId: 42,
      })

      return (
        <div>
          <button
            type="button"
            onClick={() =>
              void notes.openDrawer({
                contextKey: 'application:42',
                taskName: 'Application 42',
                tab: 'outgoing',
              })
            }
          >
            open-outgoing
          </button>
          <button type="button" onClick={() => notes.setComposeText('Outgoing message')}>
            set-outgoing-text
          </button>
          <button type="button" onClick={() => notes.setComposeToUserId('BenjaminD')}>
            set-outgoing-user
          </button>
          <button type="button" onClick={() => void notes.submitNote()}>
            submit-outgoing
          </button>
          <div>active-tab:{notes.drawer?.activeTab ?? 'closed'}</div>
          <div>error:{notes.error || 'none'}</div>
        </div>
      )
    }

    renderWithProviders(<OutgoingHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'open-outgoing' }))

    await waitFor(() => {
      expect(screen.getByText('active-tab:outgoing')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'set-outgoing-text' }))
    fireEvent.click(screen.getByRole('button', { name: 'submit-outgoing' }))

    await waitFor(() => {
      expect(screen.getByText('error:Outgoing notes require a To User')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'set-outgoing-user' }))
    fireEvent.click(screen.getByRole('button', { name: 'submit-outgoing' }))

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 42,
          note: 'Outgoing message',
          isPrivate: true,
          toUser: 'BenjaminD',
          fromUser: 'S.Benjamin',
          token: 'test-access-token',
        }),
      )
    })
  })

  it('clears draft text and selected to user when switching tabs', async () => {
    renderWithProviders(<NotesHookHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'open-drawer' }))

    await waitFor(() => {
      expect(screen.getByText('active-tab:mention')).toBeTruthy()
    })

    fireEvent.change(screen.getByLabelText('compose-text'), {
      target: { value: 'Draft that should clear' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'tab-incoming' }))
    fireEvent.click(screen.getByRole('button', { name: 'set-to-user' }))

    expect((screen.getByLabelText('compose-text') as HTMLInputElement).value).toBe('')
    expect(screen.getByText('to-user:BenjaminD')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('compose-text'), {
      target: { value: 'Incoming draft that should clear' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'tab-private' }))

    await waitFor(() => {
      expect(screen.getByText('active-tab:private')).toBeTruthy()
      expect((screen.getByLabelText('compose-text') as HTMLInputElement).value).toBe('')
      expect(screen.getByText('to-user:none')).toBeTruthy()
    })

    fireEvent.change(screen.getByLabelText('compose-text'), {
      target: { value: 'Private draft that should clear' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'tab-mention' }))

    await waitFor(() => {
      expect(screen.getByText('active-tab:mention')).toBeTruthy()
      expect((screen.getByLabelText('compose-text') as HTMLInputElement).value).toBe('')
      expect(screen.getByText('to-user:none')).toBeTruthy()
    })
  })

  it('tracks the selected application id for dashboard filtering', async () => {
    renderWithProviders(<NotesHookHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'open-application-filter' }))
    expect(screen.getByText('selected-filter-app:77')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'close-application-filter' }))
    expect(screen.getByText('selected-filter-app:none')).toBeTruthy()
  })

  it('marks incoming notes as read and refreshes the lists', async () => {
    function MarkReadHarness() {
      const notes = useTaskNotesDrawerState({
        applicationId: 42,
      })

      return (
        <div>
          <button
            type="button"
            onClick={() =>
              void notes.openDrawer({
                contextKey: 'application:42',
                taskName: 'Application 42',
                tab: 'incoming',
              })
            }
          >
            open-incoming
          </button>
          <button
            type="button"
            onClick={() =>
              void notes.markIncomingNoteRead({
                MessageID: 'incoming-note-1',
                MessageText: 'Incoming note',
                isRead: 0,
              } as any)
            }
          >
            mark-read
          </button>
          <div>marking:{notes.markingReadMessageId ?? 'none'}</div>
        </div>
      )
    }

    renderWithProviders(<MarkReadHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'open-incoming' }))

    await waitFor(() => {
      expect(fetchMyMessagesMock).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole('button', { name: 'mark-read' }))

    await waitFor(() => {
      expect(markTaskNoteAsReadMock).toHaveBeenCalledWith({
        messageId: 'incoming-note-1',
        token: 'test-access-token',
      })
    })

    await waitFor(() => {
      expect(fetchMyMessagesMock).toHaveBeenCalledTimes(2)
      expect(screen.getByText('marking:none')).toBeTruthy()
    })
  })
})
