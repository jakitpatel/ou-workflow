import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApplicationEirPanel } from './ApplicationEirPanel'

const state = vi.hoisted(() => ({
  detail: {
    data: {
      VisitId: 42,
      DesignatedRFR: 'Assigned RFR',
      ReportedInspectionDate: '2026-09-10 00:00:00',
      InspectionDate: '2026-09-18 00:00:00',
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  eir: {
    applicationItem: null,
    inspectionStatus: 'COMPLETED',
    eirNewUrl: 'https://example.com/eir/42',
  },
}))
vi.mock('../hooks/useApplicationDetail', () => ({ useApplicationDetail: () => state.detail }))
vi.mock('../hooks/useScheduleEir', () => ({ useScheduleEir: () => state.eir }))
vi.mock('../hooks/useScheduleAIngredients', () => ({
  useScheduleAScratchpad: () => ({ scratchpad: {} }),
  getDaysSinceVisit: () => null,
  resolveScheduleADocumentUrl: () => '',
}))

beforeEach(() => {
  state.detail.isLoading = false
  state.detail.isError = false
  state.eir.inspectionStatus = 'COMPLETED'
  state.eir.eirNewUrl = 'https://example.com/eir/42'
})

describe('Application Details EIR', () => {
  it('shows report details and switches to the inspection form without edit actions', () => {
    render(<ApplicationEirPanel applicationId={421} />)
    expect(screen.getByText('Inspection Report (EIR)')).toBeTruthy()
    expect(screen.getByText('42')).toBeTruthy()
    expect(screen.getByText('Proposed Visit Date').parentElement?.textContent).toContain('Sep 10, 2026')
    expect(screen.getByText('Actual Visit Date').parentElement?.textContent).toContain('Sep 18, 2026')
    expect(screen.queryByRole('button', { name: 'Mark EIR review complete' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'EIR' }))
    expect(screen.getByTitle('EIR inspection form').getAttribute('src')).toBe(
      'https://example.com/eir/42',
    )
    fireEvent.click(screen.getByRole('button', { name: 'EIR Details' }))
    expect(screen.getByText('Inspection Report (EIR)')).toBeTruthy()
  })

  it('shows the existing empty state when inspection is incomplete', () => {
    state.eir.inspectionStatus = 'PENDING'
    render(<ApplicationEirPanel applicationId={421} />)
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
