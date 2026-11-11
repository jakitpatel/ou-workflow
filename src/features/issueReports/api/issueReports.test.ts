import { afterEach, describe, expect, it, vi } from 'vitest'
import { ISSUE_REPORT_PATH, readIssueReportId, submitIssueReport } from './issueReports'
import type { IssueReportPayload } from '../model/issueReport'
import { clearRecentErrors, getRecentErrors } from '@/shared/diagnostics/recentErrors'

vi.mock('@/auth/authService', () => ({
  getAccessToken: vi.fn(), refreshAccessToken: vi.fn(), cognitoLogout: vi.fn(),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  clearRecentErrors()
})

const payload: IssueReportPayload = {
  category: 'bug',
  severity: 'high',
  summary: 'Contract task will not open',
  description: 'Clicking the task does nothing.',
  attachmentNames: ['screen.png'],
  context: {
    page: '/ou-workflow/ncrc-dashboard', pageTitle: 'Dashboard', applicationId: 42,
    appVersion: '1.0.900', appCommit: 'abc1234', appEnvironment: 'staging',
    username: 'jdoe', role: 'NCRC', userAgent: 'UA', viewport: '1280x720',
    timeZone: 'America/New_York', reportedAt: '2026-11-10T15:00:00.000Z', recentErrors: [],
  },
}

describe('readIssueReportId', () => {
  it.each([
    [{ reportId: 'IR-12' }, 'IR-12'],
    [{ id: 88 }, '88'],
    [{ data: { id: ' 9 ' } }, '9'],
    [{ data: { reportId: 5 } }, '5'],
    [{ id: '' }, null],
    [{ message: 'ok' }, null],
    [[{ id: 1 }], null],
    [null, null],
  ])('%j -> %s', (body, expected) => {
    expect(readIssueReportId(body)).toBe(expected)
  })
})

describe('submitIssueReport', () => {
  it('posts multipart form data with the JSON report and each attachment, without a JSON content type', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ reportId: 'IR-12' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['png'], 'screen.png', { type: 'image/png' })

    await expect(submitIssueReport({ payload, attachments: [file], token: 'tkn' })).resolves.toEqual({ reportId: 'IR-12' })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url.endsWith(ISSUE_REPORT_PATH)).toBe(true)
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tkn')
    expect(Object.keys(headers).map((key) => key.toLowerCase())).not.toContain('content-type')
    const body = init.body as FormData
    expect(body).toBeInstanceOf(FormData)
    expect(JSON.parse(body.get('report') as string)).toEqual(payload)
    expect((body.getAll('attachments') as File[]).map((item) => item.name)).toEqual(['screen.png'])
  })

  it('treats a success response without a report id as not saved', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'ok' }), { status: 200 })))
    await expect(submitIssueReport({ payload, attachments: [], token: 'tkn' })).rejects.toThrow(
      'The server did not confirm the change. Nothing was saved.',
    )
  })

  it('surfaces the server reason and records a redacted entry in recent errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Attachment too large' }), { status: 413, statusText: 'Payload Too Large' })))
    await expect(submitIssueReport({ payload, attachments: [], token: 'tkn' })).rejects.toThrow('Attachment too large')
    expect(getRecentErrors().map((entry) => entry.message)).toEqual([`POST ${ISSUE_REPORT_PATH} 413: Attachment too large`])
  })
})
