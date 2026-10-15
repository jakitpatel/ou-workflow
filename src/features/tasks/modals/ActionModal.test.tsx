import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { Task } from '@/types/application'
import { ActionModal } from './ActionModal'

const mocks = vi.hoisted(() => ({ lookup: vi.fn(), items: [
  { id: 'rfr1', lookupKey: 'person1', assigneeValue: 'selected.rfr', name: 'Test RFR', fullName: 'Rabbi Test Full Name', email: 'rfr@example.com' },
] }))
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({
  useUserListByRole: (...args: unknown[]) => { mocks.lookup(...args); return { data: mocks.items, isLoading: false } },
}))
afterEach(() => { cleanup(); vi.restoreAllMocks(); mocks.lookup.mockClear() })

const renderModal = (action: Record<string, unknown>, executeAction = vi.fn()) => {
  HTMLElement.prototype.scrollIntoView = vi.fn()
  const close = vi.fn()
  render(<ActionModal showActionModal selectedAction={{ application: { company: 'Company' }, action }} setShowActionModal={close} executeAction={executeAction} />)
  return { close, executeAction }
}

it('opens the RFR lookup by category and type without requiring a PreScript or task name', async () => {
  const action = { id: '123', taskCategory: 'ASSIGNRFR', taskType: 'ACTION', name: 'Recommendation' }
  const { executeAction, close } = renderModal(action)
  expect(mocks.lookup).toHaveBeenCalledWith('api/vSelectRFR', { enabled: true })
  expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true)
  const search = screen.getByLabelText('Select RFR')
  fireEvent.change(search, { target: { value: 'missing' } })
  expect(screen.getByText('No RFR matches found.')).toBeTruthy()
  fireEvent.change(search, { target: { value: 'Test' } })
  fireEvent.keyDown(search, { key: 'Enter' })
  fireEvent.keyDown(search, { key: 'Enter' })
  await waitFor(() => expect(executeAction).toHaveBeenCalledWith('selected.rfr', action, 'Rabbi Test Full Name', expect.anything()))
  await waitFor(() => expect(close).toHaveBeenCalledWith(null))
})

it('keeps a recommendation open after a failed save', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const { close } = renderModal({ id: '123', TaskCategory: 'ASSIGNRFR', TaskType: 'ACTION' }, vi.fn().mockRejectedValue(new Error('Failed')))
  fireEvent.click(screen.getByText('Rabbi Test Full Name'))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(false))
  expect(close).not.toHaveBeenCalled()
})

it('preserves the PreScript lookup for existing assignments', () => {
  renderModal({ id: '123', taskCategory: 'ASSIGNMENT', taskType: 'ACTION', PreScript: 'api/vSelectNCRC,NCRC' } as Partial<Task>)
  expect(mocks.lookup).toHaveBeenCalledWith('api/vSelectNCRC', { enabled: true })
  expect(screen.getByLabelText('Select Name:')).toBeTruthy()
})
