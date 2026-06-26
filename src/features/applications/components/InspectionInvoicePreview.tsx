import { useRef } from 'react'
import type { Applicant } from '@/types/application'
import {
  APPLICATION_FEE_DESCRIPTION,
  formatCurrency,
  formatInvoiceDate,
  getApplicantAccountNumber,
  INITIAL_INSPECTION_FEE_DESCRIPTION,
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
            body { margin: 0; background: #fff; color: #1e1e2e; font-family: Arial, sans-serif; }
            .invoice-print { padding: 32px; }
            .absolute, .pointer-events-none { display: none !important; }
            .relative { position: relative; }
            .flex { display: flex; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .invoice-meta-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .invoice-contact-grid { grid-template-columns: 1fr 1.5fr; }
            .items-start { align-items: flex-start; }
            .justify-between { justify-content: space-between; }
            .justify-end { justify-content: flex-end; }
            .flex-1 { flex: 1 1 0%; }
            .shrink-0 { flex-shrink: 0; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .font-mono { font-family: monospace; }
            .font-serif { font-family: Georgia, 'Times New Roman', serif; }
            .font-sans { font-family: Arial, sans-serif; }
            .text-\\[6px\\] { font-size: 6px; }
            .text-\\[9\\.5px\\] { font-size: 9.5px; }
            .text-\\[10px\\] { font-size: 10px; }
            .text-\\[10\\.5px\\] { font-size: 10.5px; }
            .text-\\[11px\\] { font-size: 11px; }
            .text-\\[11\\.5px\\] { font-size: 11.5px; }
            .text-\\[12px\\] { font-size: 12px; }
            .text-xs { font-size: 12px; }
            .text-sm { font-size: 14px; }
            .text-xl { font-size: 20px; }
            .text-2xl { font-size: 24px; }
            .uppercase { text-transform: uppercase; }
            .tracking-wide { letter-spacing: .025em; }
            .leading-tight { line-height: 1.25; }
            .leading-normal { line-height: 1.5; }
            .text-\\[\\#185087\\] { color: #185087; }
            .text-\\[\\#1e1e2e\\] { color: #1e1e2e; }
            .text-blue-900 { color: #1e3a8a; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-800 { color: #1f2937; }
            .text-gray-900 { color: #111827; }
            .text-slate-500 { color: #64748b; }
            .text-white { color: #fff; }
            .bg-\\[\\#185087\\] { background: #185087; }
            .bg-\\[\\#d9d9d9\\] { background: #d9d9d9; }
            .bg-gray-50 { background: #f9fafb; }
            .bg-blue-900 { background: #1e3a8a; }
            .bg-blue-100 { background: #dbeafe; }
            .border { border: 1px solid #d1d5db; }
            .border-r { border-right: 1px solid #d1d5db; }
            .border-t { border-top: 1px solid #d1d5db; }
            .border-l { border-left: 1px solid #d1d5db; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-y { border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
            .border-gray-100 { border-color: #f3f4f6; }
            .border-gray-200 { border-color: #e5e7eb; }
            .border-gray-300 { border-color: #d1d5db; }
            .border-gray-400 { border-color: #9ca3af; }
            .last\\:border-r-0:last-child { border-right: 0; }
            .rounded { border-radius: 4px; }
            .rounded-md { border-radius: 6px; }
            .rounded-sm { border-radius: 2px; }
            .h-\\[46px\\] { height: 46px; }
            .w-\\[46px\\] { width: 46px; }
            .w-\\[84px\\] { width: 84px; }
            .w-full { width: 100%; }
            .gap-3 { gap: 12px; }
            .p-1 { padding: 4px; }
            .p-5 { padding: 20px; }
            .px-1 { padding-left: 4px; padding-right: 4px; }
            .px-2 { padding-left: 8px; padding-right: 8px; }
            .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
            .py-1 { padding-top: 4px; padding-bottom: 4px; }
            .py-4 { padding-top: 16px; padding-bottom: 16px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-4 { margin-bottom: 16px; }
            .mt-0\\.5 { margin-top: 2px; }
            .mt-1 { margin-top: 4px; }
            .mt-1\\.5 { margin-top: 6px; }
            .mt-2 { margin-top: 8px; }
            .mt-4 { margin-top: 16px; }
            .pt-1 { padding-top: 4px; }
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
    <div className="h-full overflow-y-auto bg-[#f7f8fb] p-5 font-serif text-[13.5px] leading-relaxed">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-sans text-xs font-semibold uppercase text-gray-500">
          Live preview - {invoiceId ? 'generated' : 'draft'}
        </span>
        <div className="flex gap-2">
          {invoiceDownloadLink ? (
            <a
              href={invoiceDownloadLink}
              download={invoiceFileName}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Download PDF
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 opacity-50 disabled:cursor-not-allowed"
            >
              Download PDF
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Print
          </button>
        </div>
      </div>

      <div ref={invoiceRef} className="relative rounded-xl border border-gray-200 bg-white p-6">
        {!invoiceId ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="-rotate-12 font-sans text-7xl font-bold text-gray-100">DRAFT</span>
          </div>
        ) : null}
        {paid ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="-rotate-12 font-sans text-7xl font-bold text-green-100">PAID</span>
          </div>
        ) : null}

        <div className="relative overflow-x-auto">
          <div className="min-w-[560px] rounded-md border border-gray-300 bg-white p-5 font-sans text-[11px] leading-normal text-[#1e1e2e]">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-sm bg-[#185087] p-1 text-center text-[6px] font-bold leading-tight text-white">
                KOSHER CERTIFICATION SERVICE
              </div>
              <div className="flex-1">
                <div className="font-serif text-[11.5px] font-semibold tracking-wide text-[#1e1e2e]">
                  ORTHODOX UNION
                </div>
                <div className="mt-0.5 text-[10px] text-gray-700">Kashruth Division</div>
                <div className="text-[10px] text-gray-700">11 Broadway, New York, NY 10004</div>
              </div>
              <div className="font-serif text-2xl font-bold tracking-wide text-[#185087]">
                INVOICE
                <div className="mt-0.5 text-right font-mono text-[11px] font-semibold tracking-normal text-slate-500">
                  #{invoiceId ?? 'DRAFT'}
                </div>
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
                  {[invoiceId ?? 'DRAFT', formatInvoiceDate(invoiceDate), formatCurrency(total), accountNumber || '-'].map(
                    (value, index) => (
                      <td
                        key={`${value}-${index}`}
                        className="border-r border-t border-gray-300 px-2 py-1 text-center text-[11px] font-bold last:border-r-0"
                      >
                        {value}
                      </td>
                    ),
                  )}
                </tr>
              </tbody>
            </table>

            <div className="mb-4 grid grid-cols-[1fr_1.5fr] items-start gap-3">
              <div className="text-[10.5px] leading-normal">
                <div className="mb-1 text-[9.5px] font-bold uppercase tracking-wide text-gray-500">
                  Bill To
                </div>
                <strong>{applicant?.company || 'Customer'}</strong>
                <br />
                Attn: Primary Contact
                <br />
                {applicant?.plant || 'Plant'}
                <br />
                {applicant?.region || 'Region'}
              </div>
              <div className="border border-gray-400">
                <div className="border-b border-gray-400 px-2 py-1 text-center text-[10px] font-bold">
                  Invoice Details
                </div>
                <table className="w-full border-collapse">
                  <tbody>
                    {[
                      ['Invoice Date', formatInvoiceDate(invoiceDate)],
                      ['Plant', applicant?.plant || '-'],
                      ['Account Number', accountNumber || '-'],
                    ].map(([label, value]) => (
                      <tr key={label}>
                        <td className="border-r border-t border-gray-300 px-2 py-1 text-[9.5px] font-bold">
                          {label}
                        </td>
                        <td className="border-t border-gray-300 px-2 py-1 text-[10.5px] font-semibold">
                          {value}
                        </td>
                      </tr>
                    ))}
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
                    <strong>{isApplicationFeeOnly ? 'Application Fee' : 'Initial Inspection Fee'}</strong>
                    <div className="mt-1 text-[10px] text-gray-600">
                      {isApplicationFeeOnly
                        ? APPLICATION_FEE_DESCRIPTION
                        : INITIAL_INSPECTION_FEE_DESCRIPTION}
                    </div>
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-center text-[9.5px] font-bold">
                    Fees
                  </td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-right">
                    {formatCurrency(feeAmount)}
                  </td>
                </tr>
                {displayedExpenseAmount > 0 ? (
                  <tr>
                    <td className="px-2 py-1">
                      <strong>Inspection Expenses</strong>
                      <div className="mt-1 text-[10px] text-gray-600">
                        Travel, lodging, and related expenses estimate
                      </div>
                    </td>
                    <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-center text-[9.5px] font-bold">
                      Expenses
                    </td>
                    <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-right">
                      {formatCurrency(displayedExpenseAmount)}
                    </td>
                  </tr>
                ) : null}
                <tr className="border-t border-gray-400 bg-[#d9d9d9] text-[11px] font-bold">
                  <td className="px-2 py-1">Subtotal</td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1"></td>
                  <td className="w-[84px] border-l border-gray-300 px-2 py-1 text-right">
                    {formatCurrency(total)}
                  </td>
                </tr>
                <tr className="bg-[#185087] text-[11px] font-bold text-white">
                  <td className="px-2 py-1">Total Due (USD)</td>
                  <td className="w-[84px] border-l border-blue-900 px-2 py-1"></td>
                  <td className="w-[84px] border-l border-blue-900 px-2 py-1 text-right">
                    {formatCurrency(total)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="border border-gray-400 bg-blue-100 px-2 py-1 text-[10px] font-semibold leading-normal text-blue-900">
              <strong>Payment terms:</strong> Net 30. Please remit via ACH, credit card, or wire.
              Online payment is available at https://oudirect.org. Reference invoice number with
              payment. Questions? Contact billing@ou.org or (212) 613-8000.
            </div>

            <div className="mt-4 flex items-start justify-between gap-3 text-[9.5px]">
              <div>
                <span className="font-bold">ORTHODOX UNION</span>
                <br />
                Kashruth Division
                <br />
                11 Broadway, New York, NY 10004
              </div>
              <div>Payable in US Dollars</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
