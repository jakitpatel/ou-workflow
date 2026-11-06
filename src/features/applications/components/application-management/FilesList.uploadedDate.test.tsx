import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { describe, expect, it, vi } from 'vitest'
import type { ApplicationDetail } from '@/types/application'
import { mapPrelimApplicationDetailToApplicationDetail } from '@/features/prelim/lib/prelimApplicationDetailAdapter'
import FilesList, { getFileUploadedDate } from './FilesList'

vi.mock('@/context/UserContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/context/UserContext')>()),
  useUser: () => ({ token: 'token', username: 'tester' }),
}))

const expected = (value: string, withTime = true) =>
  new Date(value).toLocaleString(undefined, withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' })

describe('getFileUploadedDate', () => {
  it('reads UploadedDate, uploadedDate or uploadDate', () => {
    expect(getFileUploadedDate({ UploadedDate: '2026-11-03T17:55:33' })).toBe(expected('2026-11-03T17:55:33'))
    expect(getFileUploadedDate({ uploadedDate: '2026-11-03T17:55:33' })).toBe(expected('2026-11-03T17:55:33'))
    expect(getFileUploadedDate({ uploadDate: '2026-11-03T17:55:33' })).toBe(expected('2026-11-03T17:55:33'))
  })

  it('accepts a space between date and time, and date-only values', () => {
    expect(getFileUploadedDate({ UploadedDate: '2026-11-03 17:55:33' })).toBe(expected('2026-11-03T17:55:33'))
    expect(getFileUploadedDate({ UploadedDate: '2026-11-03' })).toBe(expected('2026-11-03', false))
  })

  it('is empty for missing values and the backend "NULL", and keeps unreadable text as is', () => {
    for (const value of [undefined, null, '', '  ', 'NULL', 'null']) {
      expect(getFileUploadedDate({ UploadedDate: value })).toBe('')
    }
    expect(getFileUploadedDate({ UploadedDate: 'yesterday' })).toBe('yesterday')
  })
})

const baseApplication = { applicationId: 1659, status: 'In Progress', files: [] } as unknown as ApplicationDetail

describe('FilesList UploadedDate', () => {
  it('shows each file\'s upload date (application details)', () => {
    renderWithProviders(
      <FilesList
        application={{
          ...baseApplication,
          files: [
            { FileID: 1, FileName: 'spec.pdf', FileType: 'application', FilePath: '/file/1', UploadedDate: '2026-11-03T17:55:33', CreatedBy: 'KLEINC' },
            { FileID: 2, FileName: 'no-date.pdf', FileType: 'application', FilePath: '/file/2', UploadedDate: 'NULL' },
          ],
        } as unknown as ApplicationDetail}
      />,
    )
    expect(screen.getByText(expected('2026-11-03T17:55:33'))).toBeTruthy()
    expect(screen.getAllByText('UploadedDate:')).toHaveLength(1)
  })

  it('shows the upload date of submission files (Application Intake details)', () => {
    const submission = mapPrelimApplicationDetailToApplicationDetail({
      applicationId: 1659,
      status: 'In Progress',
      submission_files: [{ FileId: 9, fileName: 'intake.pdf', FilePath: '/file/9', uploadDate: '2026-10-30 01:14:35' }],
    } as never)
    renderWithProviders(<FilesList application={submission} showProcessingStatus={false} />)
    expect(screen.getByText('intake.pdf')).toBeTruthy()
    expect(screen.getByText(expected('2026-10-30T01:14:35'))).toBeTruthy()
  })
})
