import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveCompanyFromApplication, resolvePlantFromApplication } from '../api'
import { fetchWithAuth } from '@/shared/api/httpClient'
import {
  createDefaultCompanyData,
  createDefaultPlantData,
  omitIgnoredResolutionContacts,
  toPlantDrawerData,
} from './prelimResolution'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

describe.each([true, false])('ignored resolution contacts (create new: %s)', (createNew) => {
  it.each([false, true])('posts submitted Other Contact under other_contact (ignored: %s)', async (ignored) => {
    const data = toPlantDrawerData({
      plantName: 'Example Plant',
      plantAddress: '',
      plantCity: '',
      plantCountry: '',
      plantContacts: {
        PrimaryContact: [{ contactFirst: 'Primary', contactLast: 'Person' }],
        OtherContact: [{ contactFirst: 'Other', contactLast: 'Person', contactEmail: 'other@example.com' }],
      },
    })
    await resolvePlantFromApplication({
      applicationId: 1,
      taskInstanceId: 2,
      companyId: 3,
      plantId: 4,
      createNewPlant: createNew,
      plantData: omitIgnoredResolutionContacts(data, { marketingContact: ignored }),
    })
    const body = vi.mocked(fetchWithAuth).mock.calls[0][0].body
    expect(body).toHaveProperty('primary_contact.FirstName', 'Primary')
    expect(body).not.toHaveProperty('billing_contact')
    if (ignored) {
      expect(body).not.toHaveProperty('other_contact')
    } else {
      expect(body).toHaveProperty('other_contact.FirstName', 'Other')
      expect(body).toHaveProperty('other_contact.Email', 'other@example.com')
      expect(body).toHaveProperty('other_contact.OtherCT', 1)
    }
  })

  it.each(['primaryContact', 'billingContact'] as const)(
    'omits company %s and preserves the other contact',
    async (key) => {
      const data = {
        ...createDefaultCompanyData(),
        primaryContact: { name: 'Primary Person' },
        billingContact: { name: 'Billing Person' },
      }
      await resolveCompanyFromApplication({
        applicationId: 1,
        taskInstanceId: 2,
        companyId: 3,
        createNewCompany: createNew,
        companyData: omitIgnoredResolutionContacts(data, { [key]: true }),
      })
      const body = vi.mocked(fetchWithAuth).mock.calls[0][0].body
      expect(body).not.toHaveProperty(
        key === 'primaryContact' ? 'primary_contact' : 'billing_contact',
      )
      expect(body).toHaveProperty(key === 'primaryContact' ? 'billing_contact' : 'primary_contact')
      expect(data[key].name).toBeTruthy()
    },
  )

  it.each(['primaryContact', 'marketingContact'] as const)(
    'omits plant %s and preserves the other contact',
    async (key) => {
      const data = {
        ...createDefaultPlantData(),
        primaryContact: { name: 'Primary Person' },
        marketingContact: { name: 'Marketing Person' },
      }
      await resolvePlantFromApplication({
        applicationId: 1,
        taskInstanceId: 2,
        companyId: 3,
        plantId: 4,
        createNewPlant: createNew,
        plantData: omitIgnoredResolutionContacts(data, { [key]: true }),
      })
      const body = vi.mocked(fetchWithAuth).mock.calls[0][0].body
      expect(body).not.toHaveProperty(
        key === 'primaryContact' ? 'primary_contact' : 'billing_contact',
      )
      expect(body).toHaveProperty(key === 'primaryContact' ? 'billing_contact' : 'primary_contact')
      expect(data[key].name).toBeTruthy()
    },
  )

  it('omits both contacts and restores them when Ignore is cleared', async () => {
    const data = {
      ...createDefaultCompanyData(),
      primaryContact: { name: 'Primary Person' },
      billingContact: { name: 'Billing Person' },
    }
    for (const ignored of [true, false]) {
      await resolveCompanyFromApplication({
        applicationId: 1,
        taskInstanceId: 2,
        companyId: 3,
        createNewCompany: createNew,
        companyData: omitIgnoredResolutionContacts(data, {
          primaryContact: ignored,
          billingContact: ignored,
        }),
      })
      const body = vi.mocked(fetchWithAuth).mock.lastCall?.[0].body
      if (ignored) {
        expect(body).not.toHaveProperty('primary_contact')
        expect(body).not.toHaveProperty('billing_contact')
      } else {
        expect(body).toHaveProperty('primary_contact.FirstName', 'Primary')
        expect(body).toHaveProperty('billing_contact.FirstName', 'Billing')
      }
    }
  })
})
