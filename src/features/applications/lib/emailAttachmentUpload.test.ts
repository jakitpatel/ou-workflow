import { describe, expect, it } from 'vitest'
import { formatEmailAttachments, readUploadedEmailAttachment } from './emailAttachmentUpload'

const file = new File(['abc'], 'scope.pdf', { type: 'application/pdf' })

describe('readUploadedEmailAttachment', () => {
  it.each([
    ['upload_files response', { message: 'ok', file_path: 's3://b/scope.pdf', link: 'https://x/scope.pdf' }, 's3://b/scope.pdf', 'scope.pdf'],
    ['link only', { link: 'https://x/scope.pdf' }, 'https://x/scope.pdf', 'scope.pdf'],
    ['JSON:API attributes', { data: { attributes: { FilePath: '/file/7', FileName: 'Scope v2.pdf' } } }, '/file/7', 'Scope v2.pdf'],
    ['data wrapper', { data: { fileUrl: 'https://x/a.pdf' } }, 'https://x/a.pdf', 'scope.pdf'],
  ])('reads the file reference from the %s', (_label, response, fileUrl, fileName) => {
    expect(readUploadedEmailAttachment(response, file)).toEqual({ fileName, fileUrl, sizeBytes: 3 })
  })

  it.each([[{ message: 'stored' }], [null], ['ok'], [{ file_path: '  ' }]])('rejects %j without a reference', (response) => {
    expect(() => readUploadedEmailAttachment(response, file)).toThrow(
      'Upload completed but no file URL was returned for scope.pdf.',
    )
  })
})

describe('formatEmailAttachments', () => {
  it('joins name<url> pairs with ", " and returns null when empty', () => {
    expect(formatEmailAttachments([
      { fileName: 'a.pdf', fileUrl: 's3://b/a.pdf', sizeBytes: 1 },
      { fileName: 'b.png', fileUrl: '/file/2', sizeBytes: 1 },
    ])).toBe('a.pdf<s3://b/a.pdf>, b.png</file/2>')
    expect(formatEmailAttachments([])).toBeNull()
  })
})
