import { useRef } from 'react'
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
  const displayedExpenseAmount = isApplicationFeeOnly ? 0 : expenseAmount
  const total = feeAmount + displayedExpenseAmount
  const invoiceFileName = `Invoice_${invoiceId ?? 'DRAFT'}.pdf`
  const invoiceRef = useRef<HTMLDivElement | null>(null)

  const handlePrint = () => {
    const invoiceContent = invoiceRef.current?.innerHTML
    if (!invoiceContent) return

    const printFrame = document.createElement('iframe')
    printFrame.title = 'Invoice print preview'
    printFrame.style.position = 'fixed'
    printFrame.style.right = '0'
    printFrame.style.bottom = '0'
    printFrame.style.width = '0'
    printFrame.style.height = '0'
    printFrame.style.border = '0'
    document.body.appendChild(printFrame)

    const printDocument = printFrame.contentWindow?.document
    if (!printDocument) {
      document.body.removeChild(printFrame)
      return
    }

    printDocument.open()
    printDocument.write(`
      <!doctype html>
      <html>
        <head>
          <title>${invoiceFileName}</title>
          <style>
            body { margin: 0; background: #fff; color: #111827; font-family: Arial, sans-serif; }
            .invoice-print { padding: 32px; }
            .absolute, .pointer-events-none { display: none !important; }
            .relative { position: relative; }
            .flex { display: flex; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .items-start { align-items: flex-start; }
            .justify-between { justify-content: space-between; }
            .justify-end { justify-content: flex-end; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .font-mono { font-family: monospace; }
            .text-xs { font-size: 12px; }
            .text-sm { font-size: 14px; }
            .text-xl { font-size: 20px; }
            .text-3xl { font-size: 30px; }
            .uppercase { text-transform: uppercase; }
            .tracking-wide { letter-spacing: .025em; }
            .text-blue-900 { color: #1e3a8a; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-800 { color: #1f2937; }
            .text-gray-900 { color: #111827; }
            .text-white { color: #fff; }
            .bg-gray-50 { background: #f9fafb; }
            .bg-blue-900 { background: #1e3a8a; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-y { border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
            .border-gray-100 { border-color: #f3f4f6; }
            .border-gray-200 { border-color: #e5e7eb; }
            .rounded { border-radius: 4px; }
            .w-72 { width: 18rem; }
            .w-full { width: 100%; }
            .gap-8 { gap: 32px; }
            .p-4 { padding: 16px; }
            .p-8 { padding: 32px; }
            .px-4 { padding-left: 16px; padding-right: 16px; }
            .py-3 { padding-top: 12px; padding-bottom: 12px; }
            .py-4 { padding-top: 16px; padding-bottom: 16px; }
            .py-8 { padding-top: 32px; padding-bottom: 32px; }
            .pb-6 { padding-bottom: 24px; }
            .mt-1 { margin-top: 4px; }
            .mt-2 { margin-top: 8px; }
            .mt-5 { margin-top: 20px; }
            .mt-6 { margin-top: 24px; }
            .mt-10 { margin-top: 40px; }
            .leading-6 { line-height: 24px; }
            table { border-collapse: collapse; }
            th, td { vertical-align: top; }
            @page { margin: 0.5in; }
          </style>
        </head>
        <body>
          <div class="invoice-print">${invoiceContent}</div>
        </body>
      </html>
    `)
    printDocument.close()

    const printOnlyInvoice = () => {
      printFrame.contentWindow?.focus()
      printFrame.contentWindow?.print()
      window.setTimeout(() => {
        document.body.removeChild(printFrame)
      }, 500)
    }

    if (printFrame.contentWindow) {
      printFrame.contentWindow.onload = printOnlyInvoice
    }
    window.setTimeout(printOnlyInvoice, 100)
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-100 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase text-gray-500">
          Live preview - {invoiceId ? 'generated' : 'draft'}
        </span>
        <div className="flex gap-2">
          {invoiceDownloadLink ? (
            <a
              href={invoiceDownloadLink}
              download={invoiceFileName}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Download PDF
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 opacity-50 disabled:cursor-not-allowed"
            >
              Download PDF
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Print
          </button>
        </div>
      </div>

      <div ref={invoiceRef} className="relative min-h-[720px] rounded bg-white p-8 shadow-sm">
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
              {displayedExpenseAmount > 0 ? (
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-gray-900">Inspection Expenses</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Travel, lodging, and related expenses estimate
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-medium">{formatCurrency(displayedExpenseAmount)}</td>
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
