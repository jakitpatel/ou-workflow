import type { Applicant, ApplicantsResponse, Stage } from '@/types/application'

type BackendPrelimApplicant = Partial<Applicant> & {
  companyName?: string
  CompanyName?: string
  plantName?: string
  PlantName?: string
  applicationId?: number
  ApplicationId?: number
  ApplicationID?: number
  id?: number
  stages?: Record<string, Stage>
}

export type BackendPrelimApplicantsResponse = {
  data?: BackendPrelimApplicant[]
  meta?: Partial<ApplicantsResponse['meta']>
  status?: ApplicantsResponse['status']
}

export function mapPrelimApplicantsResponse(
  response: BackendPrelimApplicantsResponse,
): ApplicantsResponse {
  const normalizedData: Applicant[] = (response.data ?? []).map((applicant) => {
    const applicationId =
      applicant.applicationId ?? applicant.ApplicationId ?? applicant.ApplicationID ?? applicant.id ?? 0

    return {
      ...(applicant as Partial<Applicant>),
      id: applicant.id ?? applicationId,
      applicationId,
      company: applicant.company ?? applicant.companyName ?? applicant.CompanyName ?? '',
      plant: applicant.plant ?? applicant.plantName ?? applicant.PlantName ?? '',
      region: applicant.region ?? '',
      priority: applicant.priority ?? 'NORMAL',
      status: applicant.status ?? '',
      assignedRC: applicant.assignedRC ?? '',
      daysInProcess: applicant.daysInProcess ?? 0,
      overdue: applicant.overdue ?? false,
      daysOverdue: applicant.daysOverdue ?? 0,
      lastUpdate: applicant.lastUpdate ?? '',
      nextAction: applicant.nextAction ?? '',
      documents: applicant.documents ?? 0,
      notes: applicant.notes ?? 0,
      // Important for prelim flow: preserve original stage key casing (e.g. "Intake")
      stages: (applicant.stages ?? {}) as Record<string, Stage>,
    }
  })

  return {
    data: normalizedData,
    meta: {
      async_enabled: response.meta?.async_enabled ?? false,
      count: response.meta?.count ?? normalizedData.length,
      limit: response.meta?.limit ?? normalizedData.length,
      offset: response.meta?.offset ?? 0,
      processing_time: response.meta?.processing_time ?? 0,
      total_count: response.meta?.total_count ?? normalizedData.length,
    },
    status: response.status ?? 'ok',
  }
}
