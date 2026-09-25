import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { PrelimResolutionDrawer } from './PrelimResolutionDrawer'
import { PlantSearchDialog } from './PlantSearchDialog'
import { createDefaultPlantData } from '../lib/prelimResolution'

vi.mock('@/shared/api/httpClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/httpClient')>()),
  fetchWithAuth: vi.fn(),
}))
vi.mock('@/context/UserContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/context/UserContext')>()),
  useUser: () => ({ token: 'test-token', username: 'tester' }),
}))
const found = {
  PLANT_ID: 14063838,
  NAME: 'TTT Foods Plant',
  CITY: 'Winchester',
}

describe('plant search', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fetchWithAuth).mockResolvedValue({ data: [] })
  })

  it('searches by name only, preserves selection on cancel, and loads the selected plant details', async () => {
    vi.mocked(fetchWithAuth).mockImplementation(async ({ path }) => {
      if (path.startsWith('/get_plant_address')) return { data: [found] }
      return [
        {
          plantName: path.includes('PlantId=14063838')
            ? 'Selected Kashrus plant'
            : 'Original Kashrus plant',
        },
      ]
    })
    renderWithProviders(
      <PrelimResolutionDrawer
        isOpen
        onClose={vi.fn()}
        type="plant"
        companyId={123}
        data={{ ...createDefaultPlantData(), plantName: 'TTT' }}
        matches={[{ Id: 99, Address: '', plantName: 'Original match' }]}
        onAssign={vi.fn()}
      />,
    )
    await screen.findByText('Original Kashrus plant')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'search-plant' } })
    expect((screen.getByLabelText('Plant name') as HTMLInputElement).value).toBe('TTT')
    await screen.findByRole('button', { name: /TTT Foods Plant/ })
    const request = vi
      .mocked(fetchWithAuth)
      .mock.calls.find(([request]) => request.path.startsWith('/get_plant_address'))![0]
    const params = new URL(request.path, 'http://localhost').searchParams
    expect([...params.keys()]).toEqual(['name'])
    expect(params.get('name')).toBe('TTT')
    fireEvent.click(screen.getByRole('button', { name: 'Close plant search' }))
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('99')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'search-plant' } })
    fireEvent.click(await screen.findByRole('button', { name: /TTT Foods Plant/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await screen.findByText('Selected Kashrus plant')
    expect(fetchWithAuth).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/get_PlantDetailsFromKASH?PlantId=14063838' }),
    )
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('14063838')
  })

  it('searches without a company ID', async () => {
    renderWithProviders(<PlantSearchDialog plantName="TTT" onClose={vi.fn()} onSelect={vi.fn()} />)
    await screen.findByText(/No plants found/)
    expect(
      vi
        .mocked(fetchWithAuth)
        .mock.calls.some(([request]) => request.path.startsWith('/get_plant_address')),
    ).toBe(true)
  })

  it('disables plant search for read-only tasks', () => {
    renderWithProviders(
      <PrelimResolutionDrawer
        isOpen
        readOnly
        onClose={vi.fn()}
        type="plant"
        companyId={123}
        data={createDefaultPlantData()}
        matches={[]}
        onAssign={vi.fn()}
      />,
    )
    expect(
      (screen.getByRole('option', { name: '+ Search Plant' }) as HTMLOptionElement).disabled,
    ).toBe(true)
  })

  it('allows retrying a failed search and reports empty results', async () => {
    vi.mocked(fetchWithAuth)
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValue({ data: [] })
    renderWithProviders(
      <PlantSearchDialog plantName="TTT" onClose={vi.fn()} onSelect={vi.fn()} />,
    )
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await screen.findByText(/No plants found/)
  })
})
