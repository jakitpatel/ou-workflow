import { useRef } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ErrorDialog, type ErrorDialogRef } from './ErrorDialog'
import { ModalSurface } from './ui/ModalSurface'
function Harness() {
  const error = useRef<ErrorDialogRef>(null)
  return <><ModalSurface onClose={() => {}} label="Resolve company">
    <button onClick={() => error.current?.open('Connection failed')}>Complete task</button>
  </ModalSurface><ErrorDialog ref={error} /></>
}
it('names the shared close X and returns focus inside the underlying modal after Escape', async () => {
  render(<Harness />)
  const trigger = screen.getByRole('button', { name: 'Complete task' })
  trigger.focus()
  fireEvent.click(trigger)
  expect(screen.getByRole('button', { name: 'Close dialog' })).toBeTruthy()
  await waitFor(() => expect(screen.getByRole('dialog', { name: 'Error' }).contains(document.activeElement)).toBe(true))
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Error' })).toBeNull())
  await waitFor(() => expect(document.activeElement).toBe(trigger))
})

it('restores the first underlying control when the action trigger was removed before the error opened', async () => {
  const { useState } = await import('react')
  function RemovedTrigger() {
    const error = useRef<ErrorDialogRef>(null)
    const [showTrigger, setShowTrigger] = useState(true)
    return <><ModalSurface onClose={() => {}} label="Resolution">
      <button>Underlying action</button>
      {showTrigger && <button onClick={() => {
        setShowTrigger(false)
        setTimeout(() => error.current?.open('Refused'), 0)
      }}>Fail action</button>}
    </ModalSurface><ErrorDialog ref={error} /></>
  }
  render(<RemovedTrigger />)
  const trigger = screen.getByRole('button', { name: 'Fail action' })
  trigger.focus()
  fireEvent.click(trigger)
  await screen.findByRole('dialog', { name: 'Error' })
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' })))
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Error' })).toBeNull())
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Underlying action' })))
})
