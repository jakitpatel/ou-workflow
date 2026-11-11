/** How a plant-addendum contract is billed: on the company's invoice, or per plant. */
export type ContractBillingType = 'company' | 'plant'

export const DEFAULT_CONTRACT_BILLING_TYPE: ContractBillingType = 'company'

export const CONTRACT_BILLING_TYPE_OPTIONS: Array<{ value: ContractBillingType; label: string }> = [
  { value: 'company', label: 'Company-level billing' },
  { value: 'plant', label: 'Plant-level billing' },
]

export const toContractBillingType = (value: unknown): ContractBillingType | undefined => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return normalized === 'company' || normalized === 'plant' ? normalized : undefined
}

/**
 * The billing type from the application detail response's "Fee" section
 * (applicationInfo.Fee.billingType: "company" | "plant"). The section may be an object or a
 * one-item list and its key may be "Fee" or "fee". Anything else means company-level billing.
 */
export function getDetailBillingType(detail: unknown): ContractBillingType {
  if (!detail || typeof detail !== 'object') return DEFAULT_CONTRACT_BILLING_TYPE
  const record = detail as Record<string, unknown>
  const section = record.Fee ?? record.fee
  const fee = Array.isArray(section) ? section[0] : section
  if (!fee || typeof fee !== 'object') return DEFAULT_CONTRACT_BILLING_TYPE
  const feeRecord = fee as Record<string, unknown>
  return (
    toContractBillingType(feeRecord.billingType ?? feeRecord.BillingType) ??
    DEFAULT_CONTRACT_BILLING_TYPE
  )
}
