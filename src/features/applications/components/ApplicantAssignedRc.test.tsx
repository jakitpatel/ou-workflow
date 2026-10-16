import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import type { Applicant } from '@/types/application'

import { ApplicantAssignedRc } from './ApplicantAssignedRc'

const mocks = vi.hoisted(() => ({
  user: { token: 'token', username: 'ncrc-user', email: 'ncrc@example.com', role: 'NCRC', roles: [{ name: 'NCRC' }], delegated: [] as { name: string }[] },
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
  mocks.user.delegated = []
  mocks.request.mockReset().mockImplementation(({ method }) => method === 'POST'
    ? Promise.resolve({ status: 'ok' })
    : Promise.resolve({ data: [{ id: 'rc-id', attributes: { userName: 'Rabbi Gutterman', fullName: 'Gutterman, Rabbi', Email: 'rc@example.com', IsActive: true } }] }))
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
  expect(mocks.request.mock.calls.some(([request]) => request.method === 'POST')).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith({
    path: '/assignRole', method: 'POST', token: 'token',
    body: { appId: 3719, role: 'RC', assignee: 'Rabbi Gutterman', capacity: 'DESIGNATED' },
  }))
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledWith({ applicationId: 3719, queryClient: client, token: 'token' }))
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['applications', 'detail', '3719'] }))
  const message = mocks.request.mock.calls.find(([request]) => request.path === '/api/WFApplicationMessage')?.[0]
  expect(message).toEqual({
    path: '/api/WFApplicationMessage', method: 'POST', token: 'token',
    body: { data: { type: 'WFApplicationMessage', attributes: expect.objectContaining({
      ApplicationID: 3719, FromUser: 'ncrc@example.com', ToUser: 'rc@example.com',
      Subject: 'OU Kosher - Selected As RC', MessageType: 'Email',
      TaskInstanceId: null, SentDate: expect.any(String),
    }) } },
  })
  const attributes = message.body.data.attributes
  expect(attributes.MessageTextPlain).toContain('You are selected as RC. Application Link : ')
  const url = new URL(attributes.MessageTextPlain.split('Application Link : ')[1])
  expect(url.origin).toBe(window.location.origin)
  expect(url.pathname).toMatch(/\/ou-workflow\/ncrc-dashboard\/3719$/)
  expect(attributes.PlainText).toBe(attributes.MessageTextPlain)
  expect(attributes.Text).toBe(attributes.MessageTextPlain)
  expect(attributes.MessageText).toContain('You are selected as RC.')
  expect(attributes.MessageText).toContain(url.toString())
  expect(attributes.MessageText).not.toContain('Invoice')
})

it('waits for assignment success before sending the email', async () => {
  const initial = mocks.request.getMockImplementation()!
  let finish!: (value: unknown) => void
  mocks.request.mockImplementation((request) => request.path === '/assignRole'
    ? new Promise((resolve) => { finish = resolve }) : initial(request))
  mount()
  await screen.findByRole('option', { name: 'Gutterman, Rabbi' })
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Rabbi Gutterman' } })
  fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
  await waitFor(() => expect(finish).toBeTypeOf('function'))
  expect(mocks.request.mock.calls.some(([request]) => request.path === '/api/WFApplicationMessage')).toBe(false)
  finish({ success: true })
  await waitFor(() => expect(mocks.request.mock.calls.some(([request]) => request.path === '/api/WFApplicationMessage')).toBe(true))
})

it('reports email failure separately and refreshes the successful assignment', async () => {
  const initial = mocks.request.getMockImplementation()!
  mocks.request.mockImplementation((request) => request.path === '/api/WFApplicationMessage'
    ? Promise.reject(new Error('Email unavailable')) : initial(request))
  mount()
  await screen.findByRole('option', { name: 'Gutterman, Rabbi' })
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Rabbi Gutterman' } })
  fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
  expect((await screen.findByRole('alert')).textContent).toBe('RC assigned, but the notification failed: Email unavailable')
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce())
})

it.each(['No', 'Escape'])('keeps the old RC without a backend assignment when dismissed with %s', async (action) => {
  mount()
  await screen.findByRole('option', { name: 'Gutterman, Rabbi' })
  const select = screen.getByRole('combobox') as HTMLSelectElement
  fireEvent.change(select, { target: { value: 'Rabbi Gutterman' } })
  expect(screen.getByRole('dialog').textContent).toContain('Are you sure you want to assign RC')
  expect(select.selectedOptions[0].textContent).toBe('Old RC')
  if (action === 'No') fireEvent.click(screen.getByRole('button', { name: 'No' }))
  else fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(select.selectedOptions[0].textContent).toBe('Old RC')
  expect(mocks.request.mock.calls.some(([request]) => request.method === 'POST')).toBe(false)
  expect(mocks.refresh).not.toHaveBeenCalled()
  expect(mocks.request.mock.calls.some(([request]) => request.path === '/api/WFApplicationMessage')).toBe(false)
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
  fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
  await screen.findByRole('alert')
  expect((screen.getByRole('combobox') as HTMLSelectElement).selectedOptions[0].textContent).toBe('Old RC')
  expect(mocks.refresh).not.toHaveBeenCalled()
})

it.each(['NCRC', 'ALL'])('allows an assistant to the assigned NCRC in the %s role view to save RC', async (role) => {
  mocks.user.role = role
  mocks.user.delegated = [{ name: 'alice' }]
  mount({ ...applicant, assignedRoles: [{ NCRC: ' Alice ', isPrimary: false }] })
  await screen.findByRole('option', { name: 'Gutterman, Rabbi' })
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Rabbi Gutterman' } })
  fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.objectContaining({
    method: 'POST',
    body: { appId: 3719, role: 'RC', assignee: 'Rabbi Gutterman', capacity: 'DESIGNATED' },
  })))
})

it.each([
  ['an unrelated delegated user', { ...applicant, assignedRoles: [{ NCRC: 'bob' }] }, 'NCRC'],
  ['an assistant with another selected role', { ...applicant, assignedRoles: [{ NCRC: 'alice' }] }, 'RC'],
  ['an existing company', { ...applicant, assignedRoles: [{ NCRC: 'alice' }], isNewCompany: false }, 'NCRC'],
  ...['complete', 'done', 'completed', 'withdrawn'].flatMap((status) => [
    [`an assigned NCRC on a ${status} application`, { ...applicant, status }, 'NCRC'],
    [`an assistant on a ${status} application`, { ...applicant, status, assignedRoles: [{ NCRC: 'alice' }] }, 'NCRC'],
  ]),
] as [string, Applicant, string][])('does not allow RC editing for %s', (_label, application, role) => {
  mocks.user.role = role
  mocks.user.delegated = [{ name: 'alice' }]
  mount(application)
  expect(screen.queryByRole('combobox')).toBeNull()
  expect(mocks.request).not.toHaveBeenCalled()
})
