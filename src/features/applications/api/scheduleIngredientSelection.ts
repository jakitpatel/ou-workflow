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
  })
}
