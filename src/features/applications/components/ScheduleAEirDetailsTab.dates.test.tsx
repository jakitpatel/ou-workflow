import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ApplicationDetail } from '@/types/application'
import { ScheduleAEirDetailsTab } from './ScheduleAEirDetailsTab'

// appvars from the report: actual_visit_date "2026-11-06", visit_planned_date "2026-11-09".
const detail = { actualVisitDate: '2026-11-06', scheduleVisitDate: '2026-11-09' } as unknown as ApplicationDetail
const scratchpadApi = {
  scratchpad: { eirNotRequired: false, eirReceived: false, eirReviewComplete: false },
} as never

const valueAfter = (label: string) =>
  screen.getByText(label).nextElementSibling?.textContent?.trim()

describe.each(['America/New_York', 'Asia/Jerusalem'])('EIR details dates in %s', (zone) => {
  let previous: string | undefined
  beforeEach(() => {
    previous = process.env.TZ
    process.env.TZ = zone
  })
  afterEach(() => {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  })

  it('shows the stored calendar days, not the day before', () => {
    render(<ScheduleAEirDetailsTab applicationDetail={detail} scratchpadApi={scratchpadApi} readOnly />)
    expect(valueAfter('Actual Visit Date')).toContain('Nov 6, 2026')
    expect(valueAfter('Proposed Visit Date')).toBe('Nov 9, 2026')
  })
})
