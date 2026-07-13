import type {
  KashrusCompanyDetail,
  KashrusPlantDetail,
  PlantFromApplicationContact,
} from '@/types/application'

export type RawKashrusAddress = {
  TYPE?: string
  STREET1?: string
  STREET2?: string
  STREET3?: string
  CITY?: string
  STATE?: string
  ZIP?: string
  COUNTRY?: string
}

export type RawKashrusDetails = {
  NAME?: string
}

export type RawKashrusContact = PlantFromApplicationContact & {
  FirstName?: string
  LastName?: string
  EMail?: string
  Cell?: string
  Voice?: string
  Title?: string
  companytitle?: string
  PrimaryCT?: string
  BillingCT?: string
  cc?: Array<{
    PrimaryCT?: string | boolean
    BillingCT?: string | boolean
  }>
}

export type CompanyDbRecord = KashrusCompanyDetail & {
  companyAddresses?: RawKashrusAddress[]
  companyContacts?: RawKashrusContact[]
  companytdetails?: RawKashrusDetails[]
}

export type PlantDbRecord = KashrusPlantDetail & {
  plantAddresses?: RawKashrusAddress[]
  plantContacts?: RawKashrusContact[]
  plantdetails?: RawKashrusDetails[]
}

export type ResolutionContactData = {
  name?: string
  title?: string
  phone?: string
  email?: string
}

export type CompanyData = {
  companyName: string
  companyAddress: string
  companyAddress2?: string
  companyCity: string
  companyState?: string
  ZipPostalCode?: string
  companyCountry: string
  companyPhone?: string
  companyWebsite?: string
  numberOfPlants?: number
  whichCategory?: string
  primaryContact?: ResolutionContactData
  billingContact?: ResolutionContactData
}

export type PlantData = {
  plantName: string
  plantAddress: string
  plantCity: string
  plantState?: string
  plantZip?: string
  plantCountry: string
  plantNumber?: number
  processDescription?: string
  primaryContact?: ResolutionContactData
  marketingContact?: ResolutionContactData
}

export type Match = {
  Id: string | number
  companyName?: string
  plantName?: string
  Address: string
  City?: string
  Country?: string
  matchRating?: number
  matchReason?: string
  OWNSID?: string | number
  WFID?: string | number
  PlantID?: string | number
}

export type ComparisonStatus = 'match' | 'mismatch' | 'not-on-file' | 'empty'

export type PrelimResolutionDrawerProps = {
  isOpen: boolean
  onClose: () => void
  type: 'company' | 'plant'
  data: CompanyData | PlantData
  matches: Match[]
  onAssign: (match: Match) => void | Promise<void>
  onRefresh?: () => void | Promise<void>
  selectedId?: string | number
  isActionable?: boolean
  taskStatus?: string
  readOnly?: boolean
}
