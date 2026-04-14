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
        activeTab="toMe"
        privateNotes={[]}
        publicNotes={[]}
        toMeNotes={[
          {
            MessageID: 101,
            MessageText: 'Linked note',
            FromUser: 'Alice Smith',
            SentDate: '2026-04-07T10:00:00.000Z',
            ApplicationID: 77,
          } as TaskNote,
        ]}
        loadingPrivate={false}
        loadingPublic={false}
        loadingToMe={false}
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
        privateNotes={[]}
        publicNotes={publicNotes}
        toMeNotes={[]}
        loadingPrivate={false}
        loadingPublic={false}
        loadingToMe={false}
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
      })
    })
  })
})
