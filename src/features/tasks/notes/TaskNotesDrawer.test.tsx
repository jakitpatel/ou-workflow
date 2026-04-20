import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TaskNotesDrawer } from '@/features/tasks/notes/TaskNotesDrawer'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { TaskNote } from '@/types/application'

vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({
  useMentionUsers: () => ({
    data: [],
    isLoading: false,
  }),
}))

const publicNotes: TaskNote[] = [
  {
    MessageID: 100,
    MessageText: 'Parent public note',
    FromUser: 'Alice Smith',
    SentDate: '2026-04-07T10:00:00.000Z',
  } as TaskNote,
]

describe('TaskNotesDrawer', () => {
  it('opens application details when a per-note AppId is clicked', async () => {
    const onApplicationIdClick = vi.fn()

    renderWithProviders(
      <TaskNotesDrawer
        open
        applicantCompany="My Notes"
        applicationId={42}
        contextType="application"
        taskName="Current User"
        activeTab="public"
        directedNotes={[]}
        privateNotes={[]}
        publicNotes={[
          {
            MessageID: 101,
            MessageText: 'Linked note',
            FromUser: 'Alice Smith',
            SentDate: '2026-04-07T10:00:00.000Z',
            ApplicationID: 77,
          } as TaskNote,
        ]}
        loadingDirected={false}
        loadingPrivate={false}
        loadingPublic={false}
        composeText=""
        composeToUserId={null}
        composePrivate={false}
        isSubmitting={false}
        error=""
        showPerNoteApplicationId
        hideComposer
        hidePrivacyToggle
        onApplicationIdClick={onApplicationIdClick}
        onClose={() => {}}
        onTabChange={() => {}}
        onComposeTextChange={() => {}}
        onComposeToUserChange={() => {}}
        onComposePrivateChange={() => {}}
        onSubmit={() => {}}
        onReplySubmit={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /expand thread from alice smith/i }))
    fireEvent.click(screen.getByRole('button', { name: 'AppId: 77' }))

    expect(onApplicationIdClick).toHaveBeenCalledWith(77)
  })

  it('opens dashboard filtering when the My Notes ViewApp button is clicked', async () => {
    const onApplicationIdClick = vi.fn()
    const onViewApplicationClick = vi.fn()

    renderWithProviders(
      <TaskNotesDrawer
        open
        applicantCompany="My Notes"
        applicationId={42}
        contextType="application"
        taskName="Current User"
        activeTab="public"
        directedNotes={[]}
        privateNotes={[]}
        publicNotes={[
          {
            MessageID: 101,
            MessageText: 'Linked note',
            FromUser: 'Alice Smith',
            SentDate: '2026-04-07T10:00:00.000Z',
            ApplicationID: 77,
          } as TaskNote,
        ]}
        loadingDirected={false}
        loadingPrivate={false}
        loadingPublic={false}
        composeText=""
        composeToUserId={null}
        composePrivate={false}
        isSubmitting={false}
        error=""
        showPerNoteApplicationId
        showViewApplicationAction
        hideComposer
        hidePrivacyToggle
        onApplicationIdClick={onApplicationIdClick}
        onViewApplicationClick={onViewApplicationClick}
        onClose={() => {}}
        onTabChange={() => {}}
        onComposeTextChange={() => {}}
        onComposeToUserChange={() => {}}
        onComposePrivateChange={() => {}}
        onSubmit={() => {}}
        onReplySubmit={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /expand thread from alice smith/i }))
    fireEvent.click(screen.getByRole('button', { name: 'ViewApp:77' }))

    expect(onViewApplicationClick).toHaveBeenCalledWith(77)
    expect(onApplicationIdClick).not.toHaveBeenCalled()
  })

  it('shows directed/public thread indicators only in My Notes root threads', () => {
    renderWithProviders(
      <TaskNotesDrawer
        open
        applicantCompany="My Notes"
        applicationId={42}
        contextType="application"
        taskName="Current User"
        activeTab="public"
        directedNotes={[]}
        privateNotes={[]}
        publicNotes={[
          {
            MessageID: 101,
            MessageText: 'Directed thread',
            FromUser: 'Alice Smith',
            SentDate: '2026-04-07T10:00:00.000Z',
            isPrivate: true,
            ToUser: 'Bob User',
          } as TaskNote,
          {
            MessageID: 102,
            MessageText: 'Public thread',
            FromUser: 'Jane Doe',
            SentDate: '2026-04-07T11:00:00.000Z',
            isPrivate: false,
          } as TaskNote,
        ]}
        loadingDirected={false}
        loadingPrivate={false}
        loadingPublic={false}
        composeText=""
        composeToUserId={null}
        composePrivate={false}
        isSubmitting={false}
        error=""
        singleTabMode
        singleTabLabel="My Notes"
        showMyNotesThreadType
        hideComposer
        hidePrivacyToggle
        onClose={() => {}}
        onTabChange={() => {}}
        onComposeTextChange={() => {}}
        onComposeToUserChange={() => {}}
        onComposePrivateChange={() => {}}
        onSubmit={() => {}}
        onReplySubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('Directed')).toBeTruthy()
    expect(screen.getByText('Public')).toBeTruthy()
  })

  it('submits a reply from the public thread UI', async () => {
    const onReplySubmit = vi.fn().mockResolvedValue(undefined)

    renderWithProviders(
      <TaskNotesDrawer
        open
        applicantCompany="Test Company"
        applicationId={42}
        contextType="task"
        taskName="Review Ingredients"
        activeTab="public"
        directedNotes={[]}
        privateNotes={[]}
        publicNotes={publicNotes}
        loadingDirected={false}
        loadingPrivate={false}
        loadingPublic={false}
        composeText=""
        composeToUserId={null}
        composePrivate={false}
        isSubmitting={false}
        error=""
        onClose={() => {}}
        onTabChange={() => {}}
        onComposeTextChange={() => {}}
        onComposeToUserChange={() => {}}
        onComposePrivateChange={() => {}}
        onSubmit={() => {}}
        onReplySubmit={onReplySubmit}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /expand thread from alice smith/i }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Reply' })[0])

    const replyInput = await screen.findByPlaceholderText('Reply...')
    fireEvent.change(replyInput, {
      target: { value: 'Threaded reply' },
    })

    const submitReplyButton = screen
      .getAllByRole('button', { name: 'Reply' })
      .find((button) => button.className.includes('bg-blue-600'))

    expect(submitReplyButton).toBeTruthy()
    fireEvent.click(submitReplyButton!)

    await waitFor(() => {
      expect(onReplySubmit).toHaveBeenCalledWith({
        parentMessageId: '100',
        text: 'Threaded reply',
        applicationId: null,
        taskId: undefined,
        toUser: 'Alice Smith',
      })
    })
  })

  it('shows Directed Notes as the first tab and uses the ToUsers label there', () => {
    renderWithProviders(
      <TaskNotesDrawer
        open
        applicantCompany="Test Company"
        applicationId={42}
        contextType="task"
        taskName="Review Ingredients"
        activeTab="directed"
        directedNotes={[]}
        privateNotes={[]}
        publicNotes={[]}
        loadingDirected={false}
        loadingPrivate={false}
        loadingPublic={false}
        composeText=""
        composeToUserId={null}
        composePrivate
        isSubmitting={false}
        error=""
        onClose={() => {}}
        onTabChange={() => {}}
        onComposeTextChange={() => {}}
        onComposeToUserChange={() => {}}
        onComposePrivateChange={() => {}}
        onSubmit={() => {}}
        onReplySubmit={vi.fn()}
      />,
    )

    const tabs = screen.getAllByRole('button').map((button) => button.textContent ?? '')
    expect(tabs[1]).toContain('Directed Notes')
    expect(screen.getByRole('button', { name: /ToUsers/i })).toBeTruthy()
    expect(screen.queryByLabelText(/Private note/i)).toBeNull()
  })
})
