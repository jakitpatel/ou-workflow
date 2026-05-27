import type { QueryClient } from '@tanstack/react-query'
import { fetchApplicants } from '@/features/applications/api'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import type { Applicant, ApplicantsResponse } from '@/types/application'

type RefreshApplicationListCacheParams = {
  applicationId?: string | number | null
  queryClient: QueryClient
  token?: string | null
}

const getApplicantKey = (applicant: Partial<Applicant> | null | undefined): string => {
  const candidate = applicant?.applicationId ?? applicant?.id
  return candidate === undefined || candidate === null ? '' : String(candidate)
}

const patchApplicantList = (
  applicants: Applicant[],
  updatedApplication: Applicant,
  requestedApplicationId: string,
): Applicant[] => {
  let changed = false
  const updatedKey = getApplicantKey(updatedApplication)

  const nextApplicants = applicants.map((applicant) => {
    const applicantKey = getApplicantKey(applicant)
    const isMatch =
      applicantKey === updatedKey ||
      applicantKey === requestedApplicationId ||
      String(applicant.id) === String(updatedApplication.id)

    if (!isMatch) return applicant

    changed = true
    return updatedApplication
  })

  return changed ? nextApplicants : applicants
}

const patchApplicationsCacheValue = (
  current: unknown,
  updatedApplication: Applicant,
  requestedApplicationId: string,
): unknown => {
  if (!current || typeof current !== 'object') return current

  if (Array.isArray(current)) {
    return patchApplicantList(current as Applicant[], updatedApplication, requestedApplicationId)
  }

  const record = current as Record<string, any>

  if (Array.isArray(record.data)) {
    const nextData = patchApplicantList(
      record.data as Applicant[],
      updatedApplication,
      requestedApplicationId,
    )

    return nextData === record.data ? current : { ...record, data: nextData }
  }

  if (Array.isArray(record.pages)) {
    let changed = false
    const nextPages = record.pages.map((page: ApplicantsResponse) => {
      if (!page || typeof page !== 'object' || !Array.isArray(page.data)) {
        return page
      }

      const nextData = patchApplicantList(page.data, updatedApplication, requestedApplicationId)
      if (nextData === page.data) return page

      changed = true
      return { ...page, data: nextData }
    })

    return changed ? { ...record, pages: nextPages } : current
  }

  return current
}

export async function refreshApplicationInListCaches({
  applicationId,
  queryClient,
  token,
}: RefreshApplicationListCacheParams): Promise<boolean> {
  const requestedApplicationId =
    applicationId === undefined || applicationId === null ? '' : String(applicationId).trim()

  if (!requestedApplicationId) {
    return false
  }

  const parsedApplicationId = Number(requestedApplicationId)
  if (!Number.isFinite(parsedApplicationId)) {
    return false
  }

  const response = await fetchApplicants({
    applicationId: parsedApplicationId,
    limit: 1,
    myOnly: false,
    page: 0,
    token,
  })
  const updatedApplication = response.data[0]

  if (!updatedApplication) {
    return false
  }

  queryClient.setQueriesData({ queryKey: applicationsQueryKeys.lists() }, (current) =>
    patchApplicationsCacheValue(current, updatedApplication, requestedApplicationId),
  )

  return true
}
