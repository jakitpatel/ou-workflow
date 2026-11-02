import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createApplicationMessage,
  sendMsgTask,
  updateApplicationMessage,
  uploadApplicationFile,
  uploadScheduleAIngredientsFile,
} from '@/features/applications/api'
import { saveApplicationGlobalData } from '@/features/applications/api/globalData'
import { deleteScheduleIngredient, patchScheduleIngredient } from '@/features/applications/api/scheduleIngredientMutations'
import { deleteScheduleProduct, patchScheduleProduct } from '@/features/applications/api/scheduleProductMutations'
import {
  createCompanyAddressFromApplication,
  createCompanyContactLinkFromApplication,
  createContactFromApplication,
  createOrUpdateCompanyFromApplication,
  createOrUpdatePlantFromApplication,
  createPlantAddressFromApplication,
  createPlantContactLinkFromApplication,
  createSubmissionApplication,
  deleteSubmissionApplication,
  saveResolveTaskState,
} from '@/features/prelim/api'
import { markPrelimApplicationLegacy } from '@/features/prelim/api/markLegacy'
import { saveProfileLayout } from '@/features/profile/api'
import { scheduleVisit } from '@/features/tasks/api/scheduleVisit'

// fe7 (F15 follow-up): every write below used to resolve `undefined` on an empty 2xx, and its
// caller closed the editor / showed success with nothing saved. Each now rejects with the shared
// "not confirmed" error, and still resolves the server's real success body.
vi.mock('@/auth/authService', () => ({
  getAccessToken: vi.fn(() => 'fixture'), refreshAccessToken: vi.fn(), cognitoLogout: vi.fn(),
}))

const NOT_CONFIRMED = 'The server did not confirm the change. Nothing was saved.'
const token = 'fixture'
const record = (type: string, id = '7') => ({ data: { id, type, attributes: {} } })
const appValue = {} as never
const file = () => new File(['x'], 'FIX-fe7.txt', { type: 'text/plain' })

afterEach(() => vi.unstubAllGlobals())

const respondWith = (body: string, status = 200) => {
  const fetchMock = vi.fn(async () => new Response(body, { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

type Case = [name: string, call: () => Promise<unknown>, success: unknown]

const cases: Case[] = [
  ['patchScheduleIngredient', () => patchScheduleIngredient('255', '2144', {
    ingredientLabelName: 'Salt', manufacturer: '', source: '', brandName: '', rawMaterialCode: '', certifyingAgency: '',
  }, token), record('ScheduleIngredient', '255')],
  ['deleteScheduleIngredient', () => deleteScheduleIngredient('255', token), record('ScheduleIngredient', '255')],
  ['patchScheduleProduct', () => patchScheduleProduct('218', '2144', {
    productName: 'Bread', BrandName: '', privateLabelCo: '', privateLabel: false, Retail: true, Industrial: false,
    bulkShipped: '', list: '', symbol: '', internal_use_only: '', passover: '', UPC: '',
  }, token), record('ScheduleProduct', '218')],
  ['deleteScheduleProduct', () => deleteScheduleProduct('218', token), record('ScheduleProduct', '218')],
  ['saveApplicationGlobalData', () => saveApplicationGlobalData({
    applicationId: 2144, taskInstanceId: 1, jsonData: { k: 'v' }, token,
  }), { status: 'ok', message: 'Global data [{}] updated successfully' }],
  ['markPrelimApplicationLegacy', () => markPrelimApplicationLegacy(2151, token), record('WFApplication', '2151')],
  ['saveProfileLayout', () => saveProfileLayout({ token, username: 'u', profileLayout: '{}' }), record('WFUserProfile')],
  ['createOrUpdateCompanyFromApplication', () => createOrUpdateCompanyFromApplication({ appValue, token }), record('COMPANYTB')],
  ['createOrUpdatePlantFromApplication', () => createOrUpdatePlantFromApplication({ appValue, token }), record('PLANTTB')],
  ['createCompanyAddressFromApplication', () => createCompanyAddressFromApplication({ appValue, companyId: 1, token }), record('COMPANYADDRESSTB')],
  ['createPlantAddressFromApplication', () => createPlantAddressFromApplication({ appValue, plantId: 1, token }), record('PLANTADDRESSTB')],
  ['createContactFromApplication', () => createContactFromApplication({ appValue, token }), record('Contacts')],
  ['createCompanyContactLinkFromApplication', () => createCompanyContactLinkFromApplication({
    companyId: 1, contactId: 2, isPrimary: true, isBilling: false, isOther: false, token,
  }), record('CompanyContactTB')],
  ['createPlantContactLinkFromApplication', () => createPlantContactLinkFromApplication({
    ownsId: 1, contactId: 2, isPrimary: true, isBilling: false, isWeb: false, isOther: false, token,
  }), record('PlantContacts')],
  ['saveResolveTaskState', () => saveResolveTaskState({
    taskInstanceId: 9, savedState: { resolveId: { companyId: 1 }, resolveMethod: 'Selected' } as never, token,
  }), record('TaskInstance', '9')],
  ['createSubmissionApplication', () => createSubmissionApplication({ applicationId: 465, token }),
    { status: 'submission application created successfully', application_id: 2151 }],
  ['deleteSubmissionApplication', () => deleteSubmissionApplication({ applicationId: 2151, token }),
    { result: 'Cleanup completed for Application ID: 2151 ' }],
  ['sendMsgTask', () => sendMsgTask({ newMessage: { data: { attributes: {}, type: 'WFApplicationMessage' } }, token }),
    record('WFApplicationMessage')],
  ['createApplicationMessage', () => createApplicationMessage({ payload: { MessageText: 'x' }, token }), record('WFApplicationMessage')],
  ['updateApplicationMessage', () => updateApplicationMessage({ messageId: 7, payload: { MessageType: 'Email' }, token }),
    record('WFApplicationMessage')],
  ['uploadApplicationFile', () => uploadApplicationFile({ file: file(), applicationId: 2144, token }),
    { message: 'File uploaded and task completed successfully', file_path: 'FIX-fe7/x.txt', link: '/file/1' }],
  ['uploadScheduleAIngredientsFile', () => uploadScheduleAIngredientsFile({ applicationId: 2144, file: file(), token }),
    { message: "Ingredients File 'x.xlsx' uploaded successfully for SubmissionPlantId: 1" }],
  ['scheduleVisit', () => scheduleVisit({ visitId: '5', visitDate: '2026-11-01', token }),
    { message: 'SCHEDULE visit 5 scheduled on 2026-11-01 for application sent to SQS: {}' }],
]

describe.each(cases)('%s', (_name, call, success) => {
  it('rejects an empty 200 as not confirmed', async () => {
    const fetchMock = respondWith('')
    await expect(call()).rejects.toMatchObject({ message: NOT_CONFIRMED, status: 502 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a 200 whose body is not the success answer', async () => {
    respondWith('{"unexpected":true}')
    await expect(call()).rejects.toMatchObject({ message: NOT_CONFIRMED })
  })

  it("resolves the server's success body", async () => {
    respondWith(JSON.stringify(success), 201)
    await expect(call()).resolves.toEqual(success)
  })
})

describe('kept behaviour', () => {
  it('global data with status other than ok is not a confirmation', async () => {
    respondWith('{"status":"error","message":"nope"}')
    await expect(saveApplicationGlobalData({ applicationId: 1, taskInstanceId: 1, jsonData: {}, token }))
      .rejects.toMatchObject({ message: NOT_CONFIRMED })
  })

  it("scheduleVisit still reports the server's {success:false} error", async () => {
    respondWith('{"success":false,"error":"Visit locked"}')
    await expect(scheduleVisit({ visitId: '5', visitDate: '2026-11-01', token })).rejects.toThrow('Visit locked')
  })
})
