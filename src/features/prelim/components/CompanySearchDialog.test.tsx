import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { PrelimResolutionDrawer } from './PrelimResolutionDrawer'
import { CompanySearchDialog } from './CompanySearchDialog'
import { createDefaultCompanyData, createDefaultPlantData } from '../lib/prelimResolution'

vi.mock('@/shared/api/httpClient', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/shared/api/httpClient')>(),
  fetchWithAuth: vi.fn(),
}))
vi.mock('@/context/UserContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/context/UserContext')>()),
  useUser: () => ({ token: 'test-token', username: 'tester' }),
}))

const found = {
  id: 'contact-row-7',
  type: 'v_CompanyContactsAndAddresses',
  attributes: {
    companyID: '1443584',
    Company: 'Naturally Homegrown Foods Distribution',
    City: 'Vancouver',
    Street1: '120 Market Road',
    Email: 'sam@example.com',
    Status: 'Pending',
  },
}

describe('company search in the resolution drawer', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('searches the submitted name, selects by companyID, loads Kashrus details, and can switch back to a suggested match', async () => {
    vi.mocked(fetchWithAuth).mockImplementation(async ({ path }) => {
      if (path.startsWith('/api/CompanyContactsAndAddresses')) return { data: [found] }
      if (path.includes('companyID=1443584'))
        return [
          {
            companyName: 'Selected Kashrus company',
            companytdetails: [{ NAME: 'Selected Kashrus company' }],
          },
        ]
      return [{ companyName: 'Original Kashrus company' }]
    })
    const onAssign = vi.fn()
    renderWithProviders(
      <PrelimResolutionDrawer
        isOpen
        onClose={vi.fn()}
        type="company"
        data={{ ...createDefaultCompanyData(), companyName: 'Naturally Homegrown Foods Ltd.' }}
        matches={[{ Id: 1356853, companyName: 'Suggested company', Address: '' }]}
        onAssign={onAssign}
      />,
    )
    await screen.findByText('Original Kashrus company')
    expect(
      vi
        .mocked(fetchWithAuth)
        .mock.calls.some(([request]) =>
          request.path.startsWith('/api/CompanyContactsAndAddresses'),
        ),
    ).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Search Company' }))
    const dialog = screen.getByRole('dialog', { name: 'Search Company' })
    expect((within(dialog).getByLabelText('Company name') as HTMLInputElement).value).toBe(
      'Naturally Homegrown Foods Ltd.',
    )
    fireEvent.click(
      await within(dialog).findByRole('button', { name: /Naturally Homegrown Foods Distribution/ }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await screen.findByText('Selected Kashrus company')
    expect(fetchWithAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/get_CompanyDetailsFromKASH?companyID=1443584',
        token: 'test-token',
      }),
    )
    const searchRequest = vi
      .mocked(fetchWithAuth)
      .mock.calls.find(([request]) =>
        request.path.startsWith('/api/CompanyContactsAndAddresses'),
      )![0]
    expect(
      new URL(searchRequest.path, 'http://localhost').searchParams.get('filter[Company]'),
    ).toBe('Naturally Homegrown Foods Ltd.')
    expect(
      (screen.getByRole('combobox', { name: 'Matching list' }) as HTMLSelectElement).value,
    ).toBe('1443584')
    expect(screen.getByRole('option', { name: /Selected: Naturally Homegrown/ })).toBeTruthy()
    expect(onAssign).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1356853' } })
    await screen.findByText('Original Kashrus company')
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('1356853')
  })

  it('supports refining the name and displays empty results', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({ data: [] })
    renderWithProviders(
      <CompanySearchDialog companyName="Missing company" onClose={vi.fn()} onSelect={vi.fn()} />,
    )
    await screen.findByText(/No companies found/)
    fireEvent.change(screen.getByLabelText('Company name'), { target: { value: 'Foods & Co' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() =>
      expect(fetchWithAuth).toHaveBeenLastCalledWith(
        expect.objectContaining({
          path: '/api/CompanyContactsAndAddresses?filter%5BCompany%5D=Foods+%26+Co&page%5Blimit%5D=25&page%5Boffset%5D=0',
        }),
      ),
    )
  })

  it('shows a recoverable error and retries', async () => {
    vi.mocked(fetchWithAuth)
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValue({ data: [found] })
    renderWithProviders(
      <CompanySearchDialog companyName="Foods" onClose={vi.fn()} onSelect={vi.fn()} />,
    )
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await screen.findByRole('button', { name: /Naturally Homegrown Foods Distribution/ })
  })

  it('does not allow search on a read-only company task or offer it for plants', () => {
    vi.mocked(fetchWithAuth).mockResolvedValue([])
    const { unmount } = renderWithProviders(
      <PrelimResolutionDrawer
        isOpen
        readOnly
        onClose={vi.fn()}
        type="company"
        data={createDefaultCompanyData()}
        matches={[]}
        onAssign={vi.fn()}
      />,
    )
    expect(
      (screen.getByRole('button', { name: 'Search Company' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    unmount()
    renderWithProviders(
      <PrelimResolutionDrawer
        isOpen
        onClose={vi.fn()}
        type="plant"
        data={createDefaultPlantData()}
        matches={[]}
        onAssign={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Search Company' })).toBeNull()
  })
})
