import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTaskNotesDrawerState } from '@/features/tasks/notes/useTaskNotesDrawerState'
import { renderWithProviders } from '@/test/renderWithProviders'

const fetchTaskNotesMock = vi.fn()
const mutateAsyncMock = vi.fn()

vi.mock('@/features/tasks/api', () => ({
  fetchTaskNotes: (...args: unknown[]) => fetchTaskNotesMock(...args),
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
            tab: 'public',
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

      <div>active-tab:{notes.drawer?.activeTab ?? 'closed'}</div>
      <div>error:{notes.error || 'none'}</div>
      <div>private-count:{notes.getCounts('application:42').private}</div>
      <div>public-count:{notes.getCounts('application:42').public}</div>
      <div>to-me-count:{notes.activeNotes.toMe.length}</div>
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

    fetchTaskNotesMock.mockReset()
    mutateAsyncMock.mockReset()

    fetchTaskNotesMock.mockImplementation(async (params?: Record<string, unknown>) => {
      if (params?.isPrivate === true) {
        return [{ MessageID: 'private-note-1', MessageText: 'Private note' }]
      }

      if (params?.toUser === 'S.Benjamin') {
        return [{ MessageID: 'to-me-note-1', MessageText: 'To me note' }]
      }

      return [{ MessageID: 'public-note-1', MessageText: 'Public note' }]
    })

    mutateAsyncMock.mockResolvedValue({ status: 'ok' })
  })

  it('preloads all note tabs when the drawer opens', async () => {
    renderWithProviders(<NotesHookHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'open-drawer' }))

    await waitFor(() => {
      expect(screen.getByText('active-tab:public')).toBeTruthy()
      expect(screen.getByText('private-count:1')).toBeTruthy()
      expect(screen.getByText('public-count:1')).toBeTruthy()
      expect(screen.getByText('to-me-count:1')).toBeTruthy()
    })

    expect(fetchTaskNotesMock).toHaveBeenCalledTimes(3)
    expect(fetchTaskNotesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 42,
        isPrivate: true,
        token: 'test-access-token',
      }),
    )
    expect(fetchTaskNotesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 42,
        isPrivate: false,
        token: 'test-access-token',
      }),
    )
    expect(fetchTaskNotesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 42,
        toUser: 'S.Benjamin',
        token: 'test-access-token',
      }),
    )
  })

  it('validates empty notes and refreshes the public tab after a successful note submission', async () => {
    renderWithProviders(<NotesHookHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'open-drawer' }))

    await waitFor(() => {
      expect(screen.getByText('active-tab:public')).toBeTruthy()
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
      expect(fetchTaskNotesMock).toHaveBeenCalledTimes(4)
      expect(screen.getByText('error:none')).toBeTruthy()
      expect(screen.getByDisplayValue('')).toBeTruthy()
    })
  })

  it('refreshes public notes after a successful reply submission', async () => {
    renderWithProviders(<NotesHookHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'open-drawer' }))

    await waitFor(() => {
      expect(screen.getByText('active-tab:public')).toBeTruthy()
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
      expect(fetchTaskNotesMock).toHaveBeenCalledTimes(4)
    })
  })
})
