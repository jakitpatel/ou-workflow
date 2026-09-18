import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ApplicationDetailsContent } from './ApplicationDetailsContent'
import type { ApplicationDetail } from '@/types/application'

vi.mock('@/features/tasks/notes/useTaskNotesDrawerState', () => ({
  useTaskNotesDrawerState: () => ({ drawer: null, openDrawer: vi.fn() }),
}))
vi.mock('./application-management/Overview', () => ({ default: () => <div>Overview content</div> }))
vi.mock('./ScheduleAIngredientsDrawer', () => ({
  ScheduleAIngredientsDrawer: ({ applicationId, readOnly }: { applicationId: number; readOnly: boolean }) => (
    <div>Schedule A application {applicationId} {readOnly ? 'read-only' : 'editable'}</div>
  ),
}))
vi.mock('./ScheduleBProductsDrawer', () => ({
  ScheduleBProductsDrawer: ({ applicationId, readOnly }: { applicationId: number; readOnly: boolean }) => (
    <div>Schedule B application {applicationId} {readOnly ? 'read-only' : 'editable'}</div>
  ),
}))

const application = {
  applicationId: '421', status: 'Pending', company: [{ name: 'RFR Company' }],
  contacts: [], plants: [], products: [], raw_data: [],
} as ApplicationDetail

describe('RFR application details', () => {
  it('shows exactly the allowed sections and opens company details first', () => {
    renderWithProviders(<ApplicationDetailsContent application={application} rfrView />)
    expect(screen.getByText('RFR Preprocessing Interface')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Company Information' })).toBeTruthy()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Company Details', 'Company Contacts', 'Plants', 'Schedule A', 'Schedule B', 'Raw Application',
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Schedule A' }))
    expect(screen.getByText('Schedule A application 421 read-only')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Schedule B' }))
    expect(screen.getByText('Schedule B application 421 read-only')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Raw Application' }))
    expect(screen.queryByText('Schedule B application 421 read-only')).toBeNull()
  })

  it('preserves staff sections and hides a previously selected staff section when switching to RFR view', () => {
    const view = renderWithProviders(<ApplicationDetailsContent application={application} />)
    expect(screen.getByText('NCRC Preprocessing Interface')).toBeTruthy()
    expect(screen.getByText('Overview content')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Inspection Invoice' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Contract' })).toBeTruthy()
    view.rerender(<ApplicationDetailsContent application={application} rfrView />)
    expect(screen.queryByText('Overview content')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Inspection Invoice' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Company Information' })).toBeTruthy()
  })
})
