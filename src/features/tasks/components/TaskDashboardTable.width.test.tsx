import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TaskDashboardTable } from './TaskDashboardTable'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => vi.fn(),
}))

describe('Tasks & Notifications table width', () => {
  it('fills, but does not grow past, its container so no horizontal scrollbar is needed', () => {
    render(
      <TaskDashboardTable filteredTasks={[]} paginationMode="paged" totalCount={0} hasNextPage={false}
        sentinelRef={{ current: null }} isFetchingNextPage={false} handleApplicationTaskAction={vi.fn()}
        handleShowPlantHistory={vi.fn()} />,
    )
    const table = screen.getByRole('table')
    // table-fixed only honours the column widths when the table has a definite width.
    expect(table.classList.contains('table-fixed')).toBe(true)
    expect(table.classList.contains('w-full')).toBe(true)
    expect(table.classList.contains('break-words')).toBe(true)
  })
})
