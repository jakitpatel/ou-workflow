import type { CompanyDbRecord, PlantDbRecord } from '../model/resolution'

export function getResolutionDbContacts(
  company?: CompanyDbRecord,
  plant?: PlantDbRecord,
  secondaryContactLabel?: string,
) {
  const groups = plant?.plantContacts
  const groupName = `${(secondaryContactLabel || 'billing').replace(/\s/g, '').toLowerCase()}contact`
  const matchingGroup = Object.entries(groups ?? {}).find(([key]) => key.toLowerCase() === groupName)?.[1]

  return {
    dbCompanyPrimaryContact: company?.companyContacts?.primaryContact?.[0],
    dbCompanyBillingContact: company?.companyContacts?.billingContact?.[0],
    dbPlantPrimaryContact: groups?.primaryContact?.[0],
    // Older marketing sections used the billing group. Other must never show a
    // billing contact in place of a missing Other contact.
    dbPlantMarketingContact: matchingGroup?.[0] ??
      (groupName === 'marketingcontact' ? groups?.billingContact?.[0] : undefined),
  }
}
