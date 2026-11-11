import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReportIssueDialog } from './ReportIssueDialog'
import { submitIssueReport } from '../api/issueReports'
import { clearRecentErrors, recordRecentError } from '@/shared/diagnostics/recentErrors'
import type { IssueReportPayload } from '../model/issueReport'

vi.mock('../api/issueReports', () => ({ submitIssueReport: vi.fn() }))
vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ username: 'jdoe', role: 'NCRC', token: 'tkn' }),
}))
vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({ location: { pathname: '/ou-workflow/ncrc-dashboard', searchStr: '?applicationId=42&q=Acme' } }),
}))

const submitMock = vi.mocked(submitIssueReport)

function renderDialog() {
  const onClose = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(<QueryClientProvider client={queryClient}><ReportIssueDialog onClose={onClose} /></QueryClientProvider>)
  return { onClose }
}

const fillRequired = () => {
  fireEvent.change(screen.getByLabelText('Summary'), { target: { value: '  Contract task will not open ' } })
  fireEvent.change(screen.getByLabelText('What happened?'), { target: { value: 'Clicking does nothing.' } })
}

const lastPayload = () => submitMock.mock.calls.at(-1)?.[0].payload as IssueReportPayload

beforeEach(() => {
  submitMock.mockReset()
  clearRecentErrors()
})
afterEach(() => clearRecentErrors())

describe('ReportIssueDialog', () => {
  it('requires a summary and a description before sending', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Send Report' }))
    expect(screen.getByText('Enter a short summary.')).toBeTruthy()
    expect(screen.getByText('Describe the issue.')).toBeTruthy()
    expect(screen.getByLabelText('Summary').getAttribute('aria-invalid')).toBe('true')
    expect(submitMock).not.toHaveBeenCalled()
  })

  it('sends category, severity, trimmed text, attachments and automatic context', async () => {
    submitMock.mockResolvedValue({ reportId: 'IR-12' })
    recordRecentError('api', 'GET /api/Company 500: boom for a@b.co')
    renderDialog()
    fireEvent.change(screen.getByLabelText('Type of issue'), { target: { value: 'data' } })
    fireEvent.change(screen.getByLabelText('Impact'), { target: { value: 'high' } })
    fillRequired()
    const file = new File(['png'], 'screen.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Attach files'), { target: { files: [file] } })
    expect(screen.getByRole('list', { name: 'Attached files' }).textContent).toContain('screen.png')

    fireEvent.click(screen.getByRole('button', { name: 'Send Report' }))

    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1))
    const call = submitMock.mock.calls[0][0]
    expect(call.attachments).toEqual([file])
    expect(call.payload).toMatchObject({
      category: 'data',
      severity: 'high',
      summary: 'Contract task will not open',
      description: 'Clicking does nothing.',
      attachmentNames: ['screen.png'],
      context: {
        page: '/ou-workflow/ncrc-dashboard',
        applicationId: 42,
        username: 'jdoe',
        role: 'NCRC',
        recentErrors: [expect.objectContaining({ source: 'api', message: 'GET /api/Company 500: boom for [email]' })],
      },
    })
    expect(call.payload).not.toHaveProperty('includeRecentErrors')
    expect(JSON.stringify(call.payload)).not.toContain('Acme')
    expect(await screen.findByText('IR-12')).toBeTruthy()
  })

  it('leaves out recent errors when the user unticks the option', async () => {
    submitMock.mockResolvedValue({ reportId: '1' })
    recordRecentError('window', 'boom')
    renderDialog()
    fillRequired()
    fireEvent.click(screen.getByRole('checkbox', { name: /Include recent error messages \(1\)/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Send Report' }))
    await waitFor(() => expect(submitMock).toHaveBeenCalled())
    expect(lastPayload().context.recentErrors).toEqual([])
  })

  it('keeps the text and allows a retry when sending fails, and blocks double submits while sending', async () => {
    let rejectFirst: (error: Error) => void = () => {}
    submitMock.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectFirst = reject }))
    renderDialog()
    fillRequired()
    fireEvent.click(screen.getByRole('button', { name: 'Send Report' }))

    const sending = await screen.findByRole('button', { name: 'Sending…' })
    expect((sending as HTMLButtonElement).disabled).toBe(true)
    fireEvent.submit(sending.closest('form') as HTMLFormElement)
    expect(submitMock).toHaveBeenCalledTimes(1)

    rejectFirst(new Error('Service unavailable'))
    expect((await screen.findByRole('alert')).textContent).toContain('Service unavailable')
    expect((screen.getByLabelText('Summary') as HTMLInputElement).value).toBe('  Contract task will not open ')

    submitMock.mockResolvedValueOnce({ reportId: 'IR-13' })
    fireEvent.click(screen.getByRole('button', { name: 'Send Report' }))
    expect(await screen.findByText('IR-13')).toBeTruthy()
    expect(submitMock).toHaveBeenCalledTimes(2)
  })

  it('shows attachment errors and lets the user remove a file', () => {
    renderDialog()
    const input = screen.getByLabelText('Attach files')
    fireEvent.change(input, { target: { files: [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['x'], 'run.exe', { type: 'application/x-msdownload' }),
    ] } })
    expect(screen.getByRole('alert').textContent).toContain('run.exe: only images, PDF and text files can be attached.')
    fireEvent.click(screen.getByRole('button', { name: 'Remove a.png' }))
    expect(screen.queryByRole('list', { name: 'Attached files' })).toBeNull()
  })

  it('closes from Cancel', () => {
    const { onClose } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
  })
})
