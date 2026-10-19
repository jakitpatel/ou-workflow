import { useScheduleAIngredients } from './useScheduleAIngredients'
import { useScheduleBProducts } from './useScheduleBProducts'

export function useContractSchedules(applicationId?: string | number) {
  const ingredientsQuery = useScheduleAIngredients(applicationId)
  const productsQuery = useScheduleBProducts(applicationId)

  return {
    ingredientsQuery,
    productsQuery,
    contractIngredients: ingredientsQuery.data?.kashIngredients ?? [],
    contractProducts: productsQuery.data?.kashProducts ?? [],
  }
}
