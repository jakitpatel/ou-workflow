import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveCompanyFromApplication } from '../api'
import { fetchWithAuth } from '@/shared/api/httpClient'
import { createDefaultCompanyData, omitIgnoredResolutionContacts } from './prelimResolution'

vi.mock('@/shared/api/httpClient', () => ({ fetchWithAuth: vi.fn() }))
beforeEach(() => vi.clearAllMocks())

describe.each([true, false])('company web contact (create new: %s)', (createNewCompany) => {
  it.each([true, false])('sends the selected web contact flag: %s', async (checked) => {
    await resolveCompanyFromApplication({
      applicationId: 1,
      taskInstanceId: 2,
      companyId: 3,
      createNewCompany,
      companyData: {
        ...createDefaultCompanyData(),
        createPrimaryWebContact: checked,
        primaryContact: { name: 'Primary Person' },
        billingContact: { name: 'Billing Person' },
      },
    })
    const body = vi.mocked(fetchWithAuth).mock.lastCall?.[0].body
    expect(body).toHaveProperty('primary_contact.WebCT', checked ? 1 : 0)
    expect(body).toHaveProperty('billing_contact.WebCT', 0)
  })

  it('does not send an ignored primary contact even when web contact is checked', async () => {
    await resolveCompanyFromApplication({
      applicationId: 1,
      taskInstanceId: 2,
      companyId: 3,
      createNewCompany,
      companyData: omitIgnoredResolutionContacts({
        ...createDefaultCompanyData(),
        createPrimaryWebContact: true,
        primaryContact: { name: 'Primary Person' },
      }, { primaryContact: true }),
    })
    expect(vi.mocked(fetchWithAuth).mock.lastCall?.[0].body).not.toHaveProperty('primary_contact')
  })
})
