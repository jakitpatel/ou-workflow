import { describe, expect, it, vi } from 'vitest'
import { getKashProductRowId, mapKashProductRow } from './useScheduleBProducts'
import type { KashProduct } from '@/types/application'

vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'test-token' }) }))

// The Kashrus product shape returned for the Schedule B "Kashrus" tab.
const record = {
  ProductName: 'Watermelon Flavor Syrup',
  CompanyName: 'ROBERTET FLAVORS, INC.',
  BrandName: 'Robertet',
  SYMBOL: 'OU',
  LabelType: 'Private label',
  UKID: 'UKD-778899',
  STATUS: 'Certified',
  ProductID: 5512034,
  ProducedIn1Status: 'Active',
} as unknown as KashProduct

describe('mapKashProductRow', () => {
  it('maps every Kashrus tab column from the response fields', () => {
    const row = mapKashProductRow(record, 0)
    expect(row).toMatchObject({
      labelName: 'Watermelon Flavor Syrup', // Product Name
      name: 'Watermelon Flavor Syrup',
      brand: 'Robertet', // Brand
      labelCo: 'ROBERTET FLAVORS, INC.', // Company Name
      source: 'ROBERTET FLAVORS, INC.',
      typeLabel: 'Private label', // Type
      symbol: 'OU', // Symbol
      certifier: 'OU',
      ukd: 'UKD-778899',
      productDisplayId: '5512034', // Product ID, shown as sent
      status: 'Certified', // Status
      producedIn1Status: 'Active', // ProducedIn1Status
      origin: 'Kashrus',
    })
    expect(row.id).toBe('kash-5512034-Watermelon Flavor Syrup')
  })

  it('keeps distinct, stable ids for different products', () => {
    const other = { ...record, ProductID: 5512035, ProductName: 'Lemon Syrup' } as unknown as KashProduct
    expect(mapKashProductRow(other, 0).id).not.toBe(mapKashProductRow(record, 0).id)
    expect(getKashProductRowId(record, 7)).toBe(getKashProductRowId(record, 0))
  })

  it('falls back to Brand Name for the product name and to In-house for the type', () => {
    const row = mapKashProductRow(
      { BrandName: 'Robertet', ProductID: 1, STATUS: 'Pending' } as unknown as KashProduct,
      0,
    )
    expect(row.labelName).toBe('Robertet')
    expect(row.typeLabel).toBe('In-house')
    expect(row.status).toBe('Pending')
    expect(row.producedIn1Status).toBe('')
  })

  it('still maps the older UPPER_SNAKE response', () => {
    const row = mapKashProductRow(
      {
        PRODUCT_NAME: 'Old Product',
        COMPANY_NAME: 'Old Co',
        BRAND_NAME: 'Old Brand',
        SYMBOL: 'OU-D',
        LABEL_TYPE: 'In-house',
        LABEL_ID: 42,
        MERCHANDISE_ID: 900,
        PLANT_STATUS: 'Approved',
        DPM: 'Dairy',
        PRODUCED_IN1_STATUS: 'Inactive',
      } as unknown as KashProduct,
      3,
    )
    expect(row).toMatchObject({
      labelName: 'Old Product',
      labelCo: 'Old Co',
      brand: 'Old Brand',
      symbol: 'OU-D',
      typeLabel: 'In-house',
      productDisplayId: 'PRD-900',
      ukd: '42',
      status: 'Approved-Dairy',
      producedIn1Status: 'Inactive',
    })
    expect(row.id).toBe('kash-42-Old Product')
  })
})
