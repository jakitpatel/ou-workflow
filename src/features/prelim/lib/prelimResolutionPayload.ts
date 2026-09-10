import type { CompanyData, PlantData, ResolutionContactData } from '../model/resolution'

type ResolveAddressPayload = {
  type: string
  attn: string
  street1: string
  street2: string
  city: string
  state: string
  zip: string
  country: string
}

type ResolveContactPayload = {
  CompanyTitle: string
  PrimaryCT: number
  BillingCT: number
  WebCT: number
  OtherCT: number
  Title: string
  FirstName: string
  LastName: string
  Voice: string
  Fax: string
  Email: string
  Cell: string
}

type ResolveCompanyPayload = {
  application_id: string | number
  task_instance_id: string | number
  company_id?: string | number | null
  company_name: string
  website: string
  address?: ResolveAddressPayload
  primary_contact?: ResolveContactPayload
  billing_contact?: ResolveContactPayload
}

type ResolvePlantPayload = {
  application_id: string | number
  task_instance_id: string | number
  company_id?: string | number | null
  plant_id?: string | number
  other_contact?: ResolveContactPayload
  plant_name: string
  website: string
  address?: ResolveAddressPayload
  primary_contact?: ResolveContactPayload
  billing_contact?: ResolveContactPayload
}

export function splitContactName(fullName?: string) {
  const normalized = (fullName ?? '').trim().replace(/\s+/g, ' ')
  if (!normalized) {
    return {
      firstName: '',
      lastName: '',
    }
  }

  const [firstName = '', ...lastNameParts] = normalized.split(' ')
  return {
    firstName,
    lastName: lastNameParts.join(' '),
  }
}

function buildResolveContactPayload(
  contact: ResolutionContactData | undefined,
  flags: Pick<ResolveContactPayload, 'PrimaryCT' | 'BillingCT' | 'WebCT' | 'OtherCT'>,
): ResolveContactPayload | undefined {
  const { firstName, lastName } = splitContactName(contact?.name)
  if (!firstName && !lastName) return undefined

  return {
    CompanyTitle: contact?.title ?? '',
    PrimaryCT: flags.PrimaryCT,
    BillingCT: flags.BillingCT,
    WebCT: flags.WebCT,
    OtherCT: flags.OtherCT,
    Title: contact?.title ?? '',
    FirstName: firstName,
    LastName: lastName,
    Voice: contact?.phone ?? '',
    Fax: '',
    Email: contact?.email ?? '',
    Cell: contact?.phone ?? '',
  }
}

export function buildResolveCompanyPayload({
  applicationId,
  taskInstanceId,
  companyData,
  companyId,
  createNewCompany,
}: {
  applicationId: string | number
  taskInstanceId: string | number
  companyData: CompanyData
  companyId?: string | number
  createNewCompany: boolean
}): ResolveCompanyPayload {
  const primaryContact = buildResolveContactPayload(companyData.primaryContact, {
    PrimaryCT: createNewCompany ? 1 : 0,
    BillingCT: 0,
    WebCT: companyData.createPrimaryWebContact ? 1 : 0,
    OtherCT: createNewCompany ? 0 : 1,
  })
  const billingContact = buildResolveContactPayload(companyData.billingContact, {
    PrimaryCT: 0,
    BillingCT: createNewCompany ? 1 : 0,
    WebCT: 0,
    OtherCT: createNewCompany ? 0 : 1,
  })

  return {
    application_id: applicationId,
    task_instance_id: taskInstanceId,
    ...(createNewCompany || companyId == null ? {} : { company_id: companyId }),
    company_name: companyData.companyName,
    website: companyData.companyWebsite ?? '',
    ...(createNewCompany
      ? {
          address: {
            type: 'Physical',
            attn: '',
            street1: companyData.companyAddress,
            street2: companyData.companyAddress2 ?? '',
            city: companyData.companyCity,
            state: companyData.companyState ?? '',
            zip: companyData.ZipPostalCode ?? '',
            country: companyData.companyCountry,
          },
        }
      : {}),
    ...(primaryContact ? { primary_contact: primaryContact } : {}),
    ...(billingContact ? { billing_contact: billingContact } : {}),
  }
}

export function buildResolvePlantPayload({
  applicationId,
  taskInstanceId,
  companyId,
  plantId,
  plantData,
  createNewPlant,
}: {
  applicationId: string | number
  taskInstanceId: string | number
  companyId?: string | number
  plantId?: string | number
  plantData: PlantData
  createNewPlant: boolean
}): ResolvePlantPayload {
  const primaryContact = buildResolveContactPayload(plantData.primaryContact, {
    PrimaryCT: createNewPlant ? 1 : 0,
    BillingCT: 0,
    WebCT: 0,
    OtherCT: createNewPlant ? 0 : 1,
  })
  const secondaryContact = buildResolveContactPayload(plantData.marketingContact, {
    PrimaryCT: 0,
    BillingCT: 0,
    WebCT: 0,
    OtherCT: 1,
  })

  return {
    application_id: applicationId,
    task_instance_id: taskInstanceId,
    company_id: companyId == null || String(companyId).trim() === '' ? null : companyId,
    ...(createNewPlant || plantId == null ? {} : { plant_id: plantId }),
    plant_name: plantData.plantName,
    website: plantData.companyWebsite ?? '',
    ...(createNewPlant
      ? {
          address: {
            type: 'Physical',
            attn: '',
            street1: plantData.plantAddress,
            street2: '',
            city: plantData.plantCity,
            state: plantData.plantState ?? '',
            zip: plantData.plantZip ?? '',
            country: plantData.plantCountry,
          },
        }
      : {}),
    ...(primaryContact ? { primary_contact: primaryContact } : {}),
    ...(secondaryContact
      ? /^other(?:\s*contact)?$/i.test(plantData.secondaryContactLabel?.trim() ?? '')
        ? { other_contact: secondaryContact }
        : { billing_contact: secondaryContact }
      : {}),
  }
}
