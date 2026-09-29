import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConditionalModal } from './ConditionalModal'

function setup(taskCategory = 'APPROVALOK') {
  const executeAction = vi.fn()
  const close = vi.fn()
  const selectedAction = {
    application: { applicationId: 421, company: 'Example Company' },
    action: {
      id: '56647',
      TaskInstanceId: 56647,
      name: 'Send GO Legacy/New',
      taskCategory,
      taskType: 'CONDITION',
      capacity: 'DESIGNATED',
    },
  }
  render(<ConditionalModal showConditionModal selectedAction={selectedAction}
    setShowConditionModal={close} executeAction={executeAction} />)
  return { executeAction, close, selectedAction }
}

describe('APPROVALOK confirmation', () => {
  it('dismisses No without completing the task', () => {
    const { executeAction, close } = setup()
    expect(screen.getByText('Are you sure you want to do this?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(close).toHaveBeenCalledWith(null)
    expect(executeAction).not.toHaveBeenCalled()
  })

  it('completes the selected task with YES and closes', async () => {
    const { executeAction, close, selectedAction } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(executeAction).toHaveBeenCalledWith('56647', selectedAction.action, 'YES', selectedAction)
    await waitFor(() => expect(close).toHaveBeenCalledWith(null))
  })

  it.each(['No', 'Yes'])('preserves APPROVAL submission for %s', async (answer) => {
    const { executeAction, close, selectedAction } = setup('APPROVAL')
    fireEvent.click(screen.getByRole('button', { name: answer }))
    expect(executeAction).toHaveBeenCalledWith('56647', selectedAction.action, answer.toLowerCase(), selectedAction)
    await waitFor(() => expect(close).toHaveBeenCalledWith(null))
  })
})
