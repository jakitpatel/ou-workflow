import { useRef } from 'react'
import type { Applicant } from '@/types/application'
import {
  formatCurrency,
  formatInvoiceDate,
  getApplicantAccountNumber,
  type InspectionInvoiceCustomer,
} from '@/features/applications/hooks/useInspectionInvoiceDrawerState'

type Props = {
  applicant?: Applicant
  customer: InspectionInvoiceCustomer
  expenseAmount: number
  feeAmount: number
  invoiceDate: string
  invoiceDownloadLink: string | null
  invoiceId: string | null
  isApplicationFeeOnly: boolean
  paid: boolean
}

const invoiceStyles = `
.ou-invoice{box-sizing:border-box;min-height:720px;padding:24px 28px 18px;background:#fff;color:#111;font:10px Arial,sans-serif}.ou-invoice *{box-sizing:border-box}
.ou-head{display:flex;align-items:flex-start;gap:12px}.ou-mark{display:flex;height:62px;width:62px;flex:none;flex-direction:column;align-items:center;justify-content:center;background:#0664a8;color:#fff;font-weight:700}
.ou-circle{display:flex;height:34px;width:34px;align-items:center;justify-content:center;border:3px solid #fff;border-radius:50%;font-size:20px}.ou-mark small{margin-top:3px;font-size:5px;text-align:center}
.ou-brand{flex:1;color:#07579a}.ou-brand-title{font:italic 30px Georgia,serif}.ou-brand-sub{margin-top:5px;color:#222;font-size:8px;font-weight:700;letter-spacing:.35px}.ou-brand-address{margin-top:2px;color:#444;font-size:8px}
.ou-title{align-self:flex-end;padding-bottom:4px;color:#07579a;font:16px Georgia,serif;letter-spacing:4px}.meta{margin:8px 0 10px 118px;width:calc(100% - 118px);border-collapse:collapse}.meta th{background:#d3d3d3;font-size:8px}.meta th,.meta td{border:1px solid #999;padding:3px;text-align:center}.meta td{font-weight:700}
.info-row{display:grid;grid-template-columns:1fr 1.2fr;gap:18px;min-height:112px}.bill{line-height:1.35}.bill strong{font-size:11px}.right-info{display:flex;flex-direction:column;align-items:flex-end}
.pay-note{max-width:310px;color:#07579a;font-size:8px;font-style:italic;font-weight:700;text-align:center}.pay-box{margin-top:5px;width:210px;border:1px solid #555}.pay-box h4,.contact-box h4{margin:0;background:#bbb;padding:2px 5px;color:#07579a;font-size:8px}.pay-box div{padding:4px 6px;font-size:8px;line-height:1.3}
.reference{margin:4px 0 7px;text-align:center;font-size:8px;font-style:italic}.contact-box{margin-left:auto;width:66%;border:1px solid #555}.contact-box h4{text-align:center;color:#111}.contact-grid{display:grid;grid-template-columns:1.5fr .8fr 1fr}.contact-grid span{padding:3px;text-align:center;font-size:8px}
.due{margin:4px 0 12px 34%;width:66%;border-collapse:collapse}.due th{background:#d3d3d3}.due th,.due td{border:1px solid #777;padding:3px;text-align:center;font-size:8px}.due td{font-weight:700}
.charges{width:100%;height:330px;border-collapse:collapse}.charges th{background:#c8c8c8;font-size:10px}.charges th,.charges td{border:1px solid #555;padding:4px 6px}.charges .desc{width:74%;text-align:left}.charges .amount{width:26%;text-align:center}.charges .section td{height:22px;background:#c8c8c8;font-weight:700}.charges .detail td{height:230px;vertical-align:top}
.amount-split{display:grid;grid-template-columns:1fr 1fr;text-align:center}.amount-split strong{display:block;margin-bottom:8px}.charges .total td{height:24px;background:#c8c8c8;font-weight:700}.total-label{text-align:right;font-style:italic}.total-value{text-align:center}
.footer{display:flex;justify-content:space-between;margin-top:8px;font-size:7px}.footer strong{display:block}.footer-center{font-weight:700}.stamp{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}.stamp span{transform:rotate(-12deg);font-size:68px;font-weight:700;color:#eef1f4}
@media print{.ou-invoice{min-height:9.7in;padding:0}}
`

export function InspectionInvoicePreview(props: Props) {
  const { applicant, customer, expenseAmount, feeAmount, invoiceDate, invoiceDownloadLink, invoiceId, isApplicationFeeOnly, paid } = props
  const invoiceRef = useRef<HTMLDivElement | null>(null)
  const accountNumber = getApplicantAccountNumber(applicant)
  const expenses = isApplicationFeeOnly ? 0 : expenseAmount
  const total = feeAmount + expenses
  const fileName = `Invoice_${invoiceId ?? 'DRAFT'}.pdf`
  const date = formatInvoiceDate(invoiceDate)

  const handlePrint = () => {
    const content = invoiceRef.current?.innerHTML
    if (!content) return
    const frame = document.createElement('iframe')
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
    document.body.appendChild(frame)
    const doc = frame.contentWindow?.document
    if (!doc) return frame.remove()
    doc.open()
    doc.write(`<!doctype html><html><head><title>${fileName}</title></head><body style="margin:0">${content}</body></html>`)
    doc.close()
    window.setTimeout(() => {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
      window.setTimeout(() => frame.remove(), 500)
    }, 100)
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-100 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase text-slate-500">Live preview — {invoiceId ? 'generated' : 'draft'}</span>
        <div className="flex gap-2">
          {invoiceDownloadLink ? <a href={invoiceDownloadLink} download={fileName} target="_blank" rel="noreferrer" className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">Download PDF</a> : <button disabled className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-400">Download PDF</button>}
          <button type="button" onClick={handlePrint} className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">Print</button>
        </div>
      </div>
      <div ref={invoiceRef} className="relative mx-auto max-w-[760px] overflow-hidden rounded-sm border border-slate-300 bg-white shadow-sm">
        <style>{invoiceStyles}</style>
        {!invoiceId || paid ? <div className="stamp"><span>{paid ? 'PAID' : 'DRAFT'}</span></div> : null}
        <article className="ou-invoice">
          <header className="ou-head">
            <div className="ou-mark"><div className="ou-circle">U</div><small>KOSHER<br />CERTIFICATION<br />SERVICE</small></div>
            <div className="ou-brand"><div className="ou-brand-title">Orthodox Union</div><div className="ou-brand-sub">UNION OF ORTHODOX JEWISH CONGREGATIONS OF AMERICA</div><div className="ou-brand-address">FORTY RECTOR STREET, 4TH FLOOR &nbsp; / &nbsp; NEW YORK, NY 10006</div></div>
            <div className="ou-title">INVOICE</div>
          </header>
          <table className="meta"><thead><tr><th>Invoice Number</th><th>Invoice Date</th><th>Amount</th><th>Account Number</th></tr></thead><tbody><tr><td>{invoiceId ?? 'DRAFT'}</td><td>{date}</td><td>{formatCurrency(total)}</td><td>{accountNumber || '—'}</td></tr></tbody></table>
          <div className="info-row">
            <div className="bill"><strong>{applicant?.company || 'Customer'}</strong><br />{customer.addressLines.length ? customer.addressLines.map((line) => <span key={line}>{line}<br /></span>) : <>{applicant?.plant || 'Plant'}<br />{applicant?.region || ''}<br /></>}<br />Attn {customer.billingContactName || 'Accounts Payable'}</div>
            <div className="right-info"><div className="pay-note">The Orthodox Union strongly urges all customers to pay by ACH, wire, or credit card to avoid check fraud. It&apos;s safer and quicker.</div><div className="pay-box"><h4>Online Payments: oudirect.org</h4><div><strong>Wire/ACH Bank Info:</strong><br />Bank: JPMorgan Chase Bank<br />Account: Orthodox Union<br />Account #: 1353211<br />ABA #: 021000021<br />Swift #: CHASUS33</div></div></div>
          </div>
          <div className="reference">For wire transfers, please reference your account and invoice numbers on all transactions.</div>
          <div className="contact-box"><h4>For questions or comments, contact your Rabbinic Coordinator.</h4><div className="contact-grid"><span>{customer.coordinatorName || 'Rabbinic Coordinator'}</span><span>{customer.coordinatorPhone || '(212) 613-8000'}</span><span>{customer.coordinatorEmail || 'billing@ou.org'}</span></div></div>
          <table className="due"><thead><tr><th>Invoice #</th><th>Invoice Date</th><th>Amount</th><th>Due Date</th><th>Account #</th></tr></thead><tbody><tr><td>{invoiceId ?? 'DRAFT'}</td><td>{date}</td><td>{formatCurrency(total)}</td><td>Upon receipt</td><td>{accountNumber || '—'}</td></tr></tbody></table>
          <table className="charges"><thead><tr><th className="desc">DESCRIPTION</th><th className="amount">Amount</th></tr></thead><tbody>
            <tr className="section"><td>{isApplicationFeeOnly ? 'Application Fee' : 'Application/Initial Inspection Fee'}</td><td><div className="amount-split"><strong>Fees</strong><strong>Expenses</strong></div></td></tr>
            <tr className="detail"><td><strong>Details</strong><br /><br />{applicant?.plant || applicant?.company || 'Application'}</td><td><div className="amount-split"><span>{formatCurrency(feeAmount)}</span><span>{formatCurrency(expenses)}</span></div></td></tr>
            <tr className="total"><td className="total-label">Total Amount Due</td><td className="total-value">{formatCurrency(total)} USD</td></tr>
          </tbody></table>
          <footer className="footer"><div><strong>UNION OF ORTHODOX JEWISH CONGREGATIONS OF AMERICA</strong>40 Rector St., 4th Floor, New York, NY 10006<br />(212) 563-4000 &nbsp; fax (212) 564-9058</div><div className="footer-center">Payable in US Dollars</div></footer>
        </article>
      </div>
    </div>
  )
}
