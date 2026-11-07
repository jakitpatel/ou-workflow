import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { parseMessageAttachments } from './messageAttachments'
import { MessageAttachmentList } from './MessageAttachmentList'

const S3 = 's3://oucert-email-attachments-dev/2026/11/05/abc/QD 32 Final.pdf'

describe('parseMessageAttachments', () => {
  it('reads quoted Name<s3://...> entries (as stored on email responses) as not openable yet', () => {
    expect(parseMessageAttachments(`"QD 32 Final.pdf<${S3}>"`)).toEqual([
      { name: 'QD 32 Final.pdf', reference: S3, href: null, storage: 's3' },
    ])
  })

  it('reads several entries, including names that contain commas, and links API files and https URLs', () => {
    const items = parseMessageAttachments(
      `Spec, rev 2.pdf<${window.location.origin}/file/3>, LOC.pdf<https://files.example.test/loc.pdf>, Photo.jpg<${S3}>`,
    )
    expect(items.map(({ name, storage }) => [name, storage])).toEqual([
      ['Spec, rev 2.pdf', 'link'],
      ['LOC.pdf', 'link'],
      ['Photo.jpg', 's3'],
    ])
    expect(items[1].href).toBe('https://files.example.test/loc.pdf')
  })

  it('accepts bare references and names, and ignores blank text', () => {
    expect(parseMessageAttachments('')).toEqual([])
    expect(parseMessageAttachments(null)).toEqual([])
    expect(parseMessageAttachments(`${S3}, notes.txt`).map(({ name, storage }) => [name, storage])).toEqual([
      ['QD 32 Final.pdf', 's3'],
      ['notes.txt', 'unknown'],
    ])
  })

  it('never turns unsafe schemes into links', () => {
    expect(parseMessageAttachments('Click<javascript:alert(1)>')[0]).toMatchObject({ href: null, storage: 'unknown' })
  })
})

describe('MessageAttachmentList', () => {
  it('renders openable attachments as new-tab links and s3 ones as explained, unclickable chips', () => {
    render(<MessageAttachmentList attachments={`LOC.pdf<https://files.example.test/loc.pdf>, "QD 32 Final.pdf<${S3}>"`} />)
    const group = screen.getByRole('group', { name: 'Attachments' })
    expect(group.textContent).toContain('2 attachments')

    const link = within(group).getByRole('link', { name: 'LOC.pdf' })
    expect(link.getAttribute('href')).toBe('https://files.example.test/loc.pdf')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')

    expect(within(group).queryByRole('link', { name: /QD 32 Final/ })).toBeNull()
    const s3Chip = within(group).getByText('QD 32 Final.pdf').parentElement!
    expect(s3Chip.getAttribute('title')).toMatch(/Stored in S3/)
  })

  it('renders nothing when the message has no attachments', () => {
    const { container } = render(<MessageAttachmentList attachments="  " />)
    expect(container.innerHTML).toBe('')
  })
})
