import { render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { InspectionEmailBodyPreview } from '../components/InspectionEmailBodyPreview'
import { buildHtmlEmailFromPlainText } from '@/shared/email/htmlEmail'
import { buildNotificationBody } from './inspectionNotification'

afterEach(() => vi.unstubAllEnvs())

it.each([
  ['development', 'https://oudirect-st.ou.org'],
  ['staging', 'https://oudirectstaging.org'],
  ['production', 'https://oudirect.org'],
  ['custom', 'https://example.com/'],
])('uses the %s OUDirect URL in the email and preview', (_mode, domain) => {
  vi.stubEnv('VITE_OUDIRECT_BASE_URL', domain)
  const url = `${domain.replace(/\/$/, '')}/oudirect/inspections/RfrVisitInspectionForm?type=Inspection&mode=new&subtype=short&visitID=456&menu=VisitsAsRfr`
  const body = buildNotificationBody({
    rfrName: 'RFR',
    senderName: 'NCRC',
    plant: 'Plant',
    company: 'Company',
    accountNumber: '123',
    applicationLinkLabel: 'Application',
    accountApplicationUrl: '',
    assignmentStartDate: '2026-10-06',
    assignmentEndDate: '2027-01-04',
    visitId: '456',
  })

  expect(body).toContain(`OUDirect: ${url}`)
  expect(buildHtmlEmailFromPlainText(body).html).toContain(`href="${url.replace(/&/g, '&amp;')}"`)
  const { unmount } = render(<InspectionEmailBodyPreview body={body} applicationUrl="" />)
  expect(screen.getByRole('link', { name: 'OUDirect' }).getAttribute('href')).toBe(url)
  unmount()
})
