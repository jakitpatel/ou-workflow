import { useState } from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { TaskNote } from '@/types/application'
import { TaskNotesDrawer } from './TaskNotesDrawer'
import { getApplicationNotesTabs } from './applicationNotesTabs'
import type { NoteTab, NotesByTab } from './types'

vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({
  useMentionUsers: () => ({ data: [], isLoading: false }),
}))
vi.mock('@/features/profile/api', () => ({ fetchProfileLayout: vi.fn(async () => []) }))

const notes: NotesByTab<TaskNote> = {
  incoming: [],
  outgoing: [],
  private: [],
  mention: [],
  global: [{ MessageID: 1, MessageText: 'A global note', FromUser: 'Test.User' } as TaskNote],
}
const loading = { incoming: false, outgoing: false, private: false, mention: false, global: false }

function Harness({ applicationNotes = false }: { applicationNotes?: boolean }) {
  const [activeTab, onTabChange] = useState<NoteTab>('incoming')
  return (
    <TaskNotesDrawer
      open
      taskName="Example"
      contextType="application"
      applicationId={42}
      notesTitleOverride={applicationNotes ? 'Application Notes' : 'My Messages'}
      activeTab={activeTab}
      onTabChange={onTabChange}
      customTabs={applicationNotes ? getApplicationNotesTabs(notes, loading) : undefined}
      privateNotes={[]}
      loadingPrivate={false}
      composeText=""
      composePrivate={false}
      isSubmitting={false}
      currentUsername="Test.User"
      onClose={() => {}}
      onComposeTextChange={() => {}}
      onComposeToUserChange={() => {}}
      onComposePrivateChange={() => {}}
      onSubmit={() => {}}
      onReplySubmit={async () => {}}
    />
  )
}

describe('application-only Global tab', () => {
  it('places Global after Mention and displays its messages when selected', () => {
    renderWithProviders(<Harness applicationNotes />)
    const labels = screen.getAllByRole('button').map((button) => button.textContent)
    expect(labels.indexOf('Global1')).toBe(labels.indexOf('Mention0') + 1)
    expect(screen.queryByText('A global note')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Global/ }))
    expect(screen.getAllByText('A global note').length).toBeGreaterThan(0)
  })

  it('does not add Global to My Messages or the default drawer tabs', () => {
    renderWithProviders(<Harness />)
    expect(screen.queryByRole('button', { name: /Global/ })).toBeNull()
  })
})
