import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { Applicant, Task } from '@/types/application'
import { CertificationStageDrawer } from './CertificationStageDrawer'

// fe6a NEW-1: the inline Bichel preview must load a signed link; `/file/<id>` itself needs a token
// that an iframe cannot send (401 "Authentication required").
type Request = { path: string; method?: string; body?: unknown }
const mocks = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/shared/api/httpClient', () => ({
  fetchWithAuth: mocks.request,
  resolveApiBaseUrl: () => 'http://api.test/api',
}))
vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ token: 'token', username: 'viewer.one', email: 'viewer.one@local.test', role: 'ALL', roles: [] }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }))

const applicant = { applicationId: 4242, company: 'FIX-fe6a Foods', plant: 'FIX-fe6a Plant' } as unknown as Applicant
const task = { TaskInstanceId: 777, taskCategory: 'certificate', taskType: 'action' } as unknown as Task

beforeEach(() => {
  mocks.request.mockReset().mockImplementation((request: Request) => {
    if (request.path.startsWith('/get_application_detail_v2')) {
      return Promise.resolve({
        applicationInfo: { applicationId: 4242, globalData: JSON.stringify({ bichelfileUrl: '/file/91' }), companyContacts: [] },
      })
    }
    if (request.path.endsWith('/file_link')) return Promise.resolve({ url: '/file/91?link_exp=9999999999&link_user=viewer.one&link_sig=abc' })
    return Promise.resolve({ data: [] })
  })
})

it('frames the signed link, never the bare /file/<id> URL', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <CertificationStageDrawer open applicant={applicant} task={task} onClose={() => {}} />
    </QueryClientProvider>,
  )
  const frame = await screen.findByTitle('Bichel document')
  expect(frame.tagName).toBe('IFRAME')
  expect(frame.getAttribute('src')).toBe('http://api.test/file/91?link_exp=9999999999&link_user=viewer.one&link_sig=abc')
  const signing = mocks.request.mock.calls.map((call) => call[0] as Request).filter((request) => request.path.endsWith('/file_link'))
  expect(signing).toEqual([{ path: '/../file_link', method: 'POST', body: { path: '/file/91' } }])
})
