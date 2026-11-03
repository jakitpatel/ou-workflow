import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActionModal } from './ActionModal'

// The assignment modal (e.g. AssignNCRC on Application Intake) is a real modal dialog. Found on
// devlinux03: it was a plain overlay with no dialog role or name.
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({
  useUserListByRole: () => ({
    data: [{ id: 'n1', lookupKey: 'kleinc', assigneeValue: 'KLEINC', name: 'Klein, Chana Rochel', fullName: 'Chana Rochel Klein' }],
    isLoading: false,
  }),
}))
afterEach(() => { cleanup(); vi.restoreAllMocks() })

const assignNcrc = { id: '26723', name: 'AssignNCRC', taskCategory: 'ASSIGNMENT', taskType: 'ACTION', PreScript: 'api/vSelectNCRC,NCRC' }

const renderWithOpener = (executeAction = vi.fn()) => {
  HTMLElement.prototype.scrollIntoView = vi.fn()
  const close = vi.fn()
  const opener = document.createElement('button')
  opener.textContent = 'AssignNCRC'
  document.body.appendChild(opener)
  opener.focus()
  const view = render(
    <ActionModal
      showActionModal
      selectedAction={{ application: { company: 'I.P.A. srl' }, action: assignNCRCCopy() }}
      setShowActionModal={close}
      executeAction={executeAction}
    />,
  )
  return { close, opener, view }
}
const assignNCRCCopy = () => ({ ...assignNcrc })

describe('ActionModal as a dialog', () => {
  it('is a modal dialog named by the task title', () => {
    renderWithOpener()
    const dialog = screen.getByRole('dialog', { name: 'AssignNCRC' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.contains(screen.getByLabelText('Select Name:'))).toBe(true)
  })

  it('moves focus into the dialog and returns it to the opener when closed', async () => {
    const { opener, view } = renderWithOpener()
    const dialog = screen.getByRole('dialog', { name: 'AssignNCRC' })
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    view.unmount()
    await waitFor(() => expect(document.activeElement).toBe(opener))
    opener.remove()
  })

  it('closes on Escape', () => {
    const { close } = renderWithOpener()
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'AssignNCRC' }), { key: 'Escape' })
    expect(close).toHaveBeenCalledWith(null)
  })

  it('ignores Escape while the assignment is saving', async () => {
    let finish: () => void = () => {}
    const executeAction = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
    const { close } = renderWithOpener(executeAction)
    fireEvent.change(screen.getByLabelText('Select Name:'), { target: { value: 'kleinc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Saving/ })).toBeTruthy())
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'AssignNCRC' }), { key: 'Escape' })
    expect(close).not.toHaveBeenCalled()
    finish()
    await waitFor(() => expect(close).toHaveBeenCalledWith(null))
  })

  it('still closes when the backdrop is clicked', () => {
    const { close } = renderWithOpener()
    const backdrop = screen.getByRole('dialog', { name: 'AssignNCRC' }).parentElement as HTMLElement
    fireEvent.mouseDown(backdrop)
    expect(close).toHaveBeenCalledWith(null)
  })
})
