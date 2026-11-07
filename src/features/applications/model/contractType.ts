import { normalizeCreationFlag } from './applicationOverview'

export const NEW_COMPANY_CONTRACT_LABEL = 'New Company Certification'
export const PLANT_ADDENDUM_CONTRACT_LABEL = 'Plant Addendum Certification'

/**
 * A contract is a new-company certification only when get_application_details_v2 marks the
 * company new (applicationInfo.company[0].is_new === "Y"); otherwise, including when the flag is
 * missing, it is a plant addendum.
 */
export const isNewCompanyContractDetail = (
  detail?: { company?: ReadonlyArray<unknown> | null } | null,
) => {
  // The shared Company type has no is_new; the v2 detail response carries it on the record.
  const company = detail?.company?.[0]
  const isNew = company && typeof company === 'object' ? (company as { is_new?: unknown }).is_new : undefined
  return normalizeCreationFlag(isNew) === true
}

export const getContractTypeLabel = (isNewCompany: boolean) =>
  isNewCompany ? NEW_COMPANY_CONTRACT_LABEL : PLANT_ADDENDUM_CONTRACT_LABEL
