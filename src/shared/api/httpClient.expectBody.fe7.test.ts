import { afterEach, describe, expect, it, vi } from 'vitest'
import { isAppError } from './errors'
import { WRITE_NOT_CONFIRMED_MESSAGE, fetchWithAuth, isJsonApiRecord, readSuccessBody } from './httpClient'

// fe7 (F15 follow-up): `expectBody` turns an empty or unreadable 2xx on a write into an error instead
// of resolving `undefined`, which callers treated as "saved".
vi.mock('@/auth/authService', () => ({
  getAccessToken: vi.fn(), refreshAccessToken: vi.fn(), cognitoLogout: vi.fn(),
}))

afterEach(() => vi.unstubAllGlobals())

const respondWith = (body: string | null, status = 200) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status })))

const write = (expectBody: Parameters<typeof fetchWithAuth>[0]['expectBody']) =>
  fetchWithAuth({ path: '/api/Thing/7', method: 'PATCH', body: { data: {} }, token: 'fixture', expectBody })

describe('fetchWithAuth expectBody', () => {
  it.each([
    ['an empty 200', '', 200],
    ['a whitespace-only 200', ' \n', 200],
    ['a 204', null, 204],
  ])('rejects %s as not confirmed, with details', async (_label, body, status) => {
    respondWith(body, status)
    const error = await write(true).catch((caught: unknown) => caught)
    expect(isAppError(error)).toBe(true)
    expect(error).toMatchObject({
      message: WRITE_NOT_CONFIRMED_MESSAGE,
      status: 502,
      code: 'API_ERROR',
      details: { reason: 'empty response', method: 'PATCH', path: '/api/Thing/7', status },
    })
  })

  it('rejects invalid JSON and JSON null as not confirmed', async () => {
    respondWith('<html>proxy</html>')
    await expect(write(true)).rejects.toMatchObject({
      message: WRITE_NOT_CONFIRMED_MESSAGE,
      details: { reason: 'invalid JSON response', body: '<html>proxy</html>' },
    })
    respondWith('null')
    await expect(write(true)).rejects.toMatchObject({
      message: WRITE_NOT_CONFIRMED_MESSAGE,
      details: { reason: 'unexpected response', body: null },
    })
  })

  it('rejects a body the validator does not accept, and resolves one it does', async () => {
    respondWith('{"status":"ok"}')
    await expect(write(isJsonApiRecord)).rejects.toMatchObject({
      message: WRITE_NOT_CONFIRMED_MESSAGE,
      details: { reason: 'unexpected response', body: { status: 'ok' } },
    })
    respondWith('{"data":{"id":"7","type":"Thing","attributes":{}}}')
    await expect(write(isJsonApiRecord)).resolves.toEqual({ data: { id: '7', type: 'Thing', attributes: {} } })
    respondWith('{"anything":1}')
    await expect(write(true)).resolves.toEqual({ anything: 1 })
  })

  it('still reports the server error for a non-2xx', async () => {
    respondWith('{"message":"Duplicate key"}', 409)
    await expect(write(true)).rejects.toMatchObject({ status: 409, message: 'Duplicate key' })
  })

  it('leaves callers without expectBody unchanged', async () => {
    respondWith('')
    await expect(write(undefined)).resolves.toBeUndefined()
    respondWith('not json')
    await expect(write(undefined)).rejects.toMatchObject({
      message: 'The server returned an invalid JSON response. Please try again.',
      status: 200,
    })
  })

  it('readSuccessBody applies the same check to raw responses (uploads)', async () => {
    await expect(
      readSuccessBody(new Response(''), { method: 'POST', path: '/upload_files', expectBody: true }),
    ).rejects.toMatchObject({ message: WRITE_NOT_CONFIRMED_MESSAGE, details: { path: '/upload_files' } })
    await expect(
      readSuccessBody(new Response('{"file_path":"a"}'), { method: 'POST', path: '/upload_files', expectBody: true }),
    ).resolves.toEqual({ file_path: 'a' })
  })
})

describe('isJsonApiRecord', () => {
  it.each([
    [{ data: { id: '1' } }, true],
    [{ data: {} }, true],
    [{ data: [] }, false],
    [{ data: null }, false],
    [{ status: 'ok' }, false],
    [undefined, false],
    ['', false],
    [[{ data: {} }], false],
  ])('%j -> %s', (body, expected) => {
    expect(isJsonApiRecord(body)).toBe(expected)
  })
})
