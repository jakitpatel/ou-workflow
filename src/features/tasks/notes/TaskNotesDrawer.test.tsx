import { fireEvent, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { TaskNotesDrawer } from '@/features/tasks/notes/TaskNotesDrawer'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { TaskNote } from '@/types/application'

vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({
  useMentionUsers: () => ({
    data: [
      {
        id: 'user-1',
        fullName: 'Alice Smith',
        firstName: 'Alice',
        lastName: 'Smith',
        kashLogIn: 'asmith',
        email: 'alice@example.com',
        userRole: 'NCRC',
        userName: 'asmith',
        isActive: true,
      },
      {
        id: 'user-2',
        fullName: 'Bob User',
        firstName: 'Bob',
        lastName: 'User',
        kashLogIn: 'buser',
        email: 'bob@example.com',
        userRole: 'Reviewer',
        userName: 'buser',
        isActive: true,
      },
    ],
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

  it('shows the note task name only on root notes for application-level note drawers', () => {
    renderWithProviders(
      <TaskNotesDrawer
        open
        applicantCompany="Test Company"
        applicationId={42}
        contextType="application"
        taskName="Application 42"
        activeTab="public"
        directedNotes={[]}
        privateNotes={[]}
        publicNotes={[
          {
            MessageID: 101,
            MessageText: 'Root note',
            FromUser: 'Alice Smith',
            SentDate: '2026-04-07T10:00:00.000Z',
            TaskInstanceId: 123,
            TaskName: 'Review Ingredients',
          } as TaskNote,
          {
            MessageID: 102,
            parentMessageId: '101',
            MessageText: 'Reply note',
            FromUser: 'Bob User',
            SentDate: '2026-04-07T11:00:00.000Z',
            TaskInstanceId: 123,
            TaskName: 'Review Ingredients',
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

    expect(screen.getByText('Notes For:')).toBeTruthy()
    expect(screen.getByText('Review Ingredients')).toBeTruthy()
    expect(screen.getAllByText('Review Ingredients')).toHaveLength(1)
  })

  it('shows the note task name in private notes when the note belongs to a task', () => {
    renderWithProviders(
      <TaskNotesDrawer
        open
        applicantCompany="Test Company"
        applicationId={42}
        contextType="application"
        taskName="Application 42"
        activeTab="private"
        directedNotes={[]}
        privateNotes={[
          {
            MessageID: 201,
            MessageText: 'Private note for a task',
            FromUser: 'Alice Smith',
            SentDate: '2026-04-07T10:00:00.000Z',
            TaskInstanceId: 456,
            TaskName: 'Send NDA',
          } as TaskNote,
        ]}
        publicNotes={[]}
        loadingDirected={false}
        loadingPrivate={false}
        loadingPublic={false}
        composeText=""
        composeToUserId={null}
        composePrivate
        isSubmitting={false}
        error=""
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

    expect(screen.getByText('Notes For:')).toBeTruthy()
    expect(screen.getByText('Send NDA')).toBeTruthy()
  })

  it('does not repeat the note task name inside task note drawers', () => {
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
        publicNotes={[
          {
            MessageID: 101,
            MessageText: 'Root note',
            FromUser: 'Alice Smith',
            SentDate: '2026-04-07T10:00:00.000Z',
            TaskInstanceId: 123,
            TaskName: 'Review Ingredients',
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

    expect(screen.queryByText('Notes For:')).toBeNull()
    expect(screen.getAllByText('Review Ingredients')).toHaveLength(1)
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
        isPrivate: false,
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

  it('hides mention UI and the private lock badge in the Private Notes tab', () => {
    renderWithProviders(
      <TaskNotesDrawer
        open
        applicantCompany="Test Company"
        applicationId={42}
        contextType="task"
        taskName="Review Ingredients"
        activeTab="private"
        directedNotes={[]}
        privateNotes={[
          {
            MessageID: 201,
            MessageText: 'Only visible internally',
            FromUser: 'Alice Smith',
            SentDate: '2026-04-07T10:00:00.000Z',
          } as TaskNote,
        ]}
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

    expect(screen.queryByRole('button', { name: /mention/i })).toBeNull()
    expect(screen.queryByText('Private')).toBeNull()
    expect(screen.getByPlaceholderText('Add a private note...')).toBeTruthy()
  })

  it('hides the privacy toggle in the Public Notes tab while keeping the public composer', () => {
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
        publicNotes={[]}
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
        onReplySubmit={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText(/Public note/i)).toBeNull()
    expect(screen.getByRole('button', { name: /mention/i })).toBeTruthy()
    expect(screen.getByPlaceholderText('Add a public note... (@ to mention)')).toBeTruthy()
  })

  it('inserts public mentions into the message text instead of selecting a To User', () => {
    const onComposeToUserChange = vi.fn()

    function PublicMentionHarness() {
      const [composeText, setComposeText] = useState('Hello @al')

      return (
        <TaskNotesDrawer
          open
          applicantCompany="Test Company"
          applicationId={42}
          contextType="task"
          taskName="Review Ingredients"
          activeTab="public"
          directedNotes={[]}
          privateNotes={[]}
          publicNotes={[]}
          loadingDirected={false}
          loadingPrivate={false}
          loadingPublic={false}
          composeText={composeText}
          composeToUserId={null}
          composePrivate={false}
          isSubmitting={false}
          error=""
          onClose={() => {}}
          onTabChange={() => {}}
          onComposeTextChange={setComposeText}
          onComposeToUserChange={onComposeToUserChange}
          onComposePrivateChange={() => {}}
          onSubmit={() => {}}
          onReplySubmit={vi.fn()}
        />
      )
    }

    renderWithProviders(<PublicMentionHarness />)

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Hello @al', selectionStart: 9 },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Mention' }))
    fireEvent.click(screen.getByRole('button', { name: /alice smith/i }))

    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Hello @Alice Smith ')
    expect(onComposeToUserChange).not.toHaveBeenCalled()
    expect(screen.queryByText(/To User:/i)).toBeNull()
  })
})
