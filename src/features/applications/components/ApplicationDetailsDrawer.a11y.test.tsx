import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ApplicationDetailsDrawer } from './ApplicationDetailsDrawer'

vi.mock('./ApplicationDetailsDrawerContent', () => ({
  // Never resolves, so the Suspense fallback stays on screen.
  ApplicationDetailsDrawer: () => {
    throw new Promise(() => {})
  },
}))

it('exposes the loading drawer as a modal dialog (F16)', () => {
  render(<ApplicationDetailsDrawer open applicationId={16} onClose={vi.fn()} />)
  const dialog = screen.getByRole('dialog', { name: 'Application Details' })
  expect(dialog.getAttribute('aria-modal')).toBe('true')
  expect(screen.getByRole('status').textContent).toContain('Loading application details')
})
