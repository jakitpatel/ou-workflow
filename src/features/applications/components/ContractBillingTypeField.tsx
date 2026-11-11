import { useId } from 'react'

import {
  CONTRACT_BILLING_TYPE_OPTIONS,
  type ContractBillingType,
} from '@/features/applications/lib/contractBillingType'

/**
 * Contract setup "Billing type" for a plant addendum: company-level or plant-level billing.
 * Read-only: the server defines it (application detail Fee.billingType).
 */
export function ContractBillingTypeField({ value }: { value: ContractBillingType }) {
  const labelId = useId()
  const label =
    CONTRACT_BILLING_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value

  return (
    <div className="block text-sm" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="text-[12.5px] font-semibold text-gray-700">
        Billing type
      </span>
      <div
        className="mt-1 w-full rounded-[7px] border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600"
        data-testid="contract-billing-type"
      >
        {label}
      </div>
      <span className="mt-1 block text-[11.5px] leading-5 text-gray-500">
        Set by the application&apos;s fee settings.
      </span>
    </div>
  )
}
