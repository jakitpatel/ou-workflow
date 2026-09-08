import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ApplicationDetailsDrawer } from './ApplicationDetailsDrawer'

const mocks = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('./ApplicationDetailsDrawerContent', () => {
  mocks.load()
  return {
    ApplicationDetailsDrawer: ({
      applicationId,
      onClose,
    }: {
      applicationId?: string | number
      onClose: () => void
    }) => <button onClick={onClose}>Application {applicationId}</button>,
  }
})

it('does not load the drawer implementation while closed', () => {
  const { container } = render(<ApplicationDetailsDrawer open={false} onClose={vi.fn()} />)
  expect(container.innerHTML).toBe('')
  expect(mocks.load).not.toHaveBeenCalled()
})

it('loads the drawer on opening and preserves its close action', async () => {
  const onClose = vi.fn()
  const { rerender } = render(
    <ApplicationDetailsDrawer open={false} applicationId={123} onClose={onClose} />,
  )
  rerender(<ApplicationDetailsDrawer open applicationId={123} onClose={onClose} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Application 123' }))
  expect(onClose).toHaveBeenCalledOnce()
  rerender(<ApplicationDetailsDrawer open={false} applicationId={123} onClose={onClose} />)
  expect(screen.queryByRole('button', { name: 'Application 123' })).toBeNull()
})
