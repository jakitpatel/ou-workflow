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
  ['unknown', 'oudirect-st.ou.org'],
])('displays the current visit in the %s inspection form', (mode, host) => {
  vi.stubEnv('MODE', mode)
  const url = getScheduleAEirUrl(3006890)
  expect(url).toBe(
    `https://${host}/oudirect/inspections/RfrVisitInspectionForm?type=Historical&mode=view&subtype=short&visitID=3006890&menu=VisitsAsRfr`,
  )
  const { rerender } = render(<ScheduleAEirNewTab url={url} />)
  expect(screen.getByTitle('EIR New inspection form').getAttribute('src')).toBe(url)
  expect(screen.getByRole('link').getAttribute('href')).toBe(url)

  const nextUrl = getScheduleAEirUrl(' 456 ')
  rerender(<ScheduleAEirNewTab url={nextUrl} />)
  expect(screen.getByTitle('EIR New inspection form').getAttribute('src')).toContain('visitID=456&')
})

it.each([undefined, null, '', ' ', 'NULL'])('shows an empty state for Visit ID %s', (visitId) => {
  const url = getScheduleAEirUrl(visitId)
  expect(url).toBe('')
  render(<ScheduleAEirNewTab url={url} />)
  expect(screen.getByText(/once a Visit ID is assigned/)).toBeTruthy()
  expect(screen.queryByTitle('EIR New inspection form')).toBeNull()
  expect(screen.queryByRole('link')).toBeNull()
})
