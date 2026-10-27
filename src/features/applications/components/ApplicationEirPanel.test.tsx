import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApplicationEirPanel } from './ApplicationEirPanel'

const state = vi.hoisted(() => ({
  detail: {
    data: {
      VisitId: 42,
      DesignatedRFR: 'Assigned RFR',
      ReportedInspectionDate: '2026-09-10 00:00:00',
      InspectionDate: '2026-09-18 00:00:00' as string | null,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
}))
vi.mock('../hooks/useApplicationDetail', () => ({ useApplicationDetail: () => state.detail }))
vi.mock('../hooks/useScheduleAIngredients', () => ({
  useScheduleAScratchpad: () => ({ scratchpad: {} }),
  getDaysSinceVisit: () => null,
  resolveScheduleADocumentUrl: () => '',
}))

afterEach(() => vi.unstubAllEnvs())

beforeEach(() => {
  state.detail.isLoading = false
  state.detail.isError = false
  state.detail.data.InspectionDate = '2026-09-18 00:00:00'
  vi.stubEnv('VITE_OUDIRECT_BASE_URL', 'https://example.com')
})

describe('Application Details EIR', () => {
  it('shows report details and switches to the inspection form without edit actions', () => {
    render(<ApplicationEirPanel applicationId={421} />)
    expect(screen.getByText('Inspection Report (EIR)')).toBeTruthy()
    expect(screen.getByText('42')).toBeTruthy()
    expect(screen.getByText('Report Ready')).toBeTruthy()
    expect(screen.queryByText(/Awaiting EIR Submission/)).toBeNull()
    expect(screen.getByText('Proposed Visit Date').parentElement?.textContent).toContain('Sep 10, 2026')
    expect(screen.getByText('Actual Visit Date').parentElement?.textContent).toContain('Sep 18, 2026')
    expect(screen.queryByRole('button', { name: 'Mark EIR review complete' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'EIR' }))
    expect(screen.getByTitle('EIR inspection form').getAttribute('src')).toBe(
      'https://example.com/oudirect/inspections/RfrVisitInspectionForm?emailLink=YF&type=Inspection&category=Inspection&mode=view&visitID=42',
    )
    fireEvent.click(screen.getByRole('button', { name: 'EIR Details' }))
    expect(screen.getByText('Inspection Report (EIR)')).toBeTruthy()
  })

  it('shows the existing empty state when inspection is incomplete', () => {
    state.detail.data.InspectionDate = null
    render(<ApplicationEirPanel applicationId={421} />)
    expect(screen.getByText('Awaiting Report')).toBeTruthy()
    expect(screen.getByText(/Awaiting EIR Submission/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'EIR' }))
    expect(screen.getByText('Inspection has not been done yet.')).toBeTruthy()
  })

  it('shows loading and allows retry on failure', () => {
    state.detail.isLoading = true
    const view = render(<ApplicationEirPanel applicationId={421} />)
    expect(screen.getByText('Loading EIR...')).toBeTruthy()
    state.detail.isLoading = false
    state.detail.isError = true
    view.rerender(<ApplicationEirPanel applicationId={421} />)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(state.detail.refetch).toHaveBeenCalled()
  })
})
