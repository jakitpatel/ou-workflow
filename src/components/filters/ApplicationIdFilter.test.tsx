import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApplicationIdFilter } from './ApplicationIdFilter'
import { PrelimDashboardFilters } from '@/features/prelim/components/PrelimDashboardFilters'
import { NcrcDashboardControls } from '@/features/applications/components/NcrcDashboardControls'

vi.mock('@/context/AppPreferencesContext', () => ({ useAppPreferences: () => ({ navigationMenuType: 'left' }) }))

describe.each(['dashboard', 'intake'] as const)('%s Application ID filter', (dashboard) => {
  it('applies and clears an ID while resetting pagination', () => {
    const onChange = vi.fn()
    render(dashboard === 'intake' ? <PrelimDashboardFilters applicationId={123} onChange={onChange} /> :
      <NcrcDashboardControls applicationId={123} q="" status="all" priority="all" page={10} myOnly={false}
        totalCount={100} totalPages={20} paginationMode="paged" isLoading={false} isError={false} error={null}
        applicantStats={{ total: 0, new: 0, inProgress: 0, withdrawn: 0, completed: 0, others: 0 }}
        onOpenMyNotes={() => {}} onUpdateSearch={onChange} onFirstPage={() => {}} onPrevPage={() => {}}
        onNextPage={() => {}} onLastPage={() => {}} />)
    const input = screen.getByLabelText('Application ID')
    expect((input as HTMLInputElement).value).toBe('123')
    fireEvent.change(input, { target: { value: '3719' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onChange).toHaveBeenLastCalledWith({ applicationId: 3719, page: 0 })
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onChange).toHaveBeenLastCalledWith({ applicationId: undefined, page: 0 })
    expect((input as HTMLInputElement).value).toBe('')
  })
})

it.each(['0', '-1', '1.5', '9007199254740992'])('rejects invalid Application ID %s', (value) => {
  const onApply = vi.fn()
  render(<ApplicationIdFilter onApply={onApply} />)
  fireEvent.click(screen.getByText('Advanced filters'))
  const input = screen.getByLabelText('Application ID')
  fireEvent.change(input, { target: { value } })
  fireEvent.submit(input.closest('form')!)
  expect(onApply).not.toHaveBeenCalled()
})
