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
  const { rerender } = render(<ScheduleAEirNewTab url={url} actualVisitDate="2026-09-18 00:00:00" />)
  expect(screen.getByTitle('EIR inspection form').getAttribute('src')).toBe(url)
  expect(screen.getByRole('link').getAttribute('href')).toBe(url)

  const nextUrl = getScheduleAEirUrl(' 456 ')
  rerender(<ScheduleAEirNewTab url={nextUrl} actualVisitDate="2026-09-18 00:00:00" />)
  expect(screen.getByTitle('EIR inspection form').getAttribute('src')).toBe(
    `https://${host}/oudirect/inspections/RfrVisitInspectionForm?emailLink=YF&type=Inspection&category=Inspection&mode=view&visitID=456`,
  )
})

it.each([undefined, null, '', ' ', 'NULL'])('shows an empty state for Visit ID %s', (visitId) => {
  const url = getScheduleAEirUrl(visitId)
  expect(url).toBe('')
  render(<ScheduleAEirNewTab url={url} actualVisitDate="2026-09-18 00:00:00" />)
  expect(screen.getByText(/once a Visit ID is assigned/)).toBeTruthy()
  expect(screen.queryByTitle('EIR inspection form')).toBeNull()
  expect(screen.queryByRole('link')).toBeNull()
})

it.each([undefined, null, '', ' ', 'NULL', 'null'])
  ('shows inspection pending for date %s even with a Visit URL', (inspectionDate) => {
    render(<ScheduleAEirNewTab url="https://oudirect.org/oudirect/inspections/RfrVisitInspectionForm?visitID=123" actualVisitDate={inspectionDate} />)
    expect(screen.getByText('Inspection has not been done yet.')).toBeTruthy()
    expect(screen.queryByTitle('EIR inspection form')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

it('removes the inspection form when the inspection date is removed', () => {
  const { rerender } = render(<ScheduleAEirNewTab url="https://oudirect.org" actualVisitDate="2026-09-18" />)
  expect(screen.getByTitle('EIR inspection form')).toBeTruthy()
  rerender(<ScheduleAEirNewTab url="https://oudirect.org" actualVisitDate={null} />)
  expect(screen.getByText('Inspection has not been done yet.')).toBeTruthy()
  expect(screen.queryByTitle('EIR inspection form')).toBeNull()
  expect(screen.queryByRole('link')).toBeNull()
})
