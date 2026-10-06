import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { Applicant } from '@/types/application'
import { ApplicantAssignedRc } from './ApplicantAssignedRc'

const mocks = vi.hoisted(() => ({
  user: { token: 'token', username: 'ncrc-user', role: 'NCRC', roles: [{ name: 'NCRC' }] },
  request: vi.fn(),
  refresh: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/context/UserContext', () => ({ useUser: () => mocks.user }))
vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: mocks.request }))
vi.mock('@/features/applications/cache/applicationListCache', () => ({ refreshApplicationInListCaches: mocks.refresh }))

const applicant: Applicant = {
  id: 3719, plant: 'Plant', region: '', priority: 'NORMAL', status: 'PENDING',
  daysInProcess: 0, overdue: false, daysOverdue: 0, lastUpdate: '', nextAction: '',
  documents: 0, notes: 0, stages: {},
  applicationId: 3719, company: 'Company', assignedRC: 'Different assigned RC', companyRC: 'Old RC', isNewCompany: true,
  assignedRoles: [{ NCRC: 'ncrc-user', isPrimary: true }],
}

beforeEach(() => {
  mocks.user.role = 'NCRC'
  mocks.request.mockReset().mockImplementation(({ method }) => method === 'POST'
    ? Promise.resolve({ status: 'ok' })
    : Promise.resolve({ data: [{ id: 'rc-id', attributes: { userName: 'Rabbi Gutterman', fullName: 'Gutterman, Rabbi', IsActive: true } }] }))
  mocks.refresh.mockClear()
})

function mount(application = applicant) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><ApplicantAssignedRc applicant={application} /></QueryClientProvider>)
  return client
}

it('loads the requested lookup and saves the selected username with the exact role payload', async () => {
  const client = mount()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  expect(screen.getByRole('combobox').textContent).toContain('Old RC')
  await screen.findByRole('option', { name: 'Gutterman, Rabbi' })
  expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({
    path: '/api/vSelectRC?page%5Blimit%5D=10000&page%5Boffset%5D=0&sort=fullName', token: 'token',
  }))
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Rabbi Gutterman' } })
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith({
    path: '/assignRole', method: 'POST', token: 'token',
    body: { appId: 3719, role: 'RC', assignee: 'Rabbi Gutterman', capacity: 'DESIGNATED' },
  }))
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledWith({ applicationId: 3719, queryClient: client, token: 'token' }))
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['applications', 'detail', '3719'] }))
})

it.each([
  ['an existing company', { ...applicant, isNewCompany: false }, 'NCRC'],
  ['a company with an unknown new flag', { ...applicant, isNewCompany: undefined }, 'NCRC'],
  ['a different assigned NCRC', { ...applicant, assignedRoles: [{ NCRC: 'other-user' }] }, 'NCRC'],
  ['a user with another role', applicant, 'RC'],
])('shows Company RC without editing for %s', (_label, application, role) => {
  mocks.user.role = role
  mount(application)
  expect(screen.getByText('Old RC')).toBeTruthy()
  expect(screen.queryByText('Different assigned RC')).toBeNull()
  expect(screen.queryByRole('combobox')).toBeNull()
  expect(mocks.request).not.toHaveBeenCalled()
})

it('shows Unassigned when companyRC is missing, even if assignedRC exists', () => {
  mount({ ...applicant, companyRC: undefined, isNewCompany: false })
  expect(screen.getByText('Unassigned')).toBeTruthy()
  expect(screen.queryByText('Different assigned RC')).toBeNull()
})

it('allows an assigned NCRC in the ALL role view', async () => {
  mocks.user.role = 'ALL'
  mount()
  await screen.findByRole('option', { name: 'Gutterman, Rabbi' })
  expect(screen.getByRole('combobox')).toBeTruthy()
})

it('keeps the existing assignment and reports a failed save', async () => {
  mocks.request.mockImplementation(({ method }) => method === 'POST'
    ? Promise.reject(new Error('Save failed'))
    : Promise.resolve({ data: [{ id: 'rc-id', attributes: { userName: 'Rabbi Gutterman', fullName: 'Gutterman, Rabbi' } }] }))
  mount()
  await screen.findByRole('option', { name: 'Gutterman, Rabbi' })
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Rabbi Gutterman' } })
  await screen.findByRole('alert')
  expect((screen.getByRole('combobox') as HTMLSelectElement).selectedOptions[0].textContent).toBe('Old RC')
  expect(mocks.refresh).not.toHaveBeenCalled()
})
