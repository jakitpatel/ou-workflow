import { describe, expect, it, vi } from 'vitest'
import { getKashIngredientRowId, mapKashIngredientRow } from './useScheduleAIngredients'
import type { KashIngredient } from '@/types/application'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'test-token' }) }))

// The Kashrus ingredient shape returned for the Schedule A "Kashrus" tab (PascalCase names).
const pascalCaseRecord = {
  BLK: 'N',
  BrandName: 'Robertet Flavors, Inc.- Piscataway',
  CTA: '«»',
  CompanyName: 'ROBERTET FLAVORS, INC.',
  GRP: '3    ',
  IngredientInPlantStatus: 'Approved-Pareve',
  IngredientName: 'WATERMELON FLAVOR WONF, NATURAL NV-76373',
  LabelStatus: 'Certified',
  MerchandiseID: 4136306,
  RMC: '12458',
  SYMBOL: 'KOF-K(2026/12/31)',
} as unknown as KashIngredient

describe('mapKashIngredientRow', () => {
  it('shows Ingredient Name and Brand Name from PascalCase fields', () => {
    const row = mapKashIngredientRow(pascalCaseRecord, 0)
    expect(row.name).toBe('WATERMELON FLAVOR WONF, NATURAL NV-76373')
    expect(row.brand).toBe('Robertet Flavors, Inc.- Piscataway')
    expect(row).toMatchObject({
      companyName: 'ROBERTET FLAVORS, INC.',
      rmc: '12458',
      certifier: 'KOF-K(2026/12/31)',
      status: 'Approved-Pareve',
      origin: 'Kashrus',
    })
    expect(row.id).toBe('kash-0-WATERMELON FLAVOR WONF, NATURAL NV-76373')
  })

  it('still reads the UPPER_SNAKE field names', () => {
    const row = mapKashIngredientRow(
      { INGREDIENT_NAME: 'Sugar', BRAND_NAME: 'Domino', LABEL_ID: 9 } as unknown as KashIngredient,
      3,
    )
    expect(row.name).toBe('Sugar')
    expect(row.brand).toBe('Domino')
    expect(getKashIngredientRowId({ INGREDIENT_NAME: 'Sugar', LABEL_ID: 9 } as unknown as KashIngredient, 3)).toBe('kash-9-Sugar')
  })

  it('leaves the fields blank when neither spelling is present', () => {
    const row = mapKashIngredientRow({ CompanyName: 'X' } as unknown as KashIngredient, 2)
    expect(row.name).toBe('')
    expect(row.brand).toBe('')
    expect(row.id).toBe('kash-2-ingredient')
  })
})
