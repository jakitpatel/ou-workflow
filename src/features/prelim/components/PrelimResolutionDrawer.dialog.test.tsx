import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { PrelimResolutionDrawer } from './PrelimResolutionDrawer'
import { createDefaultCompanyData, createDefaultPlantData } from '../lib/prelimResolution'

// The Resolve Company / Resolve Plant drawer is a real modal dialog. Found on devlinux03 (AppId
// 1659): it was a plain overlay with no dialog role, no name and no Escape.
vi.mock('@/shared/api/httpClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/httpClient')>()),
  fetchWithAuth: vi.fn(),
}))
vi.mock('@/context/UserContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/context/UserContext')>()),
  useUser: () => ({ token: 'test-token', username: 'tester' }),
}))

const renderCompanyDrawer = () => {
  const onClose = vi.fn()
  renderWithProviders(
    <PrelimResolutionDrawer
      isOpen
      onClose={onClose}
      type="company"
      data={{ ...createDefaultCompanyData(), companyName: 'I.P.A. srl Industria Prodotti Agroalimentari' }}
      matches={[]}
      onAssign={vi.fn()}
      applicationId={1659}
      taskInstanceId={26724}
      isActionable
    />,
  )
  return { onClose, dialog: () => screen.getByRole('dialog', { name: 'Resolve Company' }) }
}

describe('PrelimResolutionDrawer as a dialog', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fetchWithAuth).mockResolvedValue({ data: [] })
  })

  it('is a modal dialog named Resolve Company / Resolve Plant', () => {
    const { dialog } = renderCompanyDrawer()
    expect(dialog().getAttribute('aria-modal')).toBe('true')
    expect(within(dialog()).getByRole('button', { name: 'Complete Task' })).toBeTruthy()
  })

  it('names the plant drawer Resolve Plant', () => {
    renderWithProviders(
      <PrelimResolutionDrawer isOpen onClose={vi.fn()} type="plant" data={{ ...createDefaultPlantData(), plantName: 'Plant' }} matches={[]} onAssign={vi.fn()} />,
    )
    expect(screen.getByRole('dialog', { name: 'Resolve Plant' })).toBeTruthy()
  })

  it('closes on Escape when nothing was changed', () => {
    const { onClose, dialog } = renderCompanyDrawer()
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Escape in the company search closes only the search, not the drawer', async () => {
    const { onClose, dialog } = renderCompanyDrawer()
    fireEvent.change(within(dialog()).getAllByRole('combobox')[0], { target: { value: 'search-company' } })
    const search = await screen.findByRole('dialog', { name: /search/i })
    fireEvent.keyDown(search, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /search/i })).toBeNull())
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Resolve Company' })).toBeTruthy()
  })

  it('does not close on Escape once a submitted value was edited', async () => {
    const { onClose, dialog } = renderCompanyDrawer()
    fireEvent.click(within(dialog()).getAllByRole('button', { name: 'Edit submitted values' })[0])
    const input = await waitFor(() => {
      const field = within(dialog()).getAllByRole('textbox').find((element) => (element as HTMLInputElement).value.startsWith('I.P.A.'))
      if (!field) throw new Error('company name input not shown')
      return field
    })
    fireEvent.change(input, { target: { value: 'I.P.A. S.r.l.' } })
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    // Cancel still closes it on purpose.
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
