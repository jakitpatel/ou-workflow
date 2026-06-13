import type { ApplicationDetail, CompanyContact, Plant, PlantContact, UploadedFile } from '@/types/application'

type PrelimCompanyAddress = {
  ZipPostalCode?: string
  companyAddress?: string
  companyCity?: string
  companyCountry?: string
  companyState?: string
}

type PrelimCompanyContact = {
  billingContact?: string
  billingContactEmail?: string
  billingContactFirst?: string
  billingContactLast?: string
  billingContactPhone?: string
  contactEmail?: string
  contactFirst?: string
  contactLast?: string
  contactPhone?: string
  isPrimaryContact?: boolean
  jobTitle?: string
}

type PrelimPlant = {
  PlantId?: number
  brieflySummarize?: string
  contactEmail?: string
  contactFirst?: string
  contactLast?: string
  contactPhone?: string
  jobTitle?: string
  majorCity?: string
  otherProductCompany?: string
  otherProducts?: boolean
  plantAddress?: string
  plantCity?: string
  plantCountry?: string
  plantName?: string
  plantNumber?: number
  plantState?: string
  plantZip?: string
  products?: any[]
  ingredients?: any[]
}

type PrelimProduct = {
  SubmissionProductId?: number
  JotFormProductId?: number
  productName?: string
  BrandName?: string
  inHouse?: boolean
  privateLabel?: boolean
  privateLabelCo?: string
  Industrial?: boolean
  Retail?: boolean
  status?: string
  plantStatus?: string
}

type PrelimIngredient = {
  SubmissionIngredientId?: number
  JotFormIngredientId?: number
  UKDID?: string
  rawMaterialCode?: string
  ingredientLabelName?: string
  manufacturer?: string
  brandName?: string
  packagedOrBulk?: string
  certifyingAgency?: string
  plantStatus?: string
}

type PrelimApplicationDetail = {
  OUCertified?: boolean
  companyAdresses?: PrelimCompanyAddress[]
  companyAddresses?: PrelimCompanyAddress[]
  companyContacts?: PrelimCompanyContact[]
  companyName?: string
  companyPhone?: string
  companyWebsite?: string
  everCertified?: boolean
  externalReferenceId?: number
  files?: UploadedFile[]
  plants?: PrelimPlant[]
  raw_data?: ApplicationDetail['raw_data']
  status?: string
  submissionDate?: string
  submission_files?: any[]
  whichCategory?: string
}

const yesNo = (value?: boolean) => (value ? 'Yes' : 'No')

const formatPersonName = (first?: string, last?: string) =>
  [first, last].filter(Boolean).join(' ').trim()

const mapCompanyContacts = (contacts: PrelimCompanyContact[] = []): CompanyContact[] =>
  contacts.flatMap((contact) => {
    const mappedContacts: CompanyContact[] = [
      {
        email: contact.contactEmail ?? '',
        name: formatPersonName(contact.contactFirst, contact.contactLast),
        phone: contact.contactPhone ?? '',
        role: contact.jobTitle ?? '',
        type: contact.isPrimaryContact ? 'Primary Contact' : 'Company Contact',
      },
    ]

    if (contact.billingContact && contact.billingContact !== 'Same as Company Contact') {
      mappedContacts.push({
        email: contact.billingContactEmail ?? '',
        name: formatPersonName(contact.billingContactFirst, contact.billingContactLast),
        phone: contact.billingContactPhone ?? '',
        role: 'Billing',
        type: 'Billing Contact',
      })
    }

    return mappedContacts
  })

const mapPlant = (plant: PrelimPlant, index: number): Plant => ({
  id: plant.plantNumber ?? index + 1,
  plantId: String(plant.PlantId ?? ''),
  name: plant.plantName ?? '',
  address: {
    street: plant.plantAddress ?? '',
    city: plant.plantCity ?? '',
    state: plant.plantState ?? '',
    zip: plant.plantZip ?? '',
    country: plant.plantCountry ?? '',
  },
  contact: {
    email: plant.contactEmail ?? '',
    name: formatPersonName(plant.contactFirst, plant.contactLast),
    phone: plant.contactPhone ?? '',
    role: plant.jobTitle ?? '',
  },
  manufacturing: {
    process: plant.brieflySummarize ?? '',
    closestMajorCity: plant.majorCity ?? '',
  },
  otherProducts: Boolean(plant.otherProducts),
  otherProductsList: plant.otherProductCompany ?? '',
})

const mapFiles = (detail: PrelimApplicationDetail): UploadedFile[] => {
  if (Array.isArray(detail.files) && detail.files.length > 0) {
    return detail.files
  }

  return (detail.submission_files ?? []).map((file) => ({
    fileId: file.FileId,
    FileID: file.FileId,
    FileName: file.fileName,
    FilePath: file.fileURL,
    FileSize: file.fileSize == null ? '' : String(file.fileSize),
    FileType: file.fileType ?? 'PDF',
    UploadedDate: file.uploadDate ?? '',
    IsProcessed: false,
    Tag: 'Submission File',
  }))
}

const mapPrelimProducts = (plants: PrelimPlant[], companyName?: string) =>
  plants.flatMap((plant) =>
    (plant.products ?? []).map((product: PrelimProduct, index: number) => ({
      ...product,
      id: String(product.SubmissionProductId ?? product.JotFormProductId ?? `${plant.PlantId ?? plant.plantNumber ?? 'plant'}-${index}`),
      source: 'Form Data',
      labelName: product.productName ?? product.BrandName ?? '',
      brandName: product.BrandName ?? '',
      labelCompany: product.privateLabel ? product.privateLabelCo ?? companyName ?? '' : companyName ?? '',
      ConsumerIndustrial:
        product.Industrial && product.Retail
          ? 'Consumer / Industrial'
          : product.Industrial
            ? 'Industrial'
            : product.Retail
              ? 'Consumer'
              : '',
      bulkShipped: undefined,
      certification: '',
      status: product.status ?? product.plantStatus ?? '',
      plantName: plant.plantName ?? '',
    })),
  )

const mapPrelimIngredients = (plants: PrelimPlant[], submissionDate?: string) =>
  plants.flatMap((plant) =>
    (plant.ingredients ?? []).map((ingredient: PrelimIngredient, index: number) => ({
      ...ingredient,
      id: String(
        ingredient.SubmissionIngredientId ??
          ingredient.JotFormIngredientId ??
          `${plant.PlantId ?? plant.plantNumber ?? 'plant'}-${index}`,
      ),
      status: ingredient.plantStatus ?? 'Submitted',
      ncrcId: ingredient.UKDID ?? '',
      ingredient: ingredient.ingredientLabelName ?? '',
      manufacturer: ingredient.manufacturer ?? '',
      brand: ingredient.brandName ?? '',
      packaging: (ingredient.packagedOrBulk ?? '').toLowerCase(),
      certification: ingredient.certifyingAgency ?? ingredient.UKDID ?? '',
      addedDate: submissionDate ?? '',
      addedBy: 'Form Data',
      plantName: plant.plantName ?? '',
    })),
  )

export function mapPrelimApplicationDetailToApplicationDetail(
  detail: PrelimApplicationDetail,
): ApplicationDetail {
  const companyAddresses = detail.companyAddresses ?? detail.companyAdresses ?? []
  const primaryCompanyAddress = companyAddresses[0]
  const plants = detail.plants ?? []

  return {
    applicationId: String(detail.externalReferenceId ?? ''),
    status: detail.status ?? 'New',
    submissionDate: detail.submissionDate,
    kashrusCompanyId: '',
    kashrusStatus: detail.status ?? 'New',
    primaryContact: mapCompanyContacts(detail.companyContacts)[0]?.name ?? '',
    company: [
      {
        name: detail.companyName ?? '',
        category: detail.whichCategory ?? '',
        currentlyCertified: yesNo(detail.OUCertified),
        everCertified: yesNo(detail.everCertified),
        website: detail.companyWebsite ?? '',
      },
    ],
    companyAddresses: companyAddresses.map((address) => ({
      city: address.companyCity ?? '',
      country: address.companyCountry ?? '',
      line2: '',
      state: address.companyState ?? '',
      street: address.companyAddress ?? '',
      type: 'Physical',
      zip: address.ZipPostalCode ?? '',
    })),
    companyContacts: mapCompanyContacts(detail.companyContacts),
    contacts: mapCompanyContacts(detail.companyContacts).map((contact) => ({
      email: contact.email,
      name: contact.name,
      phone: contact.phone,
      title: contact.role,
      type: contact.type,
      designated: contact.type === 'Primary Contact',
    })),
    plants: plants.map(mapPlant),
    plantAddresses: plants.map((plant) => ({
      city: plant.plantCity ?? '',
      country: plant.plantCountry ?? '',
      line2: '',
      state: plant.plantState ?? '',
      street: plant.plantAddress ?? '',
      type: 'Physical',
      zip: plant.plantZip ?? '',
    })),
    plantContacts: plants.map<PlantContact>((plant) => ({
      email: plant.contactEmail ?? '',
      name: formatPersonName(plant.contactFirst, plant.contactLast),
      phone: plant.contactPhone ?? '',
      role: plant.jobTitle ?? '',
      type: 'Primary Contact',
    })),
    products: mapPrelimProducts(plants, detail.companyName),
    ingredients: mapPrelimIngredients(plants, detail.submissionDate),
    preferences: {
      plantCount: plants.length,
      companyAddress: primaryCompanyAddress,
      companyPhone: detail.companyPhone,
      prelimPlantsRaw: plants,
    },
    files: mapFiles(detail),
    quotes: [],
    messages: [],
    taskEvents: [],
    emails: [],
    raw_data: detail.raw_data ?? [],
  }
}
