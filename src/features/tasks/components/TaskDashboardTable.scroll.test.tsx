import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TaskDashboardTable } from './TaskDashboardTable'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => vi.fn(),
}))

describe('Tasks & Notifications table scrolling', () => {
  it('fills the remaining height and scrolls only the rows under sticky column headings', () => {
    render(
      <TaskDashboardTable filteredTasks={[]} paginationMode="paged" totalCount={0} hasNextPage={false}
        sentinelRef={{ current: null }} isFetchingNextPage={false} handleApplicationTaskAction={vi.fn()}
        handleShowPlantHistory={vi.fn()} />,
    )
    const scroll = screen.getByTestId('tasks-table-scroll')
    expect(scroll.className).toContain('flex-1')
    expect(scroll.className).toContain('min-h-0')
    expect(scroll.className).toContain('overflow-y-auto')
    // No viewport-based cap any more: that cap is what let the whole page scroll.
    expect(scroll.className).not.toMatch(/max-h-/)
    expect(scroll.parentElement!.className).toContain('flex-1')

    const head = screen.getAllByRole('rowgroup')[0]
    expect(head.tagName).toBe('THEAD')
    expect(head.className).toContain('sticky')
    expect(head.className).toContain('top-0')
  })
})
