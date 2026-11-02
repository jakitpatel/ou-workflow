import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TaskNotesDrawer } from '@/features/tasks/notes/TaskNotesDrawer'
import { renderWithProviders } from '@/test/renderWithProviders'

vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({
  useMentionUsers: () => ({ data: [], isLoading: false }),
}))

// Audit F7: isSubmitting only flips after a re-render, so a real double-click posted two notes.
describe('TaskNotesDrawer Post Note double-click', () => {
  it('calls onSubmit once while the first submission is still in flight', async () => {
    let finish!: () => void
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )

    renderWithProviders(
      <TaskNotesDrawer
        open
        applicantCompany="Company"
        applicationId={42}
        contextType="application"
        taskName="Application 42"
        activeTab="public"
        directedNotes={[]}
        privateNotes={[]}
        publicNotes={[]}
        loadingDirected={false}
        loadingPrivate={false}
        loadingPublic={false}
        composeText="Only once"
        composeToUserId={null}
        composePrivate={false}
        isSubmitting={false}
        error=""
        onClose={() => {}}
        onTabChange={() => {}}
        onComposeTextChange={() => {}}
        onComposeToUserChange={() => {}}
        onComposePrivateChange={() => {}}
        onSubmit={onSubmit}
        onReplySubmit={vi.fn()}
      />,
    )

    const post = screen.getByRole('button', { name: 'Post Note' })
    fireEvent.click(post)
    fireEvent.click(post)
    expect(onSubmit).toHaveBeenCalledTimes(1)

    await act(async () => finish())
    fireEvent.click(post)
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })
})
