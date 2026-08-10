import type {
  CompanyFromApplication,
  KashrusAddress,
  PlantFromApplication,
  PlantFromApplicationContact,
  SubmittedApplicationContact,
} from '@/types/application'
import type {
  CompanyData,
  CompanyDbRecord,
  ComparisonStatus,
  PlantData,
  PlantDbRecord,
  RawKashrusAddress,
} from '@/features/prelim/model/resolution'
import type { Task } from '@/types/application'

export const isResolvePlantTask = (taskName?: string) => /^ResolvePlant\d*$/.test(taskName ?? '')

export const findPrelimResolutionTask = (
  tasks: Task[],
  dashboardTaskName?: string,
): Task | undefined => {
  if (dashboardTaskName === 'ResolveCompany') {
    return tasks.find((task) => task.name === 'ResolveCompany')
  }

  if (!isResolvePlantTask(dashboardTaskName)) return undefined

  const exactMatch = tasks.find((task) => task.name === dashboardTaskName)
  if (exactMatch) return exactMatch

  const plantTasks = tasks.filter((task) => isResolvePlantTask(task.name))
  const suffix = dashboardTaskName?.match(/^ResolvePlant(\d+)$/)?.[1]
  const plantIndex = suffix ? Math.max(Number(suffix) - 1, 0) : 0

  return plantTasks[plantIndex]
}

const hasSubmittedContactValue = (contact: SubmittedApplicationContact) =>
  [
    contact.contactFirst,
    contact.contactLast,
    contact.contactPhone,
    contact.contactEmail,
    contact.jobTitle,
    contact.jobTitle1,
    contact.note,
  ].some((value) => (value ?? '').trim() !== '')

const toSubmittedContact = (contact?: SubmittedApplicationContact) => {
  if (!contact) return undefined

  return {
    name: `${pickFirstNonEmpty(contact.contactFirst)} ${pickFirstNonEmpty(
      contact.contactLast,
    )}`.trim(),
    title: pickFirstNonEmpty(contact.jobTitle, contact.jobTitle1, contact.note),
    phone: pickFirstNonEmpty(contact.contactPhone),
    email: pickFirstNonEmpty(contact.contactEmail),
  }
}

const firstSubmittedContact = (...groups: Array<SubmittedApplicationContact[] | undefined>) =>
  groups.flatMap((group) => group ?? []).find(hasSubmittedContactValue)

export function toCompanyDrawerData(data?: CompanyFromApplication): CompanyData {
  const contactGroups = data?.companyContacts
  const primaryRaw = firstSubmittedContact(
    contactGroups?.primaryContact,
    contactGroups?.PrimaryContact,
  )
  const billingRaw = firstSubmittedContact(
    contactGroups?.billingContact,
    contactGroups?.BillingContact,
  )

  return {
    companyName: data?.companyName ?? '',
    companyAddress: pickFirstNonEmpty(data?.companyAddress, data?.Street1),
    companyAddress2: pickFirstNonEmpty(data?.companyAddress2, data?.Street2),
    companyCity: pickFirstNonEmpty(data?.companyCity, data?.City),
    companyState: pickFirstNonEmpty(data?.companyState, data?.State),
    ZipPostalCode: pickFirstNonEmpty(data?.ZipPostalCode, data?.Zip),
    companyCountry: pickFirstNonEmpty(data?.companyCountry, data?.Country),
    companyPhone: data?.companyPhone ?? '',
    companyWebsite: data?.companyWebsite ?? '',
    numberOfPlants: data?.numberOfPlants,
    whichCategory: data?.whichCategory,
    primaryContact: toSubmittedContact(primaryRaw),
    billingContact: toSubmittedContact(billingRaw),
  }
}

const parsePlantAddress = (address?: string) => {
  const value = (address ?? '').trim()
  if (!value) {
    return { street: '', city: '', state: '', zip: '', country: '' }
  }

  const normalized = value.replace(/\s+/g, ' ')
  const match = normalized.match(
    /^(.*?),\s*([^,]+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)(?:\s+([A-Za-z]{2,}))?$/,
  )

  return match
    ? {
        street: match[1] ?? '',
        city: match[2] ?? '',
        state: match[3] ?? '',
        zip: match[4] ?? '',
        country: match[5] ?? '',
      }
    : { street: normalized, city: '', state: '', zip: '', country: '' }
}

export function toPlantDrawerData(data?: PlantFromApplication, companyWebsite?: string): PlantData {
  const parsedAddress = parsePlantAddress(data?.Address)
  const contactGroups = data?.plantContacts
  const primaryRaw = firstSubmittedContact(
    contactGroups?.PrimaryContact,
    contactGroups?.primaryContact,
  )
  const secondaryContactEntry = Object.entries(contactGroups ?? {}).find(
    ([groupName, contacts]) =>
      groupName.toLowerCase() !== 'primarycontact' &&
      Array.isArray(contacts) &&
      contacts.some(hasSubmittedContactValue),
  )
  const secondaryRaw = firstSubmittedContact(
    secondaryContactEntry?.[1] as SubmittedApplicationContact[] | undefined,
  )
  const secondaryContactLabel = secondaryContactEntry?.[0]
    ?.replace(/contact$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()

  return {
    plantName: data?.plantName ?? '',
    plantAddress: pickFirstNonEmpty(data?.plantAddress, data?.Street1, parsedAddress.street),
    plantCity: pickFirstNonEmpty(data?.plantCity, data?.City, parsedAddress.city),
    plantState: pickFirstNonEmpty(data?.plantState, data?.State, parsedAddress.state),
    plantZip: pickFirstNonEmpty(data?.plantZip, data?.Zip, parsedAddress.zip),
    plantCountry: pickFirstNonEmpty(data?.plantCountry, data?.Country, parsedAddress.country),
    companyWebsite: companyWebsite ?? '',
    plantNumber: data?.plantNumber,
    processDescription: data?.brieflySummarize ?? '',
    primaryContact: toSubmittedContact(primaryRaw),
    marketingContact: toSubmittedContact(secondaryRaw),
    secondaryContactLabel,
  }
}

export const createDefaultCompanyData = (): CompanyData => ({
  companyName: '',
  companyAddress: '',
  companyAddress2: '',
  companyCity: '',
  companyState: '',
  ZipPostalCode: '',
  companyCountry: '',
  companyPhone: '',
  companyWebsite: '',
  numberOfPlants: undefined,
  whichCategory: '',
  primaryContact: {
    name: '',
    title: '',
    phone: '',
    email: '',
  },
  billingContact: {
    name: '',
    title: '',
    phone: '',
    email: '',
  },
})

export const createDefaultPlantData = (): PlantData => ({
  plantName: '',
  plantAddress: '',
  plantCity: '',
  plantState: '',
  plantZip: '',
  plantCountry: '',
  companyWebsite: '',
  plantNumber: undefined,
  processDescription: '',
  primaryContact: {
    name: '',
    title: '',
    phone: '',
    email: '',
  },
  marketingContact: {
    name: '',
    title: '',
    phone: '',
    email: '',
  },
})

export const cloneCompanyData = (value?: Partial<CompanyData>): CompanyData => ({
  ...createDefaultCompanyData(),
  ...value,
  primaryContact: {
    ...createDefaultCompanyData().primaryContact,
    ...(value?.primaryContact ?? {}),
  },
  billingContact: {
    ...createDefaultCompanyData().billingContact,
    ...(value?.billingContact ?? {}),
  },
})

export const clonePlantData = (value?: Partial<PlantData>): PlantData => ({
  ...createDefaultPlantData(),
  ...value,
  primaryContact: {
    ...createDefaultPlantData().primaryContact,
    ...(value?.primaryContact ?? {}),
  },
  marketingContact: {
    ...createDefaultPlantData().marketingContact,
    ...(value?.marketingContact ?? {}),
  },
})

const normalizeForCompare = (value?: string) => (value ?? '').trim()

const hasChanged = (before?: string, after?: string) =>
  normalizeForCompare(before) !== normalizeForCompare(after)

export const countUpdatedCompanyFields = (before: CompanyData, after: CompanyData) => {
  const checks = [
    hasChanged(before.companyName, after.companyName),
    hasChanged(before.companyAddress, after.companyAddress),
    hasChanged(before.companyCity, after.companyCity),
    hasChanged(before.companyCountry, after.companyCountry),
    hasChanged(before.companyWebsite, after.companyWebsite),
    hasChanged(before.primaryContact?.name, after.primaryContact?.name),
    hasChanged(before.primaryContact?.title, after.primaryContact?.title),
    hasChanged(before.primaryContact?.phone, after.primaryContact?.phone),
    hasChanged(before.primaryContact?.email, after.primaryContact?.email),
    hasChanged(before.billingContact?.name, after.billingContact?.name),
    hasChanged(before.billingContact?.title, after.billingContact?.title),
    hasChanged(before.billingContact?.phone, after.billingContact?.phone),
    hasChanged(before.billingContact?.email, after.billingContact?.email),
  ]
  return checks.filter(Boolean).length
}

export const countUpdatedPlantFields = (before: PlantData, after: PlantData) => {
  const checks = [
    hasChanged(before.plantName, after.plantName),
    hasChanged(before.plantAddress, after.plantAddress),
    hasChanged(before.plantCity, after.plantCity),
    hasChanged(before.processDescription, after.processDescription),
    hasChanged(before.primaryContact?.name, after.primaryContact?.name),
    hasChanged(before.primaryContact?.title, after.primaryContact?.title),
    hasChanged(before.primaryContact?.phone, after.primaryContact?.phone),
    hasChanged(before.primaryContact?.email, after.primaryContact?.email),
    hasChanged(before.marketingContact?.name, after.marketingContact?.name),
    hasChanged(before.marketingContact?.title, after.marketingContact?.title),
    hasChanged(before.marketingContact?.phone, after.marketingContact?.phone),
    hasChanged(before.marketingContact?.email, after.marketingContact?.email),
  ]
  return checks.filter(Boolean).length
}

export const getComparisonStatus = (
  appValue: string | undefined,
  dbValue: string | undefined,
): ComparisonStatus => {
  if (!appValue && !dbValue) return 'empty'
  if (!dbValue || dbValue === 'Not on file') return 'not-on-file'
  if (!appValue) return 'empty'

  const normalizeText = (str: string) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')

  const normalizePhone = (str: string) => str.replace(/\D/g, '')

  const isPhoneLike = (str: string) => {
    const trimmed = str.trim()
    if (!trimmed) return false
    if (/[a-z]/i.test(trimmed)) return false
    return normalizePhone(trimmed).length >= 7
  }

  const appRaw = appValue.trim()
  const dbRaw = dbValue.trim()

  const areEqual =
    isPhoneLike(appRaw) && isPhoneLike(dbRaw)
      ? normalizePhone(appRaw) === normalizePhone(dbRaw)
      : normalizeText(appRaw) === normalizeText(dbRaw)

  return areEqual ? 'match' : 'mismatch'
}

export const pickFirstNonEmpty = (...values: Array<string | undefined>) =>
  values.find((value) => (value ?? '').trim() !== '') ?? ''

const toYesNo = (value?: string | boolean) => {
  if (typeof value === 'boolean') return value ? 'Y' : 'N'
  return (value ?? '').trim().toUpperCase()
}

export const getCompanyDbRecord = (companyDbResponse: unknown): CompanyDbRecord | undefined => {
  if (Array.isArray(companyDbResponse)) {
    return companyDbResponse[0] as CompanyDbRecord | undefined
  }

  if (
    companyDbResponse &&
    typeof companyDbResponse === 'object' &&
    Array.isArray((companyDbResponse as { data?: unknown[] }).data)
  ) {
    return (companyDbResponse as { data: CompanyDbRecord[] }).data[0]
  }

  return undefined
}

export const getPlantDbRecord = (plantDbResponse: unknown): PlantDbRecord | undefined => {
  if (Array.isArray(plantDbResponse)) {
    return plantDbResponse[0] as PlantDbRecord | undefined
  }

  if (
    plantDbResponse &&
    typeof plantDbResponse === 'object' &&
    Array.isArray((plantDbResponse as { data?: unknown[] }).data)
  ) {
    return (plantDbResponse as { data: PlantDbRecord[] }).data[0]
  }

  return undefined
}

const mapAddress = (address: RawKashrusAddress): KashrusAddress => ({
  street: address.STREET1,
  line2: pickFirstNonEmpty(address.STREET2, address.STREET3),
  city: address.CITY,
  state: address.STATE,
  zip: address.ZIP,
  country: address.COUNTRY,
  type: address.TYPE,
})

export const getPhysicalAddress = (addresses?: RawKashrusAddress[]): KashrusAddress | undefined => {
  if (!addresses?.length) return undefined
  const physicalAddress =
    addresses.find((addr) => (addr.TYPE ?? '').trim().toLowerCase() === 'physical') ?? addresses[0]
  return mapAddress(physicalAddress)
}

export const getCompanyName = (companyDb?: CompanyDbRecord) =>
  pickFirstNonEmpty(companyDb?.companytdetails?.[0]?.NAME, companyDb?.companyName)

export const getPlantName = (plantDb?: PlantDbRecord) =>
  pickFirstNonEmpty(plantDb?.plantdetails?.[0]?.NAME, plantDb?.plantName)

export const formatAddressStreet = (address?: KashrusAddress) =>
  [address?.street, address?.line2].filter((v) => (v ?? '').trim() !== '').join(', ')

export const formatAddressCityStateZip = (address?: KashrusAddress) => {
  if (!address) return ''
  return [address.city, address.state, address.zip]
    .filter((v) => (v ?? '').trim() !== '')
    .join(', ')
}

export const formatContactName = (contact?: PlantFromApplicationContact) =>
  `${contact?.FirstName ?? ''} ${contact?.LastName ?? ''}`.trim()

export const getPrimaryContact = (contacts?: PlantFromApplicationContact[]) => {
  if (!contacts?.length) return undefined
  return contacts.find((contact) => hasContactRole(contact, 'PrimaryCT')) ?? contacts[0]
}

const hasContactRole = (contact: PlantFromApplicationContact, role: 'PrimaryCT' | 'BillingCT') => {
  if (toYesNo(contact[role]) === 'Y') return true

  const links = (contact as { cc?: Array<Record<string, string | boolean | undefined>> }).cc
  return links?.some((link) => toYesNo(link[role]) === 'Y') ?? false
}

export const getBillingContact = (
  contacts?: PlantFromApplicationContact[],
  options: { fallbackToSecondary?: boolean } = {},
) => {
  if (!contacts?.length) return undefined
  const billingContact = contacts.find((contact) => hasContactRole(contact, 'BillingCT'))
  if (billingContact || options.fallbackToSecondary === false) return billingContact

  return contacts.find((contact) => !hasContactRole(contact, 'PrimaryCT')) ?? contacts[0]
}
