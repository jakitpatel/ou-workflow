import type { ComponentProps } from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { Applicant } from '@/types/application'
import type { TaskNotesDrawer } from '@/features/tasks/notes/TaskNotesDrawer'
import { PrelimApplicationMessages } from './PrelimApplicationMessages'

const fetchMessages = vi.fn()
const createMessage = vi.fn()

vi.mock('@/context/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => children,
  useUser: () => ({ username: 'test-user', token: 'test-token' }),
}))
vi.mock('@/features/profile/api', () => ({ fetchProfileLayout: vi.fn(async () => []) }))
vi.mock('@/hooks/useSSE', () => ({ useSSE: vi.fn() }))
vi.mock('@/features/tasks/api', () => ({
  fetchMyMessages: (...args: unknown[]) => fetchMessages(...args),
  markTaskNoteAsRead: vi.fn(),
  updateTaskNoteTag: vi.fn(),
}))
vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({
  useCreateTaskNoteMutation: () => ({ isPending: false, mutateAsync: createMessage }),
}))
vi.mock('@/features/tasks/notes/TaskNotesDrawer', () => ({
  TaskNotesDrawer: (props: ComponentProps<typeof TaskNotesDrawer>) =>
    props.open ? (
      <div role="dialog" aria-label={props.taskName}>
        <input
          aria-label="Message"
          value={props.composeText}
          onChange={(event) => props.onComposeTextChange(event.target.value)}
        />
        <button onClick={() => props.onTabChange('private')}>Private</button>
        <button onClick={props.onSubmit}>Send</button>
        <button onClick={props.onClose}>Close</button>
      </div>
    ) : null,
}))

beforeEach(() => {
  vi.clearAllMocks()
  fetchMessages.mockResolvedValue({ incoming: [], outgoing: [], mention: [], private: [] })
  createMessage.mockResolvedValue({})
})

describe('Intake application messages', () => {
  it('loads and sends messages for each submission application ID, not its external reference', async () => {
    renderWithProviders(
      <>
        <PrelimApplicationMessages
          application={
            { applicationId: 3719, externalReferenceId: 820, company: 'First' } as Applicant
          }
        />
        <PrelimApplicationMessages
          application={
            { applicationId: 3720, externalReferenceId: 821, company: 'Second' } as Applicant
          }
        />
      </>,
    )
    expect(fetchMessages).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Notes for First' }))
    await waitFor(() =>
      expect(fetchMessages).toHaveBeenCalledWith(expect.objectContaining({ applicationId: 3719 })),
    )
    expect(screen.getByRole('dialog', { name: 'First' })).toBeTruthy()
    fireEvent.click(screen.getByText('Private'))
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Intake message' } })
    fireEvent.click(screen.getByText('Send'))
    await waitFor(() =>
      expect(createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 3719,
          note: 'Intake message',
          isPrivate: true,
        }),
      ),
    )
    fireEvent.click(screen.getByText('Close'))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Notes for Second' }))
    await waitFor(() =>
      expect(fetchMessages).toHaveBeenCalledWith(expect.objectContaining({ applicationId: 3720 })),
    )
    expect(screen.getByRole('dialog', { name: 'Second' })).toBeTruthy()
    expect((screen.getByLabelText('Message') as HTMLInputElement).value).toBe('')
  })
})
