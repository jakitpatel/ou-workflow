import { beforeEach, expect, it, vi } from 'vitest'
import * as api from './index'

// w5 items 3 and 4: the dead updateScheduleAIngredientDeleted (always 405) is gone; the ingredient upload sends
// application_id, which /ingredient_file_upload now resolves to the application's submission plant.
const mocks = vi.hoisted(() => ({ execute: vi.fn() }))
vi.mock('@/shared/api/httpClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/httpClient')>()),
  executeRequest: mocks.execute,
}))

beforeEach(() => {
  mocks.execute.mockReset().mockResolvedValue(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }))
})

it('no longer exports the dead Schedule A delete call', () => {
  expect('updateScheduleAIngredientDeleted' in api).toBe(false)
})

it('uploads the spreadsheet with the application id', async () => {
  const file = new File(['x'], 'FIX-w5.xlsx')
  await expect(api.uploadScheduleAIngredientsFile({ applicationId: 983, file, token: 'token' })).resolves.toEqual({
    message: 'ok',
  })

  const [url, init] = mocks.execute.mock.calls[0]
  expect(String(url)).toMatch(/\/ingredient_file_upload$/)
  const form = init.body as FormData
  expect(form.get('application_id')).toBe('983')
  expect((form.get('file') as File).name).toBe('FIX-w5.xlsx')
  expect(init.headers).toEqual({ Authorization: 'Bearer token' })
})
