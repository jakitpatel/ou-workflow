import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useScheduleIngredientActions } from '../hooks/useScheduleIngredientActions'
import { mapApplicationProductRow } from '../hooks/useScheduleBProducts'
import { useScheduleProductActions } from '../hooks/useScheduleProductActions'
import { ScheduleIngredientDeleteConfirm } from './ScheduleIngredientDeleteConfirm'
import { ScheduleProductActionButtons } from './ScheduleProductActionButtons'

// fe4a N3: a triple click on Delete sent three PATCH {isDeleted:true} requests.
const mocks = vi.hoisted(() => ({ deleteIngredient: vi.fn(), deleteProduct: vi.fn() }))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'token' }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('../api/scheduleIngredientMutations', () => ({
  deleteScheduleIngredient: mocks.deleteIngredient,
  patchScheduleIngredient: vi.fn(),
}))
vi.mock('../api/scheduleProductMutations', () => ({
  deleteScheduleProduct: mocks.deleteProduct,
  patchScheduleProduct: vi.fn(),
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

beforeEach(() => {
  mocks.deleteIngredient.mockReset()
  mocks.deleteProduct.mockReset()
})

describe('delete confirmation', () => {
  it('calls onConfirm once for a triple click on Delete', () => {
    const onConfirm = vi.fn()
    render(<ScheduleIngredientDeleteConfirm ingredientName="Sugar" onConfirm={onConfirm} onCancel={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Delete' })
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('names Schedule B products', () => {
    render(
      <ScheduleIngredientDeleteConfirm
        ingredientName="Cola"
        itemLabel="product"
        scheduleName="Schedule B"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('alertdialog').textContent).toContain('Cola will be removed from Schedule B.')
  })
})

type RemoveActions = { remove: (id: string, options?: { onSettled?: () => void }) => void }
describe.each<[string, () => RemoveActions, () => typeof mocks.deleteIngredient]>([
  ['ingredient', () => useScheduleIngredientActions('329'), () => mocks.deleteIngredient],
  ['product', () => useScheduleProductActions('329'), () => mocks.deleteProduct],
])('Schedule %s actions', (_label, useActions, deleteMock) => {
  it('sends one delete for three remove() calls while the first is in flight', async () => {
    let finish!: (value: unknown) => void
    deleteMock().mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const onSettled = vi.fn()
    const { result } = renderHook(useActions, { wrapper })

    await act(async () => {
      result.current.remove('37', { onSettled })
      result.current.remove('37', { onSettled })
      result.current.remove('37', { onSettled })
    })
    expect(deleteMock()).toHaveBeenCalledOnce()
    await act(async () => {
      finish({})
    })
    expect(onSettled).toHaveBeenCalledOnce()

    // A later, separate delete still works.
    deleteMock().mockResolvedValue({})
    await act(async () => {
      result.current.remove('38')
    })
    expect(deleteMock()).toHaveBeenCalledTimes(2)
  })
})

it('asks for confirmation before deleting a Schedule B product', () => {
  const remove = vi.fn()
  const onDelete = vi.fn()
  const actions = { editingId: null, draft: null, pending: false, start: vi.fn(), change: vi.fn(), cancel: vi.fn(), save: vi.fn(), remove }
  render(
    <ScheduleProductActionButtons
      row={mapApplicationProductRow({ ScheduleProductId: '30' }, 0)}
      actions={actions}
      onDelete={onDelete}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Delete product' }))
  expect(onDelete).toHaveBeenCalledOnce()
  expect(remove).not.toHaveBeenCalled()
})
