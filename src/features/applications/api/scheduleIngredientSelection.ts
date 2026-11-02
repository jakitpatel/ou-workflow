import { fetchWithAuth } from '@/shared/api/httpClient'

export function saveScheduleIngredientSelection(
  ingredientIds: string[],
  selected: boolean,
  token?: string | null,
): Promise<unknown> {
  return fetchWithAuth({
    path: '/schedule_ingredients',
    method: 'POST',
    body: { [selected ? 'selected_ids' : 'unselected_ids']: ingredientIds.join(',') },
    token,
    // `/schedule_ingredients` answers {status: "ok", ids: [...]} once it has committed the change.
    expectBody: (body) => (body as { status?: unknown }).status === 'ok',
  })
}
