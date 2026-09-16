import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { fetchPrelimApplications } from '@/features/prelim/api'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'
import type { SSEMessage } from '@/hooks/useSSE'
import type { Applicant, ApplicantsResponse } from '@/types/application'

type ListCache = ApplicantsResponse | InfiniteData<ApplicantsResponse>

const matchesId = (application: Applicant, id: number) =>
  String(application.applicationId ?? application.id) === String(id)

const pagesOf = (cache: ListCache) => ('pages' in cache ? cache.pages : [cache])

export async function refreshSubmissionApplicationFromEvent(
  message: SSEMessage,
  queryClient: QueryClient,
  token?: string | null,
): Promise<void> {
  if (
    message?.type !== 'reload_submission_application' ||
    message.data?.ApplicationType !== 'SUBMISSION'
  ) return

  const rawId = message.data.application_id
  if (typeof rawId !== 'number' && typeof rawId !== 'string') return
  const applicationId = Number(rawId)
  if (!String(rawId).trim() || !Number.isSafeInteger(applicationId) || applicationId <= 0) return

  const cached = queryClient.getQueriesData<ListCache>({ queryKey: prelimQueryKeys.lists() })
  if (!cached.some(([, cache]) =>
    cache && pagesOf(cache).some((page) => page.data.some((app) => matchesId(app, applicationId))),
  )) return

  const response = await fetchPrelimApplications({ applicationId, page: 0, limit: 1, token })
  const updated = response.data.find((app) => matchesId(app, applicationId))
  if (!updated) return

  const patchPage = (page: ApplicantsResponse): ApplicantsResponse => {
    if (!page.data.some((app) => matchesId(app, applicationId))) return page
    return { ...page, data: page.data.map((app) => matchesId(app, applicationId) ? updated : app) }
  }

  queryClient.setQueriesData<ListCache>({ queryKey: prelimQueryKeys.lists() }, (cache) => {
    if (!cache) return cache
    if (!('pages' in cache)) return patchPage(cache)
    const pages = cache.pages.map(patchPage)
    return pages.every((page, index) => page === cache.pages[index]) ? cache : { ...cache, pages }
  })
}
