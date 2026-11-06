import { fetchWithAuth } from '@/shared/api/httpClient'

export function saveScheduleProductSelection(
  productIds: string[],
  selected: boolean,
  token?: string | null,
): Promise<unknown> {
  return fetchWithAuth({
    path: '/schedule_products',
    method: 'POST',
    body: { [selected ? 'selected_ids' : 'unselected_ids']: productIds.join(',') },
    token,
    // `/schedule_products` answers {status: "ok", ids: [...]} once it has committed the change.
    expectBody: (body) => (body as { status?: unknown }).status === 'ok',
  })
}
