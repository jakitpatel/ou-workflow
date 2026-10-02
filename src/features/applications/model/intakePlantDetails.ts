import type { ApplicationDetail } from '@/types/application'

// The intake adapter flattens these arrays in plant order. Use that order rather
// than plant names, which may be duplicated or missing in a submission.
export function getIntakePlantApplication(
  application: ApplicationDetail,
  index: number,
): ApplicationDetail {
  const rawPlants = application.preferences?.prelimPlantsRaw ?? []
  const rawPlant = rawPlants[index]
  const productOffset = rawPlants
    .slice(0, index)
    .reduce(
      (total: number, plant: { products?: unknown[] }) => total + (plant.products?.length ?? 0),
      0,
    )
  const ingredientOffset = rawPlants
    .slice(0, index)
    .reduce(
      (total: number, plant: { ingredients?: unknown[] }) =>
        total + (plant.ingredients?.length ?? 0),
      0,
    )
  const plant = application.plants[index]
  return {
    ...application,
    plants: plant ? [plant] : [],
    plantAddresses: application.plantAddresses?.slice(index, index + 1),
    plantContacts: Array.isArray(application.plantContacts)
      ? application.plantContacts.slice(index, index + 1)
      : application.plantContacts,
    products: rawPlant
      ? application.products.slice(productOffset, productOffset + (rawPlant.products?.length ?? 0))
      : [],
    ingredients: rawPlant
      ? (application.ingredients ?? []).slice(
          ingredientOffset,
          ingredientOffset + (rawPlant.ingredients?.length ?? 0),
        )
      : [],
    preferences: { ...application.preferences, prelimPlantsRaw: rawPlant ? [rawPlant] : [] },
    globalData: application.globalData
      ? {
          ...application.globalData,
          plants: application.globalData.plants?.slice(index, index + 1),
        }
      : undefined,
  }
}
