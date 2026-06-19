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

type PreviewTab = 'cover' | 'agreement' | 'a' | 'b' | 'c' | 'd' | 'e' | 'invoice'

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

const textValue = (value: unknown) => String(value ?? '').trim()

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
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [annualFee, setAnnualFee] = useState(DEFAULT_ANNUAL_FEE)
  const [productionProcedures, setProductionProcedures] = useState(
    'Plant personnel will use only approved ingredients and certified labels for OU products.',
  )
  const [noProductionProcedures, setNoProductionProcedures] = useState(false)
  const [legalReviewNeeded, setLegalReviewNeeded] = useState(false)
  const [legalApproved, setLegalApproved] = useState(false)
  const [packageGenerated, setPackageGenerated] = useState(false)
  const [contractSigned, setContractSigned] = useState(false)
  const [invoicePaid, setInvoicePaid] = useState(false)
  const [waitForPayment, setWaitForPayment] = useState(true)
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
    setEffectiveDate(new Date().toISOString().slice(0, 10))
    setAnnualFee(DEFAULT_ANNUAL_FEE)
    setProductionProcedures(
      'Plant personnel will use only approved ingredients and certified labels for OU products.',
    )
    setNoProductionProcedures(false)
  }, [open, taskInstanceId])

  const detailAssignedRoles = applicationDetail?.assignedRoles ?? assignedRoles
  const rcName =
    getAssignedRoleValue(detailAssignedRoles, 'RC') ||
    textValue(applicant?.assignedRC) ||
    textValue(username) ||
    'Assigned RC'
  const ncrcName = textValue(username) || 'Current User'
  const detailCompany = applicationDetail?.company?.[0]
  const companyName = textValue(applicationName || applicant?.company || detailCompany?.name) || 'Application'
  const companyAddress = useMemo(() => {
    const address = applicationDetail?.companyAddresses?.[0]
    if (!address) return textValue(applicant?.plant)
    return [address.street, address.line2, address.city, address.state, address.zip, address.country]
      .filter(Boolean)
      .join(', ')
  }, [applicant?.plant, applicationDetail?.companyAddresses])
  const plantLabel =
    textValue(applicant?.plant) ||
    textValue(applicationDetail?.plants?.[0]?.name) ||
    textValue(applicationDetail?.plants?.[0]?.plantId) ||
    'Plant'
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

  const packageItems = [
    'Certification Agreement',
    'Schedule A - Ingredients',
    'Schedule B - Products',
    'Schedule C - Plants & Fee',
    'Schedule D - Production Procedures',
    'Schedule E - Labeling Requirements',
    'Certification Invoice',
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
                  Ingredient Name
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Manufacturer
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Brand
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Packaging
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Symbol / Certification
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contractIngredients.length > 0 ? (
                contractIngredients.map((ingredient, index) => {
                  const status = hasDisplayValue(ingredient.status) ? String(ingredient.status) : '-'

                  return (
                    <tr
                      key={`${ingredient.ingredient ?? 'ingredient'}-${index}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {ingredient.ingredient || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {ingredient.manufacturer || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{ingredient.brand || '-'}</td>
                      <td className="px-4 py-3">
                        {hasDisplayValue(ingredient.packaging) ? (
                          <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {ingredient.packaging}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasDisplayValue(ingredient.certification) ? (
                          <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                            {ingredient.certification}
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
                  <td colSpan={6} className="px-4 py-12 text-center">
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
                  const status = hasDisplayValue(product.status) ? String(product.status) : '-'

                  return (
                    <tr key={`${product.labelName ?? 'product'}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {product.labelName || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{product.brandName || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{product.labelCompany || '-'}</td>
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
                  <td colSpan={7} className="px-4 py-12 text-center">
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
    ) : (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Invoice
            </div>
            <h4 className="mt-2 text-2xl font-semibold text-gray-900">Certification Invoice</h4>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              invoicePaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {invoicePaid ? 'Paid' : 'Awaiting Payment'}
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bill To</div>
            <div className="mt-2 font-medium text-gray-900">{companyName}</div>
            <div className="mt-1 text-sm text-gray-600">{companyAddress || 'Address on file'}</div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Amount Due</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(annualFee)}</div>
            <div className="mt-1 text-sm text-gray-600">Invoice date: {formatDate(effectiveDate)}</div>
          </div>
        </div>
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
            </div>

            <div className="min-h-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                      Live Preview
                    </div>
                    <div className="mt-1 text-sm text-gray-600">{stageStatus}</div>
                  </div>
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
              <div className="min-h-0 overflow-y-auto bg-[#f7f8fb] p-5">{previewContent}</div>
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
