import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { NcrcDashboardControls } from './NcrcDashboardControls'
import { NCRC_DASHBOARD_PAGE_SIZE } from '@/features/applications/lib/pagination'

vi.mock('@/context/AppPreferencesContext', () => ({
  useAppPreferences: () => ({ navigationMenuType: 'left' }),
}))

type Props = ComponentProps<typeof NcrcDashboardControls>

const renderControls = (overrides: Partial<Props> = {}) => {
  const props: Props = {
    q: '', status: 'all', priority: 'all', page: 0, myOnly: false, totalCount: 0,
    paginationMode: 'paged', isLoading: false, isError: false, error: null,
    applicantStats: { total: 0, new: 0, inProgress: 0, withdrawn: 0, completed: 0, others: 0 },
    onOpenMyNotes: vi.fn(), onUpdateSearch: vi.fn(), onFirstPage: vi.fn(), onPrevPage: vi.fn(),
    onNextPage: vi.fn(), onLastPage: vi.fn(),
    ...overrides,
  }
  const view = render(<NcrcDashboardControls {...props} />)
  return { ...view, props, text: () => view.container.textContent ?? '' }
}

const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement

describe('NcrcDashboardControls pagination (F4)', () => {
  it('uses the same page size as the data hook', () => {
    expect(NCRC_DASHBOARD_PAGE_SIZE).toBe(50)
    const { text } = renderControls({ totalCount: 16 })
    expect(text()).toContain('Showing 1-16 of 16 applications')
    expect(text()).toContain('Page 1 of 1')
    expect(button('Next').disabled).toBe(true)
    expect(button('Last').disabled).toBe(true)
  })

  it('numbers the last page and disables Next there', () => {
    const { text } = renderControls({ totalCount: 120, page: 100 })
    expect(text()).toContain('Showing 101-120 of 120 applications')
    expect(text()).toContain('Page 3 of 3')
    expect(button('Next').disabled).toBe(true)
    expect(button('Prev').disabled).toBe(false)
  })

  it('enables Next when another page exists', () => {
    renderControls({ totalCount: 51 })
    expect(button('Next').disabled).toBe(false)
  })

  it('shows an empty result as 0-0 and Page 0 of 0', () => {
    const { text } = renderControls({ totalCount: 0 })
    expect(text()).toContain('Showing 0-0 of 0 applications')
    expect(text()).toContain('Page 0 of 0')
  })
})

describe('NcrcDashboardControls priority filter (F9)', () => {
  it('offers the WF_Priorities codes and sends the code', () => {
    const { props } = renderControls()
    const select = screen.getByDisplayValue('All Priorities') as HTMLSelectElement
    expect([...select.options].map((option) => option.value)).toEqual([
      'all', 'CRITICAL', 'HIGH', 'NORMAL', 'LOW',
    ])
    fireEvent.change(select, { target: { value: 'CRITICAL' } })
    expect(props.onUpdateSearch).toHaveBeenCalledWith({ priority: 'CRITICAL', page: 0 })
  })

  it('renders priority options supplied from the API', () => {
    renderControls({ priorityOptions: [{ value: 'CRITICAL', label: 'Critical' }, { value: 'RUSH', label: 'Rush' }] })
    expect(screen.getByRole('option', { name: 'Rush' })).toBeTruthy()
  })
})

describe('NcrcDashboardControls stale results (F11)', () => {
  it('announces that results are updating while the previous result is shown', () => {
    const { rerender, props } = renderControls({ totalCount: 3, isRefreshing: true })
    expect(screen.getByRole('status').textContent).toContain('Updating results')
    rerender(<NcrcDashboardControls {...props} isRefreshing={false} />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
