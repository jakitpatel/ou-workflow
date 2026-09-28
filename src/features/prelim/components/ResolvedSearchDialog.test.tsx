import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { PrelimResolutionDrawer } from './PrelimResolutionDrawer'
import { createDefaultCompanyData, createDefaultPlantData } from '../lib/prelimResolution'

vi.mock('@/shared/api/httpClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/httpClient')>()),
  fetchWithAuth: vi.fn(),
}))
vi.mock('@/context/UserContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/context/UserContext')>()),
  useUser: () => ({ token: 'test-token', username: 'tester' }),
}))

beforeEach(() => vi.resetAllMocks())

it.each(['company', 'plant'] as const)('allows searching other %s records on completed tasks without allowing selection', async (type) => {
  vi.mocked(fetchWithAuth).mockImplementation(async ({ path }) => {
    if (/get_company_address|get_plant_address/.test(path)) {
      return { data: [{ COMPANY_ID: 456, PLANT_ID: 456, NAME: 'Other record', STREET1: 'Other address' }] }
    }
    const name = /(?:companyID|PlantId)=99/.test(path) ? 'Suggested details' : 'Resolved record'
    return [{ companyName: name, plantName: name }]
  })
  const onAssign = vi.fn()
  renderWithProviders(
    <PrelimResolutionDrawer
      isOpen
      readOnly
      taskStatus="COMPLETED"
      isActionable={false}
      onClose={vi.fn()}
      type={type}
      data={type === 'company' ? createDefaultCompanyData() : createDefaultPlantData()}
      matches={[{ Id: 99, Address: '', companyName: 'Suggestion', plantName: 'Suggestion' }]}
      selectedId={123}
      onAssign={onAssign}
    />,
  )
  await screen.findByText('Resolved record')
  const selector = screen.getByRole('combobox') as HTMLSelectElement
  expect(selector.value).toBe('123')
  expect((screen.getByRole('button', { name: /Complete Task/ }) as HTMLButtonElement).disabled).toBe(true)
  const label = type === 'company' ? 'Company' : 'Plant'
  expect((screen.getByRole('option', { name: `+ Search ${label}` }) as HTMLOptionElement).disabled).toBe(false)
  fireEvent.change(selector, { target: { value: `search-${type}` } })
  const dialog = screen.getByRole('dialog', { name: `Search ${label}` })
  expect(within(dialog).getByText('Database (Kashrus)')).toBeTruthy()
  expect(within(dialog).getByText(/Resolved record.*#123/)).toBeTruthy()
  expect(within(dialog).queryByText(/Suggestion/)).toBeNull()
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Other' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Search' }))
  const result = await within(dialog).findByRole('button', { name: /Other record/ })
  expect((result as HTMLButtonElement).disabled).toBe(true)
  expect(within(dialog).getByText('Other address')).toBeTruthy()
  fireEvent.click(result)
  expect(screen.getByRole('dialog')).toBe(dialog)
  expect(within(dialog).getByText(/Resolved record.*#123/)).toBeTruthy()
  fireEvent.click(within(dialog).getByRole('button', { name: `Close ${type} search` }))
  expect((within(selector).getByRole('option', { name: /Match 1:/ }) as HTMLOptionElement).disabled).toBe(false)
  expect((within(selector).getByRole('option', { name: `+ Add a ${label} ID to the intake` }) as HTMLOptionElement).disabled).toBe(true)
  expect((within(selector).getByRole('option', { name: `+ No Match - Create New ${label}` }) as HTMLOptionElement).disabled).toBe(true)
  fireEvent.change(selector, { target: { value: '99' } })
  await screen.findByText('Suggested details')
  expect(selector.value).toBe('99')
  fireEvent.change(selector, { target: { value: `search-${type}` } })
  expect(within(screen.getByRole('dialog')).getByText(/Resolved:.*#123/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: `Close ${type} search` }))
  fireEvent.change(selector, { target: { value: `manual-${type}-id` } })
  expect(screen.queryByLabelText(`Kashrus ${label} ID`)).toBeNull()
  expect(selector.value).toBe('99')
  fireEvent.change(selector, { target: { value: 'create-new' } })
  expect(selector.value).toBe('99')
  expect((screen.getByRole('button', { name: /Complete Task/ }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(selector, { target: { value: '123' } })
  await screen.findByText('Resolved record')
  expect(selector.value).toBe('123')
  expect(onAssign).not.toHaveBeenCalled()
  expect(fetchWithAuth).toHaveBeenCalledWith(expect.objectContaining({
    path: type === 'company'
      ? '/get_CompanyDetailsFromKASH?companyID=123'
      : '/get_PlantDetailsFromKASH?PlantId=123',
  }))
  expect(vi.mocked(fetchWithAuth).mock.calls.some(([request]) =>
    /(?:companyID|PlantId)=456/.test(request.path) || (request.method != null && request.method !== 'GET'),
  )).toBe(false)
})
