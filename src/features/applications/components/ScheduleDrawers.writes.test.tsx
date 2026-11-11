import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScheduleAIngredientsDrawer } from './ScheduleAIngredientsDrawer'
import { ScheduleBProductsDrawer } from './ScheduleBProductsDrawer'

// fe4a N4/N10/N14: the real Schedule A/B drawers and hooks, with only the HTTP layer faked.
type Request = { path: string; method?: string; body?: unknown }
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  statusDetails: '{}' as unknown,
  patch: undefined as undefined | ((request: Request) => Promise<unknown>),
  complete: undefined as undefined | ((request: Request) => Promise<unknown>),
}))
vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: mocks.request }))
vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ token: 'token', username: 'local.admin', email: 'local.admin@local.test', role: 'ALL', roles: [] }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }))
vi.mock('@/features/applications/components/ApplicationDetailsDrawer', () => ({ ApplicationDetailsDrawer: () => null }))
vi.mock('@/features/applications/cache/applicationListCache', () => ({
  refreshApplicationInListCaches: vi.fn().mockResolvedValue(true),
}))

const requestsTo = (path: string, method?: string) =>
  mocks.request.mock.calls.filter((call) => {
    const request = call[0] as Request
    return request.path.startsWith(path) && (!method || request.method === method)
  })

beforeEach(() => {
  mocks.statusDetails = '{}'
  mocks.patch = undefined
  mocks.complete = undefined
  mocks.request.mockReset().mockImplementation((request: Request) => {
    if (request.path === '/complete_task') {
      return mocks.complete ? mocks.complete(request) : Promise.resolve({ status: 'success' })
    }
    if (request.path.startsWith('/api/TaskInstance/') && request.method === 'PATCH') {
      return mocks.patch ? mocks.patch(request) : Promise.resolve({ data: {} })
    }
    if (request.path.startsWith('/api/TaskInstance/')) {
      return Promise.resolve({ data: { id: '500', attributes: { StatusDetails: mocks.statusDetails } } })
    }
    // One row each, so a review mark can be set (w6b: saves follow an edit, never the open).
    if (request.path.startsWith('/get_ingredients')) {
      return Promise.resolve({
        ingredients: {
          schedule_ingredients: [{ ApplicationID: 329, IngredientId: 1, ingredientLabelName: 'FIX-fe4a salt' }],
          ou_kash_ingredients: [],
        },
      })
    }
    if (request.path.startsWith('/get_products')) {
      return Promise.resolve({
        products: { schedule_products: [{ ApplicationID: 329, ScheduleProductId: 1, productName: 'FIX-fe4a soup' }], ou_kash_products: [] },
      })
    }
    return Promise.resolve({ data: [] })
  })
})

afterEach(() => {
  vi.useRealTimers()
})

const mount = (ui: ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const scheduleA = (taskCategory: string) => (
  <ScheduleAIngredientsDrawer
    open
    applicationId={329}
    applicationName="FIX-fe4a Foods"
    taskInstanceId={9877}
    taskName="Start Ingredients Processing"
    taskCategory={taskCategory}
    scheduleATaskInstanceId={500}
    onClose={vi.fn()}
  />
)
const scheduleB = (taskCategory: string) => (
  <ScheduleBProductsDrawer
    open
    applicationId={329}
    applicationName="FIX-fe4a Foods"
    taskInstanceId={9883}
    taskName="Start Products Processing"
    taskCategory={taskCategory}
    scheduleBTaskInstanceId={500}
    onClose={vi.fn()}
  />
)

describe('stage buttons send one complete_task per triple click (N4)', () => {
  it.each([
    ['Schedule A Start Processing', () => scheduleA('scheduleastart'), 'Start Processing'],
    ['Schedule A Sign Off', () => scheduleA('approvalsignoffa'), 'Sign Off'],
    ['Schedule B Start Processing', () => scheduleB('schedulebstart'), 'Start Processing'],
    ['Schedule B Sign Off', () => scheduleB('approvalsignoffb'), 'Sign Off'],
  ])('%s', async (_label, ui, buttonName) => {
    let finish!: (value: unknown) => void
    mocks.complete = () => new Promise((resolve) => { finish = resolve })
    mount(ui())
    const button = await screen.findByRole('button', { name: buttonName })
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(requestsTo('/complete_task')).toHaveLength(1))
    await act(async () => {
      finish({ status: 'success' })
    })
    expect(requestsTo('/complete_task')).toHaveLength(1)
  })
})

describe('auto-save after a persistent failure (N10)', () => {
  // Schedule A and B flags are saved on the ingredient / product in the database, so the
  // task-state edit used here is "ready".
  it.each([
    ['Schedule A', () => scheduleA('schedulea'), 'Mark Schedule A Ready'],
    ['Schedule B', () => scheduleB('scheduleb'), 'Mark Schedule B Ready'],
  ])('%s stops after the failed save and offers a manual retry', async (_label, ui, editButton) => {
    mocks.patch = () => Promise.reject(Object.assign(new Error('Injected FIX-fe4a 500'), { status: 500 }))
    mount(ui())
    // Opening saves nothing (w6b); the first save follows the user's edit.
    const [edit] = await screen.findAllByRole('button', { name: editButton })
    fireEvent.click(edit)
    const retry = await screen.findByRole('button', { name: 'Retry save' }, { timeout: 4000 })
    expect(requestsTo('/api/TaskInstance/500', 'PATCH')).toHaveLength(1)
    // Before the fix the effect re-ran on every render of the mutation result: ~8 PATCHes in 5.5 s.
    await new Promise((resolve) => setTimeout(resolve, 3000))
    expect(requestsTo('/api/TaskInstance/500', 'PATCH')).toHaveLength(1)
    expect(screen.getByText('Your latest review marks are not saved.')).toBeTruthy()

    mocks.patch = () => Promise.resolve({ data: {} })
    fireEvent.click(retry)
    await waitFor(() => expect(requestsTo('/api/TaskInstance/500', 'PATCH')).toHaveLength(2))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Retry save' })).toBeNull())
  }, 15000)
})

describe('unreadable saved state (N14)', () => {
  it.each([
    ['Schedule A', () => scheduleA('schedulea')],
    ['Schedule B', () => scheduleB('scheduleb')],
  ])('%s shows a persistent read-only banner and never saves', async (_label, ui) => {
    mocks.statusDetails = "{'savedState': {'flags': {'x': " // truncated repr: unreadable
    mount(ui())
    const banner = await screen.findByText('Saving is turned off. Review marks are read-only.')
    expect(banner.closest('[role="alert"]')).not.toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 5000))
    expect(screen.getByText('Saving is turned off. Review marks are read-only.')).toBeTruthy()
    expect(requestsTo('/api/TaskInstance/500', 'PATCH')).toHaveLength(0)
  }, 15000)
})

describe('Schedule B add row', () => {
  it('shows Label # as read-only while the other fields stay editable', async () => {
    mount(scheduleB('scheduleb'))
    fireEvent.click(await screen.findByRole('button', { name: /Add Row/ }))

    const labelNo = screen.getByRole('textbox', { name: 'Label #' }) as HTMLInputElement
    expect(labelNo.readOnly).toBe(true)
    fireEvent.change(labelNo, { target: { value: 'typed' } })
    expect(labelNo.value).toBe('')

    const labelName = screen.getByPlaceholderText('Label Name *') as HTMLInputElement
    expect(labelName.readOnly).toBe(false)
    fireEvent.change(labelName, { target: { value: 'FIX soup' } })
    expect(labelName.value).toBe('FIX soup')
  })
})

describe('Schedule B Kashrus tab', () => {
  it('lists the Kashrus columns without ProducedIn1Status', async () => {
    const defaultRequest = mocks.request.getMockImplementation()!
    mocks.request.mockImplementation((request: Request) =>
      request.path.startsWith('/get_products')
        ? Promise.resolve({
            products: {
              schedule_products: [],
              ou_kash_products: [{
                ProductName: 'FIX kash soup', CompanyName: 'FIX Co', BrandName: 'FIX Brand', SYMBOL: 'OU',
                LabelType: 'In-house', UKID: 'UKD-1', STATUS: 'Certified', ProductID: 77, ProducedIn1Status: 'FIX-produced-status',
              }],
            },
          })
        : defaultRequest(request),
    )
    mount(scheduleB('scheduleb'))
    fireEvent.click(await screen.findByRole('button', { name: /Kashrus$/ }))

    expect(await screen.findByText('FIX kash soup')).toBeTruthy()
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent?.trim() ?? '')
    for (const label of ['Product Name', 'Brand', 'Company Name', 'Type', 'Symbol', 'Product ID', 'Status']) {
      expect(headers.some((text) => text.startsWith(label)), label).toBe(true)
    }
    expect(headers.some((text) => /ProducedIn1Status/i.test(text))).toBe(false)
    expect(screen.queryByText('FIX-produced-status')).toBeNull()
  })
})
