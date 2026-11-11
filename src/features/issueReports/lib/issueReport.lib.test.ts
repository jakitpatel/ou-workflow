import { describe, expect, it } from 'vitest'
import { addIssueAttachments } from './issueReportAttachments'
import { buildIssueReportContext, getApplicationIdFromLocation } from './issueReportContext'
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES } from '../model/issueReport'

const fileOf = (name: string, size: number, type: string) => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('getApplicationIdFromLocation', () => {
  it.each([
    ['/ou-workflow/ncrc-dashboard/1234', '', 1234],
    ['/ou-workflow/rfr-dashboard/77/', '', 77],
    ['/ou-workflow/tasks-dashboard/55', '?page=0', 55],
    ['/ou-workflow/ncrc-dashboard', '?applicationId=901&page=0', 901],
    ['/ou-workflow/prelim-dashboard', '?appId=12', 12],
    ['/ou-workflow/ncrc-dashboard', '?applicationId=abc', null],
    ['/ou-workflow/ncrc-dashboard/0', '', null],
    ['/stats', '', null],
  ])('%s%s -> %s', (pathname, search, expected) => {
    expect(getApplicationIdFromLocation(pathname, search)).toBe(expected)
  })
})

describe('buildIssueReportContext', () => {
  const env = {
    pathname: '/ou-workflow/ncrc-dashboard',
    search: '?applicationId=42&q=Acme%20Foods',
    pageTitle: 'Dashboard',
    username: ' jdoe ',
    role: 'NCRC',
    build: { version: '1.0.900', commit: 'abc1234', env: 'staging' },
    userAgent: 'TestBrowser/1.0',
    viewport: { width: 1280.4, height: 720 },
    timeZone: 'America/New_York',
    now: new Date('2026-11-10T15:00:00Z'),
    recentErrors: [{ time: '2026-11-10T14:59:00.000Z', source: 'api' as const, message: 'GET /x 500: boom' }],
    includeRecentErrors: true,
  }

  it('collects page, application, build, user and browser details without the query string', () => {
    const context = buildIssueReportContext(env)
    expect(context).toEqual({
      page: '/ou-workflow/ncrc-dashboard',
      pageTitle: 'Dashboard',
      applicationId: 42,
      appVersion: '1.0.900',
      appCommit: 'abc1234',
      appEnvironment: 'staging',
      username: 'jdoe',
      role: 'NCRC',
      userAgent: 'TestBrowser/1.0',
      viewport: '1280x720',
      timeZone: 'America/New_York',
      reportedAt: '2026-11-10T15:00:00.000Z',
      recentErrors: env.recentErrors,
    })
    expect(JSON.stringify(context)).not.toContain('Acme')
  })

  it('leaves out recent errors when the user opts out', () => {
    expect(buildIssueReportContext({ ...env, includeRecentErrors: false }).recentErrors).toEqual([])
  })
})

describe('addIssueAttachments', () => {
  it('accepts supported files and reports each rejected one', () => {
    const png = fileOf('screen.png', 1000, 'image/png')
    const log = fileOf('console.log', 500, '')
    const { files, errors } = addIssueAttachments([], [
      png,
      log,
      fileOf('macro.exe', 100, 'application/x-msdownload'),
      fileOf('huge.pdf', MAX_ATTACHMENT_BYTES + 1, 'application/pdf'),
      fileOf('empty.txt', 0, 'text/plain'),
    ])
    expect(files).toEqual([png, log])
    expect(errors).toEqual([
      'macro.exe: only images, PDF and text files can be attached.',
      'huge.pdf: larger than 10 MB.',
      'empty.txt: the file is empty.',
    ])
  })

  it('skips duplicates and enforces the file count', () => {
    const first = fileOf('a.png', 10, 'image/png')
    const current = [first, fileOf('b.png', 10, 'image/png'), fileOf('c.png', 10, 'image/png')]
    expect(current).toHaveLength(MAX_ATTACHMENTS)
    const { files, errors } = addIssueAttachments(current, [fileOf('a.png', 10, 'image/png'), fileOf('d.png', 10, 'image/png')])
    expect(files).toEqual(current)
    expect(errors).toEqual([`d.png: you can attach up to ${MAX_ATTACHMENTS} files.`])
  })
})
