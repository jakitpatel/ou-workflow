import type { Applicant } from '@/types/application'
import {
  formatCurrency,
  formatInvoiceDate,
  getApplicantAccountNumber,
} from '@/features/applications/hooks/useInspectionInvoiceDrawerState'

type Props = {
  applicant?: Applicant
  expenseAmount: number
  feeAmount: number
  invoiceDate: string
  invoiceDownloadLink: string | null
  invoiceId: string | null
  isApplicationFeeOnly: boolean
  paid: boolean
}

export function InspectionInvoicePreview({
  applicant,
  expenseAmount,
  feeAmount,
  invoiceDate,
  invoiceDownloadLink,
  invoiceId,
  isApplicationFeeOnly,
  paid,
}: Props) {
  const accountNumber = getApplicantAccountNumber(applicant)
  const total = feeAmount + expenseAmount

  return (
    <div className="h-full overflow-y-auto bg-slate-100 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase text-gray-500">
          Live preview - {invoiceId ? 'generated' : 'draft'}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!invoiceDownloadLink}
            onClick={() => {
              if (invoiceDownloadLink) window.open(invoiceDownloadLink, '_blank', 'noopener,noreferrer')
            }}
            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download PDF
          </button>
          <button type="button" className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
            Print
          </button>
        </div>
      </div>

      <div className="relative min-h-[720px] rounded bg-white p-8 shadow-sm">
        {!invoiceId ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="-rotate-12 text-7xl font-bold text-gray-100">DRAFT</span>
          </div>
        ) : null}
        {paid ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="-rotate-12 text-7xl font-bold text-green-100">PAID</span>
          </div>
        ) : null}

        <div className="relative">
          <div className="flex items-start justify-between border-b border-gray-200 pb-6">
            <div>
              <div className="text-xl font-bold tracking-wide text-blue-900">ORTHODOX UNION</div>
              <div className="mt-1 text-sm text-gray-500">Kashruth Division</div>
              <div className="text-sm text-gray-500">11 Broadway, New York, NY 10004</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">INVOICE</div>
              <div className="mt-1 font-mono text-sm text-gray-500">#{invoiceId ?? 'DRAFT'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 py-8">
            <div>
              <div className="text-xs font-semibold uppercase text-gray-500">Bill To</div>
              <div className="mt-2 text-sm leading-6 text-gray-800">
                <strong>{applicant?.company || 'Customer'}</strong>
                <br />
                Attn: Primary Contact
                <br />
                {applicant?.plant || 'Plant'}
                <br />
                {applicant?.region || 'Region'}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-gray-500">Invoice Date</div>
              <div className="mt-2 text-sm font-medium text-gray-900">{formatInvoiceDate(invoiceDate)}</div>
              <div className="mt-5 text-xs font-semibold uppercase text-gray-500">Plant</div>
              <div className="mt-2 text-sm font-medium text-gray-900">{applicant?.plant || '-'}</div>
              <div className="mt-5 text-xs font-semibold uppercase text-gray-500">Account Number</div>
              <div className="mt-2 font-mono text-sm text-gray-900">{accountNumber || '-'}</div>
            </div>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Description</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-4">
                  <div className="font-semibold text-gray-900">
                    {isApplicationFeeOnly ? 'Application Fee' : 'Initial Inspection Fee'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {isApplicationFeeOnly
                      ? 'Standard new application processing fee'
                      : 'Professional services - kosher certification initial inspection'}
                  </div>
                </td>
                <td className="px-4 py-4 text-right font-medium">{formatCurrency(feeAmount)}</td>
              </tr>
              {expenseAmount > 0 ? (
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-gray-900">Inspection Expenses</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Travel, lodging, and related expenses estimate
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-medium">{formatCurrency(expenseAmount)}</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end">
            <div className="w-72 rounded border border-gray-200">
              <div className="flex justify-between border-b border-gray-100 px-4 py-3 text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between bg-blue-900 px-4 py-3 text-sm font-bold text-white">
                <span>Total Due (USD)</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded bg-gray-50 p-4 text-xs leading-6 text-gray-600">
            <strong>Payment terms:</strong> Net 30. Please remit via ACH, credit card, or wire.
            Online payment is available at https://oudirect.org. Reference invoice number with
            payment. Questions? Contact billing@ou.org or (212) 613-8000.
          </div>
        </div>
      </div>
    </div>
  )
}
