import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  Mail,
  Scale,
  Send,
  Stamp,
  Wallet,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'
import {
  createApplicationMessage,
  type ApplicationMessagePayload,
} from '@/features/applications/api'
import { useApplicationDetail } from '@/features/applications/hooks/useApplicationDetail'
import { useConfirmTaskMutation } from '@/features/tasks/hooks/useTaskMutations'
import { buildHtmlEmailFromPlainText } from '@/shared/email/htmlEmail'
import type { Applicant, ApplicantAppVars, AssignedRole } from '@/types/application'

type Props = {
  open: boolean
  applicant?: Applicant
  applicationId?: string | number
  applicationName?: string
  taskInstanceId?: string | number
  taskName?: string
  appVars?: ApplicantAppVars | null
  assignedRoles?: AssignedRole[]
  onClose: () => void
}

type PreviewTab =
  | 'cover'
  | 'agreement'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'invoice'
  | 'pla'
  | '__old_cover'
  | '__old_agreement'

const DEFAULT_ANNUAL_FEE = '2500'
const LABELING_RULES = [
  'Packaging should include the product name, brand, and company name so it can be matched to the certification record.',
  'The OU symbol may only appear on authorized certified products.',
  'The symbol should be printed as part of the original packaging, not added separately by sticker or stamp.',
  'Dairy, meat, fish, and similar designations must appear next to the OU symbol when required.',
  'Marketing materials should clearly state that only products bearing the OU symbol are certified.',
]

type ContractPreviewProductRow = {
  ConsumerIndustrial?: string
  brandName?: string
  bulkShipped?: boolean | string
  certification?: string
  group?: string
  labelNo?: string | number
  labelCompany?: string
  labelName?: string
  status?: string
}

type ContractPreviewIngredientRow = {
  addedBy?: string
  addedDate?: string
  brand?: string
  certification?: string
  ingredient?: string
  manufacturer?: string
  ncrcId?: number | string
  packaging?: string
  source?: string
  status?: string
}

type AgreementClause = {
  id: string
  label: string
  text: string
}

type ClauseVersion = {
  n: number
  label: string
  name: string
  author: string
  ts: string
  clauses: AgreementClause[]
}

const BASE_AGREEMENT_CLAUSES: AgreementClause[] = [
  {
    id: 'recitals',
    label: 'Recitals',
    text: 'WHEREAS the OU performs Kosher certification throughout the world and is the exclusive owner of the OU Certification Mark, a registered trademark; and WHEREAS the OU and the Company desire for the OU to provide the OU Services with respect to the Products, in accordance with the terms set forth herein. NOW, THEREFORE, in consideration of the premises and covenants set forth herein, the Parties agree as follows:',
  },
  {
    id: 'I',
    label: 'I. Certification of Products',
    text: '(A) During the Term, and subject to the terms set forth herein, the OU agrees that each product of the Company listed on Schedule B shall be eligible for Certification. If a Company has more than one Plant, each Plant shall have its own exclusive Schedule B. "Kosher" shall mean that a Product complies with the kosher dietary laws, as determined by the OU in its sole discretion.',
  },
  {
    id: 'I-B-3-b',
    label: 'I.(B)(3)(b) Label Approval',
    text: "The Company shall provide the OU with a proof for each Product label before such label is printed. Within thirty (30) days following the OU's receipt of a label proof, the OU shall notify the Company whether such label is approved. The Company shall not make any material changes to an Approved Label without first obtaining the prior written consent of the OU.",
  },
  {
    id: 'II',
    label: 'II. Fees and Expenses',
    text: 'The Company agrees to timely pay to the OU an annual certification fee for each year during the Term. The first Annual Certification Fee shall be payable on the Effective Date. For each subsequent year, the fee shall be paid in full and in advance, at least fifteen (15) days prior to the beginning of each such year. The fee for the initial year is specified in Schedule C.',
  },
  {
    id: 'III',
    label: 'III. Confidentiality',
    text: 'Except as may otherwise be required by law, the OU shall not disclose to, or use for the benefit of, any other person any trade secrets, ingredients, suppliers, or formulae used by the Company in the manufacture of a Product. The fact of certification of a Product shall not be deemed Confidential Information.',
  },
  {
    id: 'VI',
    label: 'VI. Term; Termination',
    text: 'This Agreement shall commence on the Effective Date and continue until terminated in accordance with this Section. Either party may terminate upon written notice as provided herein. Upon termination, the Company shall immediately discontinue all use of the OU Symbol.',
  },
]

const STANDARD_AGREEMENT_BODY = [
  {
    title: 'RECITALS:',
    paragraphs: [
      'WHEREAS, among other things, the OU performs Kosher certification throughout the world, and is the exclusive owner of the OU Certification Mark, a registered trademark with the U.S. Patent and Trademark Office; and',
      'WHEREAS, in connection with its Kosher certification activities, the OU inspects, supervises and certifies as Kosher products produced, manufactured, packaged, labeled, or otherwise processed in food processing facilities; and',
      'WHEREAS, the OU and the Company desire for the OU to provide the OU Services to the Company with respect to the Products, all in accordance with the terms and subject to the conditions set forth herein.',
      'NOW, THEREFORE, in consideration of the premises and covenants set forth herein, and for other good and valuable consideration, the Parties hereto agree as follows:',
    ],
  },
  {
    title: 'I. Certification of Products.',
    paragraphs: [
      'Certification. During the Term, and subject to the terms and conditions set forth herein, the OU agrees that each product of the Company listed on Schedule B attached hereto and incorporated herein by reference shall be eligible for Certification. If a Company has more than one Plant, each Plant shall have its own exclusive Schedule B.',
      'For purposes of this Agreement, Certification shall mean the issuance of a written statement by the OU to the Company that a Product is certified as Kosher by the OU, and Kosher shall mean that a Product complies with the kosher dietary laws, restrictions and regulations, as determined by the OU in its sole discretion.',
      'Production Location. The Company shall produce, manufacture, process, package and label each Product only at the plant(s) listed on Schedule C attached hereto and incorporated herein by reference, and shall not cause or permit an identical or similar product to be produced elsewhere without the OU\'s prior written consent.',
      'Ingredients. The Company shall not use or store any ingredient in a Plant unless such ingredient is listed on Schedule A or the Company has obtained the prior written consent of the OU. The Company shall implement procedures with Plant personnel to assure that only Ingredients listed on Schedule A are being used or stored at a Plant.',
      'Use of the OU Symbol. The Company may not use the OU Symbol in any manner or on any label of a Product except under the terms and procedures set forth in this Agreement. The OU Symbol shall be part of the printed Approved Label and shall not be rubber-stamped, ink-jetted, or applied by sticker unless the Company obtains prior written consent of the OU.',
      'Private Label Products. Certification of Private Label products shall be governed by a separate private label agreement among the OU, the Company and the applicable private label or distribution company.',
    ],
  },
  {
    title: 'II. Fees and Expenses.',
    paragraphs: [
      'The Company agrees to timely and fully pay to the OU an annual certification fee for each year during the Term. The first Annual Certification Fee shall be payable by the Company to the OU on the Effective Date, and the fee for the initial year shall be specified in Schedule C.',
      'The Company may be subject to additional fees, including special production fees, Passover certification fees, private label fees, travel expenses, and other fees or expenses referenced herein or contemplated hereby.',
    ],
  },
  {
    title: 'III. Confidentiality.',
    paragraphs: [
      'Except as may otherwise be required by law, the OU shall not disclose to, or use for the benefit of, any other person or entity any trade secrets, ingredients, suppliers, formulae or secret processes used by the Company in connection with the manufacture of a Product. The fact of certification of a Product by the OU shall not be deemed Confidential Information.',
    ],
  },
  {
    title: 'IV. Inspection and Records.',
    paragraphs: [
      'OU inspector shall be permitted to enter into and inspect the operations of each Plant at all times during regular business hours and at all times that such Plant is in operation, without prior notification to the Company. The Company shall provide the OU inspector with access to documents relevant to the Kosher status of a Product, including production records, formula cards, batch sheets, invoices for ingredients, and access to relevant personnel.',
    ],
  },
  {
    title: 'V. Indemnification and Limitation of Liability.',
    paragraphs: [
      'The Company agrees to indemnify and hold the OU harmless from and against demands, claims, losses, costs, damages, liabilities, penalties, fines and expenses arising out of or relating to the OU\'s Certification of any Product of the Company as Kosher, the Company\'s breach of this Agreement, unauthorized actions, or the safety of any Product.',
      'In no event shall the OU be liable to the Company for direct, special, incidental, indirect, punitive or consequential damages, loss of use of capital, lost profits, lost revenues, commissions, or compensation of any kind arising out of or related to this Agreement.',
    ],
  },
  {
    title: 'VI. Term; Termination.',
    paragraphs: [
      'Subject to this Section, the term of this Agreement shall commence on the Effective Date and shall terminate on the anniversary of the Effective Date, provided that this Agreement shall renew automatically for additional one-year periods unless a Party terminates upon required written notice.',
      'Upon termination or expiration of this Agreement, the Company may not use the OU Symbol on any Product, advertisement, or otherwise, and shall comply with all post-termination obligations regarding labels, packaging and records.',
    ],
  },
  {
    title: 'VII. Violations.',
    paragraphs: [
      'Upon the Company\'s breach or violation of this Agreement, as determined by the OU in its sole discretion, the OU may require remedial actions including kosherization of affected equipment, increased supervision, removal of unapproved ingredients, recall of product, public notices, termination of this Agreement, and destruction of packaging material.',
    ],
  },
  {
    title: 'VIII. Unauthorized Use of the OU Symbol; Liquidated Damages.',
    paragraphs: [
      'If the Company uses or displays the OU Symbol in an unauthorized manner or fails to strictly comply with label-control obligations, the Company agrees to pay liquidated damages for each day of unauthorized use or noncompliance. The Parties agree that such amount is a reasonable estimate of likely damages and is not intended as a penalty.',
    ],
  },
  {
    title: 'IX. Adding and Removing Products, Plants and Ingredients.',
    paragraphs: [
      'Adding or removing Products, Plants or Ingredients shall be handled through the applicable OU forms and review process. The OU may determine, in its sole discretion, whether a product, plant or ingredient shall be added to or removed from the applicable Schedule.',
    ],
  },
  {
    title: 'X. Miscellaneous.',
    paragraphs: [
      'The Company represents and warrants that it has the requisite power and authority to execute this Agreement and perform its obligations hereunder. This Agreement shall be governed by the laws of the State of New York, and each Party submits to the jurisdiction and venue of courts located in New York.',
      'No waiver shall be deemed made unless in writing and signed by the Party making the waiver. This Agreement, including the Schedules and Exhibits attached hereto and incorporated herein by reference, sets forth the entire agreement among the Parties and supersedes prior discussions, negotiations, documents and agreements.',
    ],
  },
]

const cloneAgreementClauses = (clauses: AgreementClause[]) =>
  clauses.map((clause) => ({ ...clause }))

const initialClauseVersion = (clauses: AgreementClause[]): ClauseVersion => ({
  n: 1,
  label: 'v1',
  name: 'Original',
  author: 'System',
  ts: 'generated from template',
  clauses: cloneAgreementClauses(clauses),
})

const textValue = (value: unknown) => String(value ?? '').trim()

const getDefaultEffectiveDate = () => {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
}

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatFullDate = (value?: string | null) => {
  if (!value) return '-'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatShortDate = (value?: string | null) => {
  if (!value) return '-'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return `${String(parsed.getMonth() + 1).padStart(2, '0')}/${String(parsed.getDate()).padStart(
    2,
    '0',
  )}/${parsed.getFullYear()}`
}

const formatMonthDay = (value?: string | null) => {
  if (!value) return '-'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })
}

const formatCurrency = (value: string | number) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '$0.00'
  return number.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })
}

const hasDisplayValue = (value: unknown) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'boolean') return true
  return String(value).trim() !== ''
}

const toYesNoValue = (value: boolean | string | undefined) => {
  if (value === true) return 'Yes'
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'y' || normalized === 'yes' || normalized === 'true') return 'Yes'
  if (normalized === 'n' || normalized === 'no' || normalized === 'false') return 'No'
  return '-'
}

const getAssignedRoleValue = (assignedRoles: AssignedRole[] | undefined, roleName: string) => {
  const target = roleName.toLowerCase()
  for (const role of assignedRoles ?? []) {
    const match = Object.entries(role).find(([key, value]) => {
      if (key === 'isPrimary') return false
      return key.toLowerCase() === target && typeof value === 'string' && value.trim()
    })
    if (match && typeof match[1] === 'string') {
      return match[1].trim()
    }
  }
  return ''
}

const getPrimaryContact = (
  contacts?: Array<Record<string, unknown>>,
): { name: string; email: string; title: string } => {
  const contact =
    contacts?.find((item) => String(item.type ?? item.Type ?? '').toLowerCase() === 'primary contact') ??
    contacts?.find((item) => String(item.IsPrimaryContact ?? item.isPrimaryContact ?? '').toLowerCase() === 'true') ??
    contacts?.[0]

  const first = textValue(contact?.FirstName ?? contact?.firstName ?? contact?.contactFirst)
  const last = textValue(contact?.LastName ?? contact?.lastName ?? contact?.contactLast)
  const name =
    textValue(contact?.name ?? contact?.Name) || [first, last].filter(Boolean).join(' ') || 'Company Contact'
  const email = textValue(contact?.email ?? contact?.Email ?? contact?.EMail ?? contact?.contactEmail)
  const title = textValue(contact?.role ?? contact?.Role ?? contact?.Title ?? contact?.jobTitle1)

  return { name, email, title }
}

function Section({
  title,
  children,
}: {
  title: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-900">{title}</div>
      {children}
    </section>
  )
}

function MergeField({
  token,
  value,
  emptyWidth = 'min-w-[110px]',
}: {
  token: string
  value?: React.ReactNode
  emptyWidth?: string
}) {
  if (value === null || value === undefined || value === '') {
    return (
      <span
        title={`{{${token}}}`}
        className={`inline-block ${emptyWidth} border-b border-dashed border-slate-400 align-baseline`}
      >
        &nbsp;
      </span>
    )
  }

  return (
    <span
      title={`{{${token}}}`}
      className="rounded-sm border-b-2 border-yellow-600 bg-yellow-200 px-1 font-semibold text-slate-900"
    >
      {value}
    </span>
  )
}

function TogglePillGroup({
  value,
  onChange,
  trueLabel = 'Yes',
  falseLabel = 'No',
}: {
  value: boolean
  onChange: (value: boolean) => void
  trueLabel?: string
  falseLabel?: string
}) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-md px-3 py-1.5 text-sm font-medium ${
          value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        {trueLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-md px-3 py-1.5 text-sm font-medium ${
          !value ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        {falseLabel}
      </button>
    </div>
  )
}

export function ContractStageDrawer({
  open,
  applicant,
  applicationId,
  applicationName,
  taskInstanceId,
  taskName,
  assignedRoles,
  onClose,
}: Props) {
  const resolvedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)
  const { token, username } = useUser()
  const { data: applicationDetail } = useApplicationDetail(open ? resolvedApplicationId : undefined)
  const confirmTaskMutation = useConfirmTaskMutation({
    includeApplicationLists: true,
    includePrelimLists: true,
    onError: (message) => toast.error(message),
  })

  const [previewTab, setPreviewTab] = useState<PreviewTab>('agreement')
  const [effectiveDate, setEffectiveDate] = useState(getDefaultEffectiveDate)
  const [annualFee, setAnnualFee] = useState(DEFAULT_ANNUAL_FEE)
  const [certificationInvoiceComment, setCertificationInvoiceComment] = useState('')
  const [includeInvoiceComment, setIncludeInvoiceComment] = useState(false)
  const [productionProcedures, setProductionProcedures] = useState(
    'Plant personnel will use only approved ingredients and certified labels for OU products.',
  )
  const [noProductionProcedures, setNoProductionProcedures] = useState(true)
  const [pulledOpen, setPulledOpen] = useState(true)
  const [legalReviewNeeded, setLegalReviewNeeded] = useState(false)
  const [legalApproved, setLegalApproved] = useState(false)
  const [agreementClauses, setAgreementClauses] = useState<AgreementClause[]>(() =>
    cloneAgreementClauses(BASE_AGREEMENT_CLAUSES),
  )
  const [clauseVersions, setClauseVersions] = useState<ClauseVersion[]>(() => [
    initialClauseVersion(BASE_AGREEMENT_CLAUSES),
  ])
  const [activeClauseVersion, setActiveClauseVersion] = useState(1)
  const [showClauseChanges, setShowClauseChanges] = useState(false)
  const [editingClauseId, setEditingClauseId] = useState<string | null>(null)
  const [editingClauseText, setEditingClauseText] = useState('')
  const [packageGenerated, setPackageGenerated] = useState(false)
  const [contractSigned, setContractSigned] = useState(false)
  const [invoicePaid, setInvoicePaid] = useState(false)
  const [waitForPayment, setWaitForPayment] = useState(true)
  const [plaBodyOpen, setPlaBodyOpen] = useState(false)
  const [selectedPlaCompany, setSelectedPlaCompany] = useState('')
  const [coverEmailOpen, setCoverEmailOpen] = useState(false)
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  useEffect(() => {
    if (!open) return
    setPreviewTab('agreement')
    setLegalApproved(false)
    setPackageGenerated(false)
    setContractSigned(false)
    setInvoicePaid(false)
    setWaitForPayment(true)
    setShowEmailPreview(false)
    setEmailSent(false)
    setEffectiveDate(getDefaultEffectiveDate())
    setAnnualFee(DEFAULT_ANNUAL_FEE)
    setCertificationInvoiceComment('')
    setIncludeInvoiceComment(false)
    setProductionProcedures(
      'Plant personnel will use only approved ingredients and certified labels for OU products.',
    )
    setNoProductionProcedures(true)
    setPulledOpen(true)
    setAgreementClauses(cloneAgreementClauses(BASE_AGREEMENT_CLAUSES))
    setClauseVersions([initialClauseVersion(BASE_AGREEMENT_CLAUSES)])
    setActiveClauseVersion(1)
    setShowClauseChanges(false)
    setEditingClauseId(null)
    setEditingClauseText('')
    setPlaBodyOpen(false)
    setSelectedPlaCompany('')
    setCoverEmailOpen(false)
  }, [open, taskInstanceId])

  const detailAssignedRoles = applicationDetail?.assignedRoles ?? assignedRoles
  const rcName =
    getAssignedRoleValue(detailAssignedRoles, 'RC') ||
    textValue(applicant?.assignedRC) ||
    textValue(username) ||
    'Assigned RC'
  const ncrcName = textValue(username) || 'Current User'
  const detailCompany = applicationDetail?.company?.[0]
  const detailCompanyRecord = detailCompany as Record<string, unknown> | undefined
  const companyName = textValue(applicationName || applicant?.company || detailCompany?.name) || 'Application'
  const companyAddress = useMemo(() => {
    const address = applicationDetail?.companyAddresses?.[0]
    if (!address) return textValue(applicant?.plant)
    return [address.street, address.line2, address.city, address.state, address.zip, address.country]
      .filter(Boolean)
      .join(', ')
  }, [applicant?.plant, applicationDetail?.companyAddresses])
  const companyPhone = textValue(
    detailCompanyRecord?.phone ??
      detailCompanyRecord?.Phone ??
      detailCompanyRecord?.telephone ??
      detailCompanyRecord?.Telephone ??
      '',
  )
  const plantLabel =
    textValue(applicant?.plant) ||
    textValue(applicationDetail?.plants?.[0]?.name) ||
    textValue(applicationDetail?.plants?.[0]?.plantId) ||
    'Plant'
  const plantAddress = useMemo(() => {
    const plantAddressRecord = applicationDetail?.plantAddresses?.[0]
    if (!plantAddressRecord) return companyAddress
    return [
      plantAddressRecord.street,
      plantAddressRecord.line2,
      plantAddressRecord.city,
      plantAddressRecord.state,
      plantAddressRecord.zip,
      plantAddressRecord.country,
    ]
      .filter(Boolean)
      .join(', ')
  }, [applicationDetail?.plantAddresses, companyAddress])
  const contact = useMemo(
    () =>
      getPrimaryContact(
        applicationDetail?.companyContacts as Array<Record<string, unknown>> | undefined,
      ),
    [applicationDetail?.companyContacts],
  )
  const contractIngredients = useMemo(
    () =>
      ((applicationDetail?.ingredients as ContractPreviewIngredientRow[] | undefined) ?? []).filter(
        Boolean,
      ),
    [applicationDetail?.ingredients],
  )
  const contractProducts = useMemo(
    () => ((applicationDetail?.products as ContractPreviewProductRow[] | undefined) ?? []).filter(Boolean),
    [applicationDetail?.products],
  )
  const privateLabelGroups = useMemo(() => {
    const groups = new Map<string, ContractPreviewProductRow[]>()

    contractProducts.forEach((product) => {
      const labelCompany = textValue(product.labelCompany)
      const isPrivateLabel =
        Boolean(labelCompany) && labelCompany.toLowerCase() !== companyName.toLowerCase()

      if (!isPrivateLabel) return
      groups.set(labelCompany, [...(groups.get(labelCompany) ?? []), product])
    })

    return Array.from(groups.entries()).map(([labelCompany, products]) => ({
      labelCompany,
      products,
    }))
  }, [companyName, contractProducts])
  const selectedPrivateLabelGroup =
    privateLabelGroups.find((group) => group.labelCompany === selectedPlaCompany) ?? privateLabelGroups[0]
  const hasPrivateLabelAgreements = privateLabelGroups.length > 0
  const contractTypeLabel = 'New Company Certification'
  const pulledRows = [
    ['Company name', companyName, 'Pulled from the company record. Edit it there.'],
    ['Plant name', plantLabel, 'Pulled from the plant record. Edit it there.'],
    ['Plant address', plantAddress || 'Address on file', 'Pulled from the plant record. Edit it there.'],
    ['OU signer - Rabbinic Coordinator', rcName, 'RC assigned to this company.'],
    ['Company signer', [contact.name, contact.title].filter(Boolean).join(' - ') || 'Company Contact', 'Company contact record.'],
    ['Company contact', [companyAddress, companyPhone].filter(Boolean).join(' - ') || 'Company record on file', 'Company record.'],
  ]
  const reviewSections: Array<[string, boolean]> = [
    ['Agreement body', true],
    ['Schedule A - Ingredients', true],
    ['Schedule B - Products', true],
    ['Schedule C - Plants & Fee', Boolean(plantLabel && annualFee)],
    ['Schedule D - Production', noProductionProcedures || Boolean(productionProcedures.trim())],
    ['Schedule E - Labeling', true],
    ...(hasPrivateLabelAgreements
      ? [[`Private Label Agreement${privateLabelGroups.length > 1 ? `s (${privateLabelGroups.length})` : ''}`, true] as [string, boolean]]
      : []),
    ...(legalReviewNeeded ? ([['Legal review', legalApproved]] as Array<[string, boolean]>) : []),
    ['Signatures', true],
  ]
  const completeReviewSections = reviewSections.filter(([, complete]) => complete).length
  const maxClauseVersion = Math.max(...clauseVersions.map((version) => version.n))
  const isLatestClauseVersion = activeClauseVersion === maxClauseVersion
  const visibleAgreementClauses =
    clauseVersions.find((version) => version.n === activeClauseVersion)?.clauses ?? agreementClauses
  const originalAgreementClauses = clauseVersions[0]?.clauses ?? BASE_AGREEMENT_CLAUSES
  const agreementClausesEditable = legalReviewNeeded && !legalApproved && isLatestClauseVersion
  const saveClauseChange = (clauseId: string) => {
    const currentClause = agreementClauses.find((clause) => clause.id === clauseId)
    if (!currentClause) return

    const nextText = editingClauseText.trim()
    setEditingClauseId(null)
    setEditingClauseText('')

    if (!nextText || nextText === currentClause.text) return

    const nextClauses = agreementClauses.map((clause) =>
      clause.id === clauseId ? { ...clause, text: nextText } : clause,
    )
    const nextVersionNumber = maxClauseVersion + 1
    const editedClause = nextClauses.find((clause) => clause.id === clauseId)

    setAgreementClauses(nextClauses)
    setClauseVersions((versions) => [
      ...versions,
      {
        n: nextVersionNumber,
        label: `v${nextVersionNumber}`,
        name: `Edited ${editedClause?.label ?? 'Clause'}`,
        author: 'Legal',
        ts: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        clauses: cloneAgreementClauses(nextClauses),
      },
    ])
    setActiveClauseVersion(nextVersionNumber)
    setShowClauseChanges(true)
    toast.success(`Saved as v${nextVersionNumber} - change captured for Legal review`)
  }

  const invoiceNumber = `KCM-${resolvedApplicationId ?? 'DRAFT'}`
  const invoiceAccountNumber = resolvedApplicationId ? `OU-${resolvedApplicationId}` : 'OU-DRAFT'
  const invoiceDate = formatShortDate(effectiveDate)
  const invoiceAmount = formatCurrency(annualFee)
  const invoiceTotal = `${invoiceAmount} USD`

  const packageItems = [
    'Certification Agreement',
    'Schedule A - Ingredients',
    'Schedule B - Products',
    'Schedule C - Plants & Fee',
    'Schedule D - Production Procedures',
    'Schedule E - Labeling Requirements',
    'Certification Invoice',
    ...(hasPrivateLabelAgreements
      ? privateLabelGroups.map((group) => `Private Label Agreement - ${group.labelCompany}`)
      : []),
  ]
  const coverPackageItems = [
    {
      label: 'Certification Agreement',
      sub: 'Master agreement - new company',
    },
    {
      label: 'Schedule A - Ingredients',
      sub: 'Approved ingredients list',
    },
    {
      label: 'Schedule B - Products',
      sub: hasPrivateLabelAgreements ? 'In-house + private-label products' : 'Certified products',
    },
    {
      label: 'Schedule C - Plants & Fee',
      sub: `${plantLabel || 'Plant'} - ${formatCurrency(annualFee)}/yr`,
    },
    {
      label: 'Schedule D - Production Procedures',
      sub: noProductionProcedures ? 'None' : 'Specified',
    },
    {
      label: 'Schedule E - Labeling Requirements',
      sub: 'OU symbol & label use',
    },
    {
      label: 'Contract Invoice',
      sub: `${invoiceNumber} - ${formatCurrency(annualFee)} - ${invoicePaid ? 'paid' : 'awaiting payment'}`,
    },
    ...privateLabelGroups.map((group) => ({
      label: `Private Label Agreement - ${group.labelCompany}`,
      sub: `${group.products.length} product${group.products.length === 1 ? '' : 's'} - incl. Schedule A + Invoice`,
    })),
  ]

  const readyToGenerate =
    Boolean(effectiveDate) &&
    Boolean(annualFee) &&
    (noProductionProcedures || Boolean(productionProcedures.trim())) &&
    (!legalReviewNeeded || legalApproved)
  const readyToAdvance = packageGenerated && contractSigned && (!waitForPayment || invoicePaid)
  const stageStatus = packageGenerated
    ? readyToAdvance
      ? 'Ready to Complete'
      : contractSigned
        ? waitForPayment && !invoicePaid
          ? 'Awaiting Payment'
          : 'Ready to Advance'
        : 'Awaiting Signature'
    : legalReviewNeeded && !legalApproved
      ? 'Legal Review'
      : readyToGenerate
        ? 'Ready'
        : 'In Progress'
  const billingLines =
    (companyAddress || plantAddress || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .length > 1
      ? (companyAddress || plantAddress)
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
      : [companyAddress || plantAddress || 'Address on file']
  const invoiceTermStart = (() => {
    const parsed = new Date(`${effectiveDate}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return formatFullDate(effectiveDate)
    return formatFullDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1).toISOString().slice(0, 10))
  })()
  const invoiceTermEnd = (() => {
    const parsed = new Date(`${effectiveDate}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return formatFullDate(effectiveDate)
    return formatFullDate(new Date(parsed.getFullYear() + 1, parsed.getMonth() + 1, 0).toISOString().slice(0, 10))
  })()

  const emailSubject = `OU Kosher - Contract Package for ${companyName} [App ${resolvedApplicationId ?? '-'}]`
  const emailBody = `Dear ${contact.name || 'Company Contact'},

Enclosed please find the kosher certification contract package for ${companyName}.

Package contents:
${packageItems.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Please review, sign where indicated, and return the signed agreement${waitForPayment ? ' together with payment of the enclosed invoice' : ''}.

Sincerely,
${rcName}
Rabbinic Coordinator`

  if (!open) return null

  const handleSendEmail = async () => {
    if (!resolvedApplicationId) {
      toast.error('Application id is required before sending the contract email.')
      return
    }

    setIsSendingEmail(true)
    try {
      const htmlEmail = buildHtmlEmailFromPlainText(emailBody, {
        title: emailSubject,
        preheader: `Contract package for ${companyName}`,
      })

      const payload: ApplicationMessagePayload = {
        ApplicationID: resolvedApplicationId,
        FromUser: username ?? undefined,
        ToUser: contact.email || contact.name || undefined,
        Subject: emailSubject,
        MessageText: htmlEmail.html,
        MessageTextPlain: htmlEmail.text,
        PlainText: htmlEmail.text,
        Text: htmlEmail.text,
        MessageType: 'Email',
        Priority: 'NORMAL',
        SentDate: new Date().toISOString(),
        TaskInstanceId: taskInstanceId ?? undefined,
      }

      await createApplicationMessage({
        payload,
        token: token ?? undefined,
      })

      setEmailSent(true)
      setShowEmailPreview(false)
      toast.success('Contract package email recorded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send contract email')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleCompleteTask = async () => {
    if (!taskInstanceId) {
      toast.error('Task instance id not found')
      return
    }

    await confirmTaskMutation.mutateAsync({
      taskId: String(taskInstanceId),
      applicationId: resolvedApplicationId,
      token: token ?? undefined,
      username: username ?? undefined,
      result: 'completed',
      completionNotes: `Contract package completed via Contract Stage${invoicePaid ? ' with payment received' : ''}.`,
    })

    toast.success('Contract task completed')
    onClose()
  }

  const previewContent =
    previewTab === 'a' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Schedule A
            </div>
            <h4 className="mt-2 text-2xl font-semibold text-gray-900">Ingredients</h4>
            <p className="mt-2 text-sm text-gray-500">
              Pulled live from the application detail ingredient list for the contract preview.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <ClipboardList className="h-3.5 w-3.5" />
            {contractIngredients.length} Ingredient{contractIngredients.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Group - Certificate
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Approved
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contractIngredients.length > 0 ? (
                contractIngredients.map((ingredient, index) => {
                  const status = hasDisplayValue(ingredient.status) ? String(ingredient.status) : '-'
                  const certificate = hasDisplayValue(ingredient.certification)
                    ? String(ingredient.certification)
                    : '-'

                  return (
                    <tr
                      key={`${ingredient.ingredient ?? 'ingredient'}-${index}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {ingredient.ingredient || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {certificate !== '-' ? (
                          <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                            {certificate}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {status !== '-' ? (
                          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            {status}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center">
                    <div className="text-gray-400">
                      <p className="text-sm font-medium">No ingredients found</p>
                      <p className="mt-1 text-xs">
                        No application-detail ingredients are available for this contract preview.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    ) : previewTab === 'b' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Schedule B
            </div>
            <h4 className="mt-2 text-2xl font-semibold text-gray-900">Products</h4>
            <p className="mt-2 text-sm text-gray-500">
              Pulled live from the application detail product list for the contract preview.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <ClipboardList className="h-3.5 w-3.5" />
            {contractProducts.length} Product{contractProducts.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Label #
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Label Name
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Brand
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Label Company
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Designation
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  C/I
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Bulk
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Symbol
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contractProducts.length > 0 ? (
                contractProducts.map((product, index) => {
                  const designation = hasDisplayValue(product.ConsumerIndustrial)
                    ? String(product.ConsumerIndustrial)
                    : '-'
                  const labelNumber = hasDisplayValue(product.labelNo)
                    ? String(product.labelNo)
                    : '-'
                  const status = hasDisplayValue(product.status) ? String(product.status) : '-'

                  return (
                    <tr key={`${product.labelName ?? 'product'}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{labelNumber}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {product.labelName || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{product.brandName || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{product.labelCompany || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <span className="text-gray-400">-</span>
                      </td>
                      <td className="px-4 py-3">
                        {designation !== '-' ? (
                          <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {designation}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {toYesNoValue(product.bulkShipped)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {hasDisplayValue(product.certification) ? (
                          <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                            {product.certification}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {status !== '-' ? (
                          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            {status}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="text-gray-400">
                      <p className="text-sm font-medium">No products found</p>
                      <p className="mt-1 text-xs">No application-detail products are available for this contract preview.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    ) : previewTab === 'cover' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {coverEmailOpen ? (
          <div className="font-sans">
            <button
              type="button"
              onClick={() => setCoverEmailOpen(false)}
              className="mb-3 text-xs font-semibold text-[#185087] hover:underline"
            >
              Back to cover
            </button>
            <div className="overflow-hidden rounded-[10px] border border-gray-200">
              <div className="flex gap-3 border-b border-gray-100 px-3.5 py-2 text-[12.5px]">
                <span className="w-[58px] shrink-0 pt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-gray-400">
                  From
                </span>
                <span>OU Kashruth Division - {rcName} &lt;{username ?? 'rc@ou.org'}&gt;</span>
              </div>
              <div className="flex gap-3 border-b border-gray-100 px-3.5 py-2 text-[12.5px]">
                <span className="w-[58px] shrink-0 pt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-gray-400">
                  To
                </span>
                <span>
                  {contact.name || 'Company Contact'}
                  {contact.email ? ` <${contact.email}>` : ''}
                </span>
              </div>
              <div className="flex gap-3 border-b border-gray-100 px-3.5 py-2 text-[12.5px]">
                <span className="w-[58px] shrink-0 pt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-gray-400">
                  Cc
                </span>
                <span>{rcName} &lt;{username ?? 'rc@ou.org'}&gt;</span>
              </div>
              <div className="flex gap-3 border-b border-gray-100 px-3.5 py-2 text-[12.5px]">
                <span className="w-[58px] shrink-0 pt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-gray-400">
                  Subject
                </span>
                <span>
                  <strong>Kosher Certification Contract - {companyName}</strong>
                </span>
              </div>
              <div className="whitespace-pre-line px-3.5 py-3.5 text-[12.5px] leading-6 text-[#1e1e2e]">
                {emailBody}
              </div>
              <div className="border-t border-gray-100 bg-gray-50 px-3.5 py-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Attachment
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12.5px]">
                  <FileText className="h-4 w-4 text-[#185087]" />
                  <span className="font-semibold text-[#1e1e2e]">
                    Certification_Package_{companyName.replace(/[^A-Za-z0-9]+/g, '_')}.pdf
                  </span>
                  <span className="ml-auto text-[11px] text-gray-400">
                    {coverPackageItems.length} documents - cover sheet enclosed
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {emailSent ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-[12.5px] font-bold text-green-700">
                  Sent via Outlook to {contact.email || contact.name || 'company contact'} - package
                  logged to the application communications.
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={handleSendEmail}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#185087] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#13406c] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <Send className="h-4 w-4" />
                  {isSendingEmail ? 'Sending...' : 'Send via Outlook'}
                </button>
              )}
              <p className="text-[11px] text-gray-400">
                Routes through Outlook (Microsoft 365 / Graph). You confirm before it sends.
              </p>
            </div>
          </div>
        ) : (
          <div className="font-sans">
            <div className="mb-2.5 flex justify-end">
              <button
                type="button"
                onClick={() => setCoverEmailOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-[#185087] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#13406c]"
              >
                <Mail className="h-4 w-4" />
                Email package
              </button>
            </div>
            <div className="mb-4 flex items-start justify-between border-b-2 border-[#185087] pb-3">
              <div>
                <div className="font-serif text-lg font-bold tracking-tight text-[#185087]">
                  ORTHODOX UNION
                </div>
                <div className="mt-0.5 text-[10.5px] text-gray-500">
                  Kashruth Division - 40 Rector Street, 4th Floor, New York, NY 10006
                </div>
              </div>
              <div className="text-right text-[11px] text-gray-500">
                {formatFullDate(effectiveDate)}
                <br />
                Re: Kosher Certification Contract
              </div>
            </div>

            <p className="mb-3 text-[12.5px] leading-6 text-[#1e1e2e]">
              <strong>{companyName}</strong>
              <br />
              {billingLines.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
              Att: {contact.name || 'Company Contact'}
            </p>
            <p className="mb-3 text-[12.5px] leading-6 text-[#1e1e2e]">
              Dear {contact.name || 'Company Contact'}:
            </p>
            <p className="mb-3 text-[12.5px] leading-6 text-[#1e1e2e]">
              Enclosed please find the following documents comprising the kosher certification
              contract package for <strong>{companyName}</strong>. Please review, sign where
              indicated, and return together with payment of the enclosed invoice
              {hasPrivateLabelAgreements ? 's' : ''}.
            </p>

            <div className="mb-2 mt-4 flex items-baseline justify-between text-[10px] font-bold uppercase tracking-wide text-gray-400">
              <span>Package Contents</span>
              <span className="font-semibold normal-case tracking-normal text-gray-600">
                {coverPackageItems.length} items
              </span>
            </div>
            <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
              {coverPackageItems.map((item, index) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 border-b border-gray-100 px-3.5 py-2.5 last:border-b-0"
                >
                  <div className="mt-0.5 flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full bg-[#185087] text-[10.5px] font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-semibold text-[#1e1e2e]">{item.label}</div>
                    <div className="mt-0.5 text-[11px] text-gray-500">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <p className="mb-3 text-[12.5px] leading-6 text-[#1e1e2e]">
              We wish you much success in this certification.
            </p>
            <p className="mt-5 text-[12.5px] leading-6 text-[#1e1e2e]">
              Sincerely,
              <br />
              <br />
              {rcName}
              <br />
              Rabbinic Coordinator
              <br />
              Union of Orthodox Jewish Congregations of America
            </p>
          </div>
        )}
      </div>
    ) : previewTab === '__old_cover' ? (
      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
        <div className="border-b border-gray-200 pb-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            Contract Package
          </div>
          <h4 className="mt-2 text-2xl font-semibold text-gray-900">{companyName}</h4>
          <p className="mt-2 text-sm text-gray-600">
            Plant: {plantLabel} · App #{resolvedApplicationId ?? '-'}
          </p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          Enclosed please find the kosher certification contract package for review and signature.
        </div>
        <div className="space-y-3">
          {packageItems.map((item, index) => (
            <div key={item} className="flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                {index + 1}
              </div>
              <div>
                <div className="font-medium text-gray-900">{item}</div>
                <div className="text-sm text-gray-500">
                  {item === 'Certification Invoice'
                    ? `Annual fee ${formatCurrency(annualFee)}`
                    : 'Prepared as part of the contract package'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : previewTab === 'agreement' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6 font-serif text-[14px] leading-7 text-slate-800">
        <h4 className="mb-4 text-center text-[15px] font-bold tracking-wide">AGREEMENT</h4>
        <p className="mb-3">
          <b>THIS AGREEMENT</b> (this "Agreement") is entered into as of{' '}
          <MergeField token="effective_date" value={`the first day of ${formatMonthDay(effectiveDate)}`} />{' '}
          ("Effective Date"), by and between the{' '}
          <b>Union of Orthodox Jewish Congregations of America, Kashruth Division</b> (the "OU"),
          and <MergeField token="company_name" value={companyName} /> (the "Company").
        </p>
        <div className="my-4">
          {legalReviewNeeded ? (
            <div>
              <div className="mb-2 font-sans text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
                Agreement body &mdash; structured clauses &middot;{' '}
                {agreementClausesEditable ? 'editable (Legal engaged)' : 'read-only'}
              </div>
              {!isLatestClauseVersion ? (
                <div className="mb-3 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 font-sans text-xs font-semibold text-yellow-800">
                  Viewing{' '}
                  {clauseVersions.find((version) => version.n === activeClauseVersion)?.label ??
                    `v${activeClauseVersion}`}{' '}
                  - read-only. Switch to the latest version to edit.
                </div>
              ) : legalApproved ? (
                <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 font-sans text-xs font-semibold text-green-700">
                  Legal has signed off - clauses locked.
                </div>
              ) : null}

              <div className="space-y-1">
                {visibleAgreementClauses.map((clause) => {
                  const originalText =
                    originalAgreementClauses.find((original) => original.id === clause.id)?.text ?? ''
                  const changed = clause.text !== originalText
                  const editing = editingClauseId === clause.id

                  if (editing) {
                    return (
                      <div
                        key={clause.id}
                        className="rounded-lg border border-yellow-300 bg-yellow-50 p-3"
                      >
                        <div className="mb-2 font-bold">{clause.label}</div>
                        <textarea
                          rows={Math.max(3, Math.ceil(editingClauseText.length / 68))}
                          value={editingClauseText}
                          onChange={(event) => setEditingClauseText(event.target.value)}
                          className="w-full rounded-lg border border-blue-700 px-3 py-2 font-serif text-[13.5px] leading-7 text-slate-800 shadow-[0_0_0_3px_rgba(24,80,135,0.12)]"
                        />
                        <div className="mt-2 flex gap-2 font-sans">
                          <button
                            type="button"
                            onClick={() => saveClauseChange(clause.id)}
                            className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Save change
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClauseId(null)
                              setEditingClauseText('')
                            }}
                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={clause.id}
                      className={`group relative rounded-lg border p-3 ${
                        changed
                          ? 'border-yellow-300 bg-yellow-50'
                          : agreementClausesEditable
                            ? 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                            : 'border-transparent'
                      }`}
                    >
                      <div className="mb-1 font-bold">
                        {clause.label}
                        {changed ? (
                          <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 align-middle font-sans text-[9.5px] font-bold text-yellow-800">
                            revised
                          </span>
                        ) : null}
                      </div>
                      {showClauseChanges && changed ? (
                        <div className="space-y-1">
                          <p>
                            <span className="text-red-700 line-through decoration-red-500">
                              {originalText}
                            </span>
                          </p>
                          <p>
                            <span className="text-green-700 underline decoration-green-500">
                              {clause.text}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <p>{clause.text}</p>
                      )}
                      {agreementClausesEditable ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClauseId(clause.id)
                            setEditingClauseText(clause.text)
                          }}
                          className="absolute right-2 top-2 rounded-md border border-slate-300 bg-white px-2.5 py-1 font-sans text-[11px] font-semibold text-blue-700 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              {clauseVersions.length > 1 ? (
                <div className="mt-5 border-t border-slate-200 pt-3 font-sans">
                  <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
                    Version history
                  </div>
                  {clauseVersions
                    .slice()
                    .reverse()
                    .map((version) => (
                      <div
                        key={version.n}
                        className="flex gap-2 py-1 text-[11.5px] text-slate-600"
                      >
                        <b className="text-slate-900">{version.label}</b>
                        <span>{version.name}</span>
                        <span className="ml-auto text-slate-400">
                          {version.author} - {version.ts}
                        </span>
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mb-2 font-sans text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
              Standard agreement body - template text (static; not edited for a standard template)
            </div>
          )}
          {!legalReviewNeeded ? (
            <div className="space-y-3">
              {STANDARD_AGREEMENT_BODY.map((section) => (
                <div key={section.title}>
                  <p className="mb-1 mt-3 font-bold">{section.title}</p>
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={`${section.title}-${index}`} className="mb-2">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-5 border-t border-slate-200 pt-4 text-[12.5px]">
          <p className="mb-4 italic">
            IN WITNESS WHEREOF, the Parties hereto have caused this Agreement to be executed as of
            the Effective Date.
          </p>
          <p className="mb-1">
            <b>"OU"</b>
          </p>
          <p className="mb-3 font-bold">
            UNION OF ORTHODOX JEWISH CONGREGATIONS OF AMERICA, KASHRUTH DIVISION
          </p>
          <div className="leading-relaxed text-slate-600">
            <p>
              By: <MergeField token="ou_rc" value={rcName} />
            </p>
            <p className="mb-3">Title: Rabbinic Coordinator</p>
            <p className="mt-2">Address: 40 Rector St, New York, NY 10004</p>
            <p>Phone Number: (212) 563-4000</p>
            <p>Facsimile Number: (212) 564-9058</p>
          </div>
          <p className="mb-2 mt-5">
            <b>
              <MergeField token="company_name" value={companyName} />
            </b>
          </p>
          <div className="leading-relaxed text-slate-600">
            <p>
              By: ______________________________{' '}
              <span className="font-sans text-[11px] text-slate-400">(signed at execution)</span>
            </p>
            <p>
              Name: <MergeField token="company_signer" value={contact.name} />
            </p>
            <p>
              Title:{' '}
              <MergeField token="company_signer_title" value={contact.title || 'Authorized Signer'} />
            </p>
            <p>
              Address:{' '}
              <MergeField token="company_address" value={companyAddress || 'Address on file'} />
            </p>
            <p>
              Phone Number: <MergeField token="company_phone" value={companyPhone || '-'} />
            </p>
          </div>
        </div>
        <div className="mt-5 border-t border-slate-200 pt-3 font-sans text-[12px] text-slate-500">
          Attached: Schedule A (Ingredients) - B (Products) - C (Plants & Fee) - D
          (Production Procedures) - E (Labeling Requirements)
          {hasPrivateLabelAgreements
            ? ` - ${privateLabelGroups.length} Private Label Agreement${
                privateLabelGroups.length > 1 ? 's' : ''
              }`
            : ''}
        </div>
      </div>
    ) : previewTab === '__old_agreement' ? (
      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            Agreement Body
          </div>
          <h4 className="mt-2 text-2xl font-semibold text-gray-900">Certification Agreement</h4>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Effective {formatDate(effectiveDate)} between the Union of Orthodox Jewish Congregations
            of America and {companyName}, located at {companyAddress || 'the address on file'}.
          </p>
        </div>
        <div className="space-y-4 text-sm leading-6 text-gray-700">
          <div>
            <div className="font-semibold text-gray-900">1. Certification Scope</div>
            <p>
              Certification applies to the approved products and ingredients reflected in Schedules A
              and B and to the plant information reflected in Schedule C.
            </p>
          </div>
          <div>
            <div className="font-semibold text-gray-900">2. Production Procedures</div>
            <p>{noProductionProcedures ? 'No special procedures supplied.' : productionProcedures}</p>
          </div>
          <div>
            <div className="font-semibold text-gray-900">3. Fee & Term</div>
            <p>
              The annual certification fee is {formatCurrency(annualFee)} beginning on{' '}
              {formatDate(effectiveDate)} and continuing under the terms of the agreement.
            </p>
          </div>
          <div>
            <div className="font-semibold text-gray-900">4. Signatures</div>
            <p>
              OU Coordinator: {rcName}
              <br />
              Company Signer: {contact.name || 'To be confirmed'}
              {contact.title ? ` · ${contact.title}` : ''}
            </p>
          </div>
        </div>
      </div>
    ) : previewTab === 'c' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Schedule C
        </div>
        <h4 className="mt-2 text-2xl font-semibold text-gray-900">Plants & Fee</h4>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Plant</div>
            <div className="mt-2 font-medium text-gray-900">{plantLabel}</div>
            <div className="mt-1 text-sm text-gray-600">{companyAddress || 'Address on file'}</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Annual Fee</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(annualFee)}</div>
            <div className="mt-1 text-sm text-gray-600">Effective {formatDate(effectiveDate)}</div>
          </div>
        </div>
      </div>
    ) : previewTab === 'd' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Schedule D
        </div>
        <h4 className="mt-2 text-2xl font-semibold text-gray-900">Production Procedures</h4>
        <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
          {noProductionProcedures ? 'None supplied.' : productionProcedures}
        </div>
      </div>
    ) : previewTab === 'e' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Schedule E
        </div>
        <h4 className="mt-2 text-2xl font-semibold text-gray-900">Labeling Requirements</h4>
        <div className="mt-5 space-y-3">
          {LABELING_RULES.map((rule, index) => (
            <div key={rule} className="flex gap-3 rounded-lg border border-gray-200 px-4 py-3">
              <div className="font-semibold text-blue-700">{index + 1}.</div>
              <p className="text-sm leading-6 text-gray-700">{rule}</p>
            </div>
          ))}
        </div>
      </div>
    ) : previewTab === 'pla' ? (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {selectedPrivateLabelGroup ? (
          <div className="font-serif text-[14px] leading-7 text-slate-800">
            {privateLabelGroups.length > 1 ? (
              <div className="mb-3 flex flex-wrap gap-2 rounded-lg bg-amber-50 p-2 font-sans">
                {privateLabelGroups.map((group) => (
                  <button
                    key={group.labelCompany}
                    type="button"
                    onClick={() => setSelectedPlaCompany(group.labelCompany)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                      selectedPrivateLabelGroup.labelCompany === group.labelCompany
                        ? 'border-amber-800 bg-amber-800 text-white'
                        : 'border-amber-200 bg-white text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    {group.labelCompany}
                  </button>
                ))}
              </div>
            ) : null}

            <h4 className="mb-1 text-center text-[15px] font-bold tracking-wide">
              PRIVATE LABEL AGREEMENT
            </h4>
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2 font-sans">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
                Awaiting co-signature
              </span>
              <span className="text-[10.5px] text-slate-400">
                $250 - bundled into this contract - prepared in Products
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPlaBodyOpen((current) => !current)}
              className="mb-3 w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left font-sans text-[11px] font-bold uppercase tracking-wide text-amber-800"
            >
              {plaBodyOpen ? 'Agreement text - click to collapse' : 'Agreement text (static three-way form - click to expand)'}
            </button>

            {plaBodyOpen ? (
              <div className="mb-4 rounded-lg border border-slate-200 p-4">
                <p className="mb-2">
                  <b>THIS PRIVATE LABEL AGREEMENT</b> (this "Agreement") is entered into as of{' '}
                  <MergeField token="effective_date" value={formatFullDate(effectiveDate)} />{' '}
                  ("Effective Date"), by and between the{' '}
                  <b>Union of Orthodox Jewish Congregations of America</b>, a State of New York
                  nonprofit corporation (the "OU"), and{' '}
                  <MergeField token="company_name" value={companyName} />, located at{' '}
                  <MergeField token="company_address" value={companyAddress || 'Address on file'} />{' '}
                  (the "Company"), and{' '}
                  <MergeField token="distributor" value={selectedPrivateLabelGroup.labelCompany} />,
                  located at <MergeField token="distributor_address" value="Address on file" />{' '}
                  (the "Distributor").
                </p>
                <p className="mb-2">
                  <b>RECITALS:</b>
                </p>
                <p className="mb-2">
                  WHEREAS, the OU performs Kosher certification services throughout the world and is
                  the exclusive owner of the OU certification mark; and
                </p>
                <p className="mb-2">
                  WHEREAS, the Company and Distributor would like the Company to produce
                  Distributor's products and place an OU Symbol on certain Private Label Products;
                </p>
                <p className="mb-2">
                  NOW, THEREFORE, the parties agree that certified Private Label Products shall be
                  manufactured only at approved plants and only as listed on Schedule A.
                </p>
                <p className="mb-2">
                  <b>SECTION 1. Certification of Private Label Products.</b> The certification of
                  Private Label Products is contingent upon the Company and the OU having entered
                  into, and being subject to, the Certification Agreement.
                </p>
                <p className="mb-2">
                  <b>SECTION 2. Indemnification and Limitation of Liability.</b> The Distributor and
                  Company agree to indemnify and hold the OU harmless from claims arising out of the
                  Private Label Products.
                </p>
                <div className="mt-4 border-t border-slate-200 pt-3 text-[12.5px]">
                  <p className="mb-3 italic">
                    IN WITNESS WHEREOF, the Parties hereto have caused this Agreement to be
                    executed as of the Effective Date.
                  </p>
                  <p className="mb-1">
                    <b>"OU"</b> - UNION OF ORTHODOX JEWISH CONGREGATIONS OF AMERICA, KASHRUTH
                    DIVISION
                  </p>
                  <p className="mb-3 text-slate-600">
                    By: <MergeField token="ou_rc" value={rcName} /> - Rabbinic Coordinator
                  </p>
                  <p className="mb-1">
                    <b>"COMPANY"</b> - <MergeField token="company_name" value={companyName} />
                  </p>
                  <p className="mb-3 text-slate-600">
                    By: ______________________________ -{' '}
                    <MergeField token="company_signer" value={contact.name} />
                  </p>
                  <p className="mb-1">
                    <b>"DISTRIBUTOR"</b> -{' '}
                    <MergeField token="distributor" value={selectedPrivateLabelGroup.labelCompany} />
                  </p>
                  <p className="text-slate-600">By: ______________________________</p>
                </div>
              </div>
            ) : null}

            <div className="mb-2 font-sans text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
              Schedule A
            </div>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap font-sans text-[11.5px]">
                <thead>
                  <tr className="border-b border-slate-300 text-left text-[9.5px] uppercase tracking-wide text-slate-400">
                    <th className="py-1 pr-2 font-semibold">Product Name<br />(By Company Name)</th>
                    <th className="py-1 pr-2 font-semibold">Product Name<br />(By Distributor Name)</th>
                    <th className="py-1 pr-2 font-semibold">Group</th>
                    <th className="py-1 pr-2 font-semibold">Distributor<br />Brand Name</th>
                    <th className="py-1 font-semibold">Symbol/<br />Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPrivateLabelGroup.products.map((product, index) => (
                    <tr key={`${product.labelName ?? 'pl'}-${index}`} className="border-b border-slate-100">
                      <td className="py-1.5 pr-2 font-medium">{product.labelName || '-'}</td>
                      <td className="py-1.5 pr-2">{product.labelName || '-'}</td>
                      <td className="py-1.5 pr-2 text-slate-600">{product.group || 'Group 1'}</td>
                      <td className="py-1.5 pr-2 text-slate-600">{product.brandName || '-'}</td>
                      <td className="py-1.5 text-slate-600">{product.certification || product.status || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-2 mt-5 font-sans text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
              Location(s) of Plant or Manufacturing Site
            </div>
            <table className="w-full font-sans text-[11.5px]">
              <thead>
                <tr className="border-b border-slate-300 text-left text-[9.5px] uppercase tracking-wide text-slate-400">
                  <th className="py-1 font-semibold">Name</th>
                  <th className="py-1 font-semibold">Address</th>
                  <th className="py-1 font-semibold">USDA Code</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1.5 pr-2 font-medium">{companyName}</td>
                  <td className="py-1.5 pr-2 text-slate-600">{plantAddress || 'Address on file'}</td>
                  <td className="py-1.5 text-slate-600">-</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 font-sans text-sm text-amber-900">
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-amber-800">
                Private Label Invoice
              </div>
              <div className="mt-1">
                Initial Private Label - {selectedPrivateLabelGroup.labelCompany}: $250.00 USD
              </div>
              <div className="mt-1 text-xs text-amber-700">
                Created in Products/Kashrus - invoice ID Kashrus-generated - payment auto-detected.
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No private-label products on Schedule B - no PLA required.
          </div>
        )}
      </div>
    ) : (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-2 font-sans text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
          Contract Invoice{' '}
          <span className="font-medium normal-case text-slate-400">
            - KCM - annual certification fee
          </span>
        </div>
        {!annualFee ? (
          <p className="mb-3 font-sans text-[11.5px] font-semibold text-amber-700">
            Draft - enter the Annual Certification Fee on Schedule C to populate the amount.
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <div className="min-w-[560px] rounded-md border border-gray-300 bg-white p-5 font-sans text-[11px] leading-normal text-[#1e1e2e]">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-sm bg-[#185087] p-1 text-center text-[6px] font-bold leading-tight text-white">
                KOSHER CERTIFICATION SERVICE
              </div>
              <div className="flex-1">
                <div className="font-serif text-[11.5px] font-semibold tracking-wide">
                  UNION OF ORTHODOX JEWISH CONGREGATIONS OF AMERICA
                </div>
                <div className="mt-0.5 text-[10px] text-gray-700">
                  FORTY RECTOR STREET, 4TH FLOOR / NEW YORK, NY 10006
                </div>
              </div>
              <div className="font-serif text-2xl font-bold tracking-wide text-[#185087]">
                INVOICE
              </div>
            </div>

            <table className="mb-4 w-full border-collapse border border-gray-400">
              <thead>
                <tr>
                  {['Invoice Number', 'Invoice Date', 'Amount', 'Account Number'].map((label) => (
                    <th
                      key={label}
                      className="border-r border-gray-300 px-2 py-1 text-center text-[9.5px] font-bold last:border-r-0"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {[invoiceNumber, invoiceDate, invoiceAmount, invoiceAccountNumber].map((value) => (
                    <td
                      key={value}
                      className="border-r border-t border-gray-300 px-2 py-1 text-center text-[11px] font-bold last:border-r-0"
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            <div className="mb-2 grid grid-cols-[1.1fr_1fr_1.05fr] items-start gap-3">
              <div className="text-[10.5px] leading-normal">
                <strong>{companyName}</strong>
                <br />
                {billingLines.map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
                <div className="mt-1.5">Att: {contact.name || 'Company Contact'}</div>
              </div>
              <div className="pt-1 text-center text-[10px] font-semibold italic leading-normal text-[#185087]">
                The Orthodox Union strongly urges all customers to pay by ACH, wire, or credit card
                to avoid check fraud. It&apos;s safer and quicker.
              </div>
              <div className="border border-gray-400 text-[9.5px]">
                <div className="border-b border-gray-400 bg-blue-100 px-2 py-0.5 font-bold text-blue-900">
                  Online Payments: oudirect.org
                </div>
                <div className="border-b border-gray-400 bg-blue-100 px-2 py-0.5 font-bold text-blue-900">
                  Wire/ACH Bank Info:
                </div>
                <div className="px-2 py-1 leading-normal">
                  <b className="inline-block w-[58px]">Bank:</b>IDB
                  <br />
                  <b className="inline-block w-[58px]">Account:</b>Orthodox Union
                  <br />
                  <b className="inline-block w-[58px]">Account #:</b>1353211
                  <br />
                  <b className="inline-block w-[58px]">ABA #:</b>026009768
                  <br />
                  <b className="inline-block w-[58px]">Swift #:</b>IDBYUS33
                </div>
              </div>
            </div>

            <div className="mb-4 text-center text-[9.5px] italic text-gray-700">
              For wire transfers, please reference your account and invoice numbers on all
              transactions.
            </div>

            <div className="mb-4 grid grid-cols-[1fr_1.5fr] items-start gap-3">
              <div className="text-[10.5px] leading-normal">
                {companyName}
                <br />
                {billingLines.map((line) => (
                  <span key={`bill-${line}`}>
                    {line}
                    <br />
                  </span>
                ))}
              </div>
              <div className="border border-gray-400">
                <div className="border-b border-gray-400 px-2 py-1 text-center text-[10px] font-bold">
                  For questions or comments, contact your Rabbinic Coordinator.
                </div>
                <div className="px-2 py-1 text-center text-[10px]">
                  {rcName} &nbsp;&nbsp; (212) 563-4000 &nbsp;&nbsp; {username ?? 'rc@ou.org'}
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Invoice #', 'Invoice Date', 'Amount', 'Due Date', 'Account #'].map((label) => (
                        <th
                          key={label}
                          className="border-r border-t border-gray-300 px-1 py-1 text-center text-[8.5px] font-bold last:border-r-0"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {[invoiceNumber, invoiceDate, invoiceAmount, '', invoiceAccountNumber].map(
                        (value, index) => (
                          <td
                            key={`${value}-${index}`}
                            className="border-r border-t border-gray-300 px-1 py-1 text-center text-[9.5px] font-bold last:border-r-0"
                          >
                            {value || '\u00a0'}
                          </td>
                        ),
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <table className="mb-4 w-full border-collapse border border-gray-400">
              <tbody>
                <tr className="bg-[#d9d9d9] font-bold">
                  <td className="px-2 py-1 text-[10px]">DESCRIPTION</td>
                  <td className="px-2 py-1 text-right text-[10px]" colSpan={2}>
                    Amount
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1">
                    <strong>Initial Certification Fee</strong>
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-center text-[9.5px] font-bold">
                    Fees
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-center text-[9.5px] font-bold">
                    Expenses
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1"></td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-right">
                    {invoiceAmount}
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                </tr>
                <tr className="bg-[#d9d9d9] font-bold">
                  <td className="px-2 py-1">Details</td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                </tr>
                <tr>
                  <td className="px-2 py-1">
                    <strong>Plant(s):</strong>
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                </tr>
                <tr>
                  <td className="px-2 py-1">{plantLabel}</td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-right">
                    {invoiceAmount}
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                </tr>
                <tr>
                  <td className="px-2 py-1 text-[10px] italic text-gray-700">
                    Annual Certification Fee for the term {invoiceTermStart} to {invoiceTermEnd}.
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                </tr>
                {includeInvoiceComment && certificationInvoiceComment.trim() ? (
                  <tr>
                    <td className="px-2 py-1">
                      <strong>Comment:</strong> {certificationInvoiceComment}
                    </td>
                    <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                    <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                  </tr>
                ) : null}
                <tr className="border-t border-gray-400 bg-[#d9d9d9] text-[11px] font-bold">
                  <td className="px-2 py-1">Total Amount Due</td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-right">
                    {invoiceTotal}
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                </tr>
              </tbody>
            </table>

            <div className="mt-1 flex items-start justify-between gap-3 text-[9.5px]">
              <div>
                <span className="font-bold">UNION OF ORTHODOX JEWISH CONGREGATIONS OF AMERICA</span>
                <br />
                40 Rector St, 4th Floor, New York, NY 10006
                <br />
                (212) 563-4000 fax (212) 564-9058
              </div>
              <div>Payable in US Dollars</div>
            </div>
          </div>
        </div>

        {invoicePaid ? (
          <div className="mt-3 flex flex-wrap gap-2 font-sans">
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10.5px] font-bold text-green-700">
              Paid in full
            </span>
            <div className="w-full rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
              <b>{invoiceAmount} received via ACH</b>
              <span className="mt-0.5 block text-[11.5px]">Source: Kashrus - Posted by Accounting.</span>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2 font-sans">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10.5px] font-bold text-amber-800">
              Awaiting payment
            </span>
            <span className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-[10.5px] font-bold text-gray-400">
              Auto-updates from Kashrus
            </span>
          </div>
        )}

        <p className="mt-2 font-sans text-[11px] text-slate-500">
          Created in KCM/Kashrus - invoice ID Kashrus-generated - payment auto-detected. Comment
          is entered under the certification fee. Runs parallel to any PLA invoices.
        </p>
      </div>
    )

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/45" onClick={onClose}>
        <div
          className="fixed right-0 top-0 flex h-full w-full max-w-[98vw] flex-col overflow-hidden bg-[#f5f7fb] shadow-2xl xl:max-w-[92vw]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b bg-gray-950 px-6 py-4 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sky-300">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-[0.22em]">
                    Contract Stage
                  </span>
                </div>
                <h3 className="mt-2 truncate text-2xl font-semibold">{companyName}</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-300">
                  {taskName ? <span className="rounded-full bg-white/10 px-2.5 py-1">{taskName}</span> : null}
                  <span className="rounded-full bg-white/10 px-2.5 py-1">App #{resolvedApplicationId ?? '-'}</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1">Plant: {plantLabel}</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1">RC: {rcName}</span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1">NCRC: {ncrcName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-gray-300 hover:bg-white/10 hover:text-white"
                aria-label="Close contract stage drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="border-b bg-white px-6 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-800">
                  {stageStatus}
                </span>
                <span className="text-sm text-gray-600">
                  {packageGenerated
                    ? contractSigned
                      ? waitForPayment && !invoicePaid
                        ? 'Contract signed. Waiting for payment before completion.'
                        : 'Contract package is ready to complete.'
                      : 'Package generated. Waiting for signed return.'
                    : legalReviewNeeded && !legalApproved
                      ? 'Legal sign-off is required before generating the package.'
                      : 'Configure the package and generate the contract set.'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-1 ${packageGenerated ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  Package {packageGenerated ? 'Generated' : 'Draft'}
                </span>
                <span className={`rounded-full px-2.5 py-1 ${contractSigned ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  Signature {contractSigned ? 'Received' : 'Pending'}
                </span>
                <span className={`rounded-full px-2.5 py-1 ${invoicePaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  Payment {invoicePaid ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden px-6 py-5 xl:grid-cols-[440px_minmax(0,1fr)]">
            <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
              <Section title="Contract Type">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-gray-500">Determined by the system</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">{contractTypeLabel}</div>
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700">
                      Set
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Set from the application - a workflow is either a new-company contract or a plant
                  addendum, never both.
                </p>
              </Section>

              <Section
                title={
                  <span className="flex items-center justify-between gap-3">
                    <span>Merge Fields &mdash; You Enter</span>
                    <span className="text-[11px] font-medium normal-case tracking-normal text-gray-400">
                      the only fields needing input
                    </span>
                  </span>
                }
              >
                <div className="space-y-3">
                  <label className="block text-sm">
                    <span className="text-[12.5px] font-semibold text-gray-700">
                      Effective date <span className="text-red-600">*</span>
                    </span>
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={(event) => setEffectiveDate(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                    <span className="mt-1 block text-[11.5px] leading-5 text-gray-500">
                      Defaults to the first of the current month - reads "the first day of{' '}
                      {formatMonthDay(effectiveDate)}." Backdating allowed.
                    </span>
                  </label>
                  <label className="block text-sm">
                    <span className="text-[12.5px] font-semibold text-gray-700">
                      Annual certification fee <span className="text-red-600">*</span>
                    </span>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={annualFee}
                        onChange={(event) => setAnnualFee(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 py-2 pl-7 pr-3"
                      />
                    </div>
                    <span className="mt-1 block text-[11.5px] leading-5 text-gray-500">
                      Goes to Schedule C, per plant. Current invoice amount:{' '}
                      <b>{formatCurrency(annualFee)}</b>.
                    </span>
                  </label>
                  <label className="block text-sm">
                    <span className="text-[12.5px] font-semibold text-gray-700">
                      Certification invoice comment
                    </span>
                    <textarea
                      rows={2}
                      value={certificationInvoiceComment}
                      placeholder="Comment for the certification invoice..."
                      onChange={(event) => setCertificationInvoiceComment(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                    <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={includeInvoiceComment}
                        onChange={(event) => setIncludeInvoiceComment(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Include on invoice
                    </label>
                    <span className="mt-1 block text-[11.5px] leading-5 text-gray-500">
                      {includeInvoiceComment
                        ? 'Included on the Invoice tab, in the Details section.'
                        : 'Kept internal - not included on the invoice.'}
                    </span>
                  </label>
                  <label className="block text-sm">
                    <span className="text-[12.5px] font-semibold text-gray-700">
                      Production procedures
                    </span>
                    <div className="mb-2 mt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNoProductionProcedures(true)}
                        className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                          noProductionProcedures
                            ? 'border-green-600 bg-green-600 text-white'
                            : 'border-gray-300 bg-white text-gray-600'
                        }`}
                      >
                        None
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoProductionProcedures(false)}
                        className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${
                          !noProductionProcedures
                            ? 'border-green-600 bg-green-600 text-white'
                            : 'border-gray-300 bg-white text-gray-600'
                        }`}
                      >
                        Specify
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Dedicated line, kosherization, bulk-shipment notes..."
                      value={productionProcedures}
                      disabled={noProductionProcedures}
                      onChange={(event) => setProductionProcedures(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                    />
                    <span className="mt-1 block text-[11.5px] leading-5 text-gray-500">
                      Goes to Schedule D. Usually "None."
                    </span>
                  </label>
                </div>
              </Section>

              <Section
                title={
                  <button
                    type="button"
                    onClick={() => setPulledOpen((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span>
                      Merge Fields &mdash; On File{' '}
                      <span className="text-[11px] font-medium normal-case tracking-normal text-gray-400">
                        {pulledRows.length}, read-only
                      </span>
                    </span>
                    <span className="text-gray-400">{pulledOpen ? 'Collapse' : 'Expand'}</span>
                  </button>
                }
              >
                {pulledOpen ? (
                  <div className="space-y-2 text-sm">
                    {pulledRows.map(([label, value, hint]) => (
                      <div
                        key={label}
                        className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className="min-w-0">
                          <div className="text-[11.5px] font-medium text-gray-500">{label}</div>
                          <div className="mt-1 text-[13.5px] font-semibold leading-5 text-gray-900">
                            {value || '-'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toast.info(hint)}
                          className="whitespace-nowrap text-[11.5px] font-semibold text-blue-700 hover:underline"
                        >
                          Edit at source
                        </button>
                      </div>
                    ))}
                    <p className="text-[11.5px] leading-5 text-gray-500">
                      Read-only here - edited at the source record so values never drift.
                    </p>
                  </div>
                ) : null}
              </Section>

              <Section
                title={
                  <span className="flex items-center justify-between gap-3">
                    <span>Review &amp; Generate</span>
                    <span className="text-[11px] font-medium normal-case tracking-normal text-gray-400">
                      {completeReviewSections}/{reviewSections.length} sections
                    </span>
                  </span>
                }
              >
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <Scale className="h-4 w-4 text-violet-600" />
                          Boilerplate changed or legal input needed?
                        </div>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          {legalReviewNeeded
                            ? 'Routes to Legal for sign-off before the RC is notified.'
                            : 'Standard template - no legal review required.'}
                        </p>
                      </div>
                      <TogglePillGroup value={legalReviewNeeded} onChange={setLegalReviewNeeded} />
                    </div>
                    {legalReviewNeeded ? (
                      <div className="mt-3 text-xs font-semibold text-violet-700">
                        Legal: {legalApproved ? 'signed off' : 'awaiting sign-off'}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {reviewSections.map(([label, complete]) => (
                      <div
                        key={label}
                        className={`flex items-center gap-2 text-sm font-medium ${
                          complete ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        <span className={complete ? 'text-green-600' : 'text-gray-300'}>
                          {complete ? '✓' : '○'}
                        </span>
                        {label}
                      </div>
                    ))}
                  </div>
                  {legalReviewNeeded && !legalApproved ? (
                    <button
                      type="button"
                      onClick={() => setLegalApproved(true)}
                      className="w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-800"
                    >
                      Mark Legal Approved
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!readyToGenerate}
                      onClick={() => {
                        setPackageGenerated(true)
                        toast.success('RC notified for approval')
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <FileText className="h-4 w-4" />
                      Notify RC for approval
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!packageGenerated}
                    onClick={() => setShowEmailPreview(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Mail className="h-4 w-4" />
                    Review Email
                  </button>
                  {packageGenerated ? (
                    <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-3">
                      <div className="text-sm font-semibold text-green-800">
                        RC notified for approval - sent as a live link to review.
                      </div>
                      <div className="rounded-lg border border-green-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                              <Stamp className="h-4 w-4 text-green-600" />
                              Contract returned signed
                            </div>
                          </div>
                          <TogglePillGroup value={contractSigned} onChange={setContractSigned} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-green-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                              <Wallet className="h-4 w-4 text-amber-600" />
                              Await payment before advancing?
                            </div>
                          </div>
                          <TogglePillGroup value={waitForPayment} onChange={setWaitForPayment} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-green-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                              <Check className="h-4 w-4 text-green-600" />
                              Contract invoice paid
                            </div>
                          </div>
                          <TogglePillGroup value={invoicePaid} onChange={setInvoicePaid} />
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!readyToAdvance || confirmTaskMutation.isPending}
                        onClick={handleCompleteTask}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        <ChevronRight className="h-4 w-4" />
                        {confirmTaskMutation.isPending ? 'Completing...' : 'Move to Certification Stage'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </Section>

              {false ? (
                <>
              <Section title="1. Contract Setup">
                <div className="space-y-3">
                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Effective Date
                    </span>
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={(event) => setEffectiveDate(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Annual Fee
                    </span>
                    <input
                      value={annualFee}
                      onChange={(event) => setAnnualFee(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">No special production procedures?</div>
                        <div className="mt-1 text-xs text-gray-500">
                          Matches the demo behavior for a simple “none” Schedule D.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={noProductionProcedures}
                        onChange={(event) => setNoProductionProcedures(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </div>
                  </div>
                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Production Procedures
                    </span>
                    <textarea
                      rows={4}
                      value={productionProcedures}
                      disabled={noProductionProcedures}
                      onChange={(event) => setProductionProcedures(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                    />
                  </label>
                </div>
              </Section>

              <Section title="2. Pulled Records">
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Company</div>
                    <div className="mt-1 font-medium text-gray-900">{companyName}</div>
                    <div className="mt-1 text-gray-600">{companyAddress || 'Address on file'}</div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Signer</div>
                      <div className="mt-1 font-medium text-gray-900">{contact.name}</div>
                      <div className="mt-1 text-gray-600">
                        {[contact.title, contact.email].filter(Boolean).join(' · ') || 'Primary contact'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">OU Roles</div>
                      <div className="mt-1 font-medium text-gray-900">RC: {rcName}</div>
                      <div className="mt-1 text-gray-600">NCRC: {ncrcName}</div>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="3. Generate Package">
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <Scale className="h-4 w-4 text-violet-600" />
                          Legal review required?
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Standard templates can be generated directly. If boilerplate changed, require legal sign-off first.
                        </p>
                      </div>
                      <TogglePillGroup value={legalReviewNeeded} onChange={setLegalReviewNeeded} />
                    </div>
                  </div>

                  {legalReviewNeeded ? (
                    <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-violet-900">Legal Status</div>
                          <div className="mt-1 text-xs text-violet-700">
                            {legalApproved ? 'Legal signed off on the package.' : 'Awaiting legal sign-off before generation.'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLegalApproved((current) => !current)}
                          className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
                        >
                          {legalApproved ? 'Clear Sign-off' : 'Mark Legal Approved'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                    The package includes the agreement body, schedules, and the invoice preview, matching the demo’s contract stage flow.
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!readyToGenerate}
                      onClick={() => {
                        setPackageGenerated(true)
                        toast.success('Contract package generated')
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <FileText className="h-4 w-4" />
                      {packageGenerated ? 'Regenerate Package' : 'Generate Package'}
                    </button>
                    <button
                      type="button"
                      disabled={!packageGenerated}
                      onClick={() => setShowEmailPreview(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Mail className="h-4 w-4" />
                      Review Email
                    </button>
                  </div>
                </div>
              </Section>

              {packageGenerated ? (
                <Section title="4. Completion">
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <Stamp className="h-4 w-4 text-green-600" />
                            Signed contract received?
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Mirrors the demo’s post-generation stage tracking.
                          </p>
                        </div>
                        <TogglePillGroup value={contractSigned} onChange={setContractSigned} />
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <Wallet className="h-4 w-4 text-amber-600" />
                            Wait for payment before advancing?
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            When disabled, the task can complete on signature alone and payment stays flagged.
                          </p>
                        </div>
                        <TogglePillGroup
                          value={waitForPayment}
                          onChange={setWaitForPayment}
                          trueLabel="Wait"
                          falseLabel="Skip"
                        />
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <Check className="h-4 w-4 text-green-600" />
                            Invoice paid?
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Use this to reflect Kashrus payment status in the drawer flow.
                          </p>
                        </div>
                        <TogglePillGroup value={invoicePaid} onChange={setInvoicePaid} />
                      </div>
                    </div>
                    {emailSent ? (
                      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                        Contract package email recorded successfully.
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={!readyToAdvance || confirmTaskMutation.isPending}
                      onClick={handleCompleteTask}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <ChevronRight className="h-4 w-4" />
                      {confirmTaskMutation.isPending ? 'Completing...' : 'Complete Contract Task'}
                    </button>
                  </div>
                </Section>
              ) : null}
                </>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="shrink-0 border-b px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                      Live Preview
                    </div>
                    <div className="mt-1 text-sm text-gray-600">{stageStatus}</div>
                  </div>
                  {legalReviewNeeded && previewTab === 'agreement' ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-slate-500">
                        <input
                          type="checkbox"
                          checked={showClauseChanges}
                          onChange={(event) => setShowClauseChanges(event.target.checked)}
                          className="h-3.5 w-3.5 rounded border-gray-300"
                        />
                        Show changes
                      </label>
                      <select
                        value={activeClauseVersion}
                        onChange={(event) => {
                          setActiveClauseVersion(Number(event.target.value))
                          setEditingClauseId(null)
                          setEditingClauseText('')
                        }}
                        title="Version"
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        {clauseVersions.map((version) => (
                          <option key={version.n} value={version.n}>
                            {version.label} - {version.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['cover', 'Cover'],
                      ['agreement', 'Agreement'],
                      ['a', 'A · Ingredients'],
                      ['b', 'B · Products'],
                      ['c', 'C · Plants'],
                      ['d', 'D · Procedures'],
                      ['e', 'E · Labeling'],
                      ['invoice', 'Invoice'],
                      ['pla', 'PLA'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPreviewTab(value as PreviewTab)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          previewTab === value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f7f8fb] p-5">
                {previewContent}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEmailPreview ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Contract Email Preview</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Review the contract package email before recording it on the application.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailPreview(false)}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100"
                  aria-label="Close contract email preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="rounded-lg border border-gray-200">
                <div className="grid grid-cols-[80px_1fr] border-b px-3 py-2 text-sm">
                  <span className="font-medium text-gray-500">To</span>
                  <span>{contact.email || contact.name || '-'}</span>
                </div>
                <div className="grid grid-cols-[80px_1fr] border-b px-3 py-2 text-sm">
                  <span className="font-medium text-gray-500">Subject</span>
                  <span>{emailSubject}</span>
                </div>
                <div className="grid grid-cols-[80px_1fr] px-3 py-2 text-sm">
                  <span className="font-medium text-gray-500">Attach</span>
                  <span>{packageItems.length} contract documents</span>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                {emailBody.split('\n').map((line, index) =>
                  line ? (
                    <p key={`${line}-${index}`} className={index === 0 ? undefined : 'mt-3'}>
                      {line}
                    </p>
                  ) : null,
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
              <button
                type="button"
                onClick={() => setShowEmailPreview(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isSendingEmail}
                onClick={handleSendEmail}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Send className="h-4 w-4" />
                {isSendingEmail ? 'Sending...' : 'Record Email'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
