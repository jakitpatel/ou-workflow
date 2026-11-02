import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApplicationDetailsDrawer } from './ApplicationDetailsDrawerContent'

vi.mock('@/features/applications/hooks/useApplicationDetail', () => ({
  useApplicationDetail: () => ({ data: undefined, isLoading: true, error: null }),
}))
vi.mock('@/features/applications/components/ApplicationDetailsContent', () => ({
  ApplicationDetailsContent: () => null,
}))

describe('ApplicationDetailsDrawer accessibility (F16)', () => {
  it('is exposed as a modal dialog labelled by its title', () => {
    render(<ApplicationDetailsDrawer open applicationId={16} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Application Details' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })
})
