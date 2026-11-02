import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import DashboardAppDialog from './DashboardAppDialog'

// fe7: the create/delete application routes are GETs that change data. An empty 200 used to show a
// success toast and close the dialog; now the error shows in the dialog and it stays open.
const mocks = vi.hoisted(() => ({ toastError: vi.fn(), toastSuccess: vi.fn(), navigate: vi.fn() }))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token', role: 'MIS', roles: [] }) }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('@/auth/authService', () => ({
  getAccessToken: vi.fn(() => 'token'), refreshAccessToken: vi.fn(), cognitoLogout: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))

const NOT_CONFIRMED = 'The server did not confirm the change. Nothing was saved.'
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset()
  fetchMock = vi.fn(async () => new Response('', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

it.each([
  ['create', 'Create App', '/createApplication?ownsId=1916'],
  ['delete', 'Delete App', '/deleteApplication?applicationID=1916'],
  ['create-intake', 'Create Intake', '/createSubmissionApplication?application_id=1916'],
] as const)('%s: an empty 200 keeps the dialog open with the error', async (mode, _button, path) => {
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <DashboardAppDialog mode={mode} isOpen onClose={onClose} />
    </QueryClientProvider>,
  )
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '1916' } })
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
  await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(NOT_CONFIRMED))
  expect(String(fetchMock.mock.calls[0][0])).toContain(path)
  expect(screen.getByRole('alert').textContent).toContain(NOT_CONFIRMED)
  expect(onClose).not.toHaveBeenCalled()
  expect(mocks.toastSuccess).not.toHaveBeenCalled()
  expect(mocks.navigate).not.toHaveBeenCalled()
})

it('a confirmed create still closes and opens the new application', async () => {
  fetchMock.mockImplementation(async () => new Response(
    JSON.stringify({ status: 'WORKFLOW application created successfully started', application_id: 2200 }),
  ))
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <DashboardAppDialog mode="create" isOpen onClose={onClose} />
    </QueryClientProvider>,
  )
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '1916' } })
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
  await waitFor(() => expect(onClose).toHaveBeenCalled())
  expect(mocks.toastSuccess).toHaveBeenCalledWith('WORKFLOW application created successfully started')
  expect(mocks.navigate).toHaveBeenCalledWith(expect.objectContaining({
    search: expect.objectContaining({ applicationId: 2200 }),
  }))
})
