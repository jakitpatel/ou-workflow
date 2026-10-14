import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { getScheduleAEirUrl } from '../utils/scheduleAEirUrl'
import { ScheduleAEirNewTab } from './ScheduleAEirNewTab'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

it.each([
  ['production', 'oudirect.org'],
  ['staging', 'oudirectstaging.org'],
  ['development', 'oudirect-st.ou.org'],
  ['custom', 'example.com'],
])('displays the current visit in the %s inspection form', (_mode, host) => {
  vi.stubEnv('VITE_OUDIRECT_BASE_URL', `https://${host}`)
  const url = getScheduleAEirUrl(3006890)
  expect(url).toBe(
    `https://${host}/oudirect/inspections/RfrVisitInspectionForm?emailLink=YF&type=Inspection&category=Inspection&mode=view&visitID=3006890`,
  )
  const { rerender } = render(<ScheduleAEirNewTab url={url} inspectionStatus="COMPLETED" />)
  expect(screen.getByTitle('EIR New inspection form').getAttribute('src')).toBe(url)
  expect(screen.getByRole('link').getAttribute('href')).toBe(url)

  const nextUrl = getScheduleAEirUrl(' 456 ')
  rerender(<ScheduleAEirNewTab url={nextUrl} inspectionStatus="COMPLETED" />)
  expect(screen.getByTitle('EIR New inspection form').getAttribute('src')).toBe(
    `https://${host}/oudirect/inspections/RfrVisitInspectionForm?emailLink=YF&type=Inspection&category=Inspection&mode=view&visitID=456`,
  )
})

it.each([undefined, null, '', ' ', 'NULL'])('shows an empty state for Visit ID %s', (visitId) => {
  const url = getScheduleAEirUrl(visitId)
  expect(url).toBe('')
  render(<ScheduleAEirNewTab url={url} inspectionStatus="COMPLETED" />)
  expect(screen.getByText(/once a Visit ID is assigned/)).toBeTruthy()
  expect(screen.queryByTitle('EIR New inspection form')).toBeNull()
  expect(screen.queryByRole('link')).toBeNull()
})

it.each([undefined, '', 'IN_PROGRESS', 'PENDING', 'NOT_STARTED', 'completed'])
  ('denies access for Inspection status %s even with a Visit URL', (inspectionStatus) => {
    render(<ScheduleAEirNewTab url="https://oudirect.org/oudirect/inspections/RfrVisitInspectionForm?visitID=123" inspectionStatus={inspectionStatus} />)
    expect(screen.getByText('You are not allowed to see this Tab.')).toBeTruthy()
    expect(screen.queryByTitle('EIR New inspection form')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

it('removes the inspection form when Inspection is no longer completed', () => {
  const { rerender } = render(<ScheduleAEirNewTab url="https://oudirect.org" inspectionStatus="COMPLETED" />)
  expect(screen.getByTitle('EIR New inspection form')).toBeTruthy()
  rerender(<ScheduleAEirNewTab url="https://oudirect.org" inspectionStatus="IN_PROGRESS" />)
  expect(screen.getByText('You are not allowed to see this Tab.')).toBeTruthy()
  expect(screen.queryByTitle('EIR New inspection form')).toBeNull()
  expect(screen.queryByRole('link')).toBeNull()
})
