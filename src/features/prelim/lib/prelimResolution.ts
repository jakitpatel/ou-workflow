import type { KashrusAddress, PlantFromApplicationContact } from '@/types/application'
import type {
  CompanyData,
  CompanyDbRecord,
  ComparisonStatus,
  PlantData,
  PlantDbRecord,
  RawKashrusAddress,
} from '@/features/prelim/model/resolution'

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
  dbValue: string | undefined
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

const toYesNo = (value?: string) => (value ?? '').trim().toUpperCase()

export const getCompanyDbRecord = (
  companyDbResponse: unknown
): CompanyDbRecord | undefined => {
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

export const getPhysicalAddress = (
  addresses?: RawKashrusAddress[]
): KashrusAddress | undefined => {
  if (!addresses?.length) return undefined
  const physicalAddress =
    addresses.find((addr) => (addr.TYPE ?? '').trim().toLowerCase() === 'physical') ??
    addresses[0]
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
  return contacts.find((contact) => toYesNo(contact.PrimaryCT) === 'Y') ?? contacts[0]
}

export const getBillingContact = (contacts?: PlantFromApplicationContact[]) => {
  if (!contacts?.length) return undefined
  return (
    contacts.find((contact) => toYesNo(contact.BillingCT) === 'Y') ??
    contacts.find((contact) => toYesNo(contact.PrimaryCT) !== 'Y') ??
    contacts[0]
  )
}
