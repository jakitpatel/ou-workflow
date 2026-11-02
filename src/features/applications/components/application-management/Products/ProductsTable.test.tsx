import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { ApplicationDetail } from '@/types/application'
import ProductsTable from './ProductsTable'

// w5 item 2: the trash icon sent DELETE /api/products/<id> (no such endpoint; the rows are read-only KASH
// PRODUCT_GRID / intake form products with no id), so it was removed. Schedule B products are deleted in the
// Schedule B drawer.
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ role: 'product_role', roles: [] }) }))

it('has no delete control for the read-only product rows', () => {
  const application = {
    products: [{ ProductName: 'FIX-w5 Cocoa', BrandName: 'W5', STATUS: 'Active' }],
  } as unknown as ApplicationDetail
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  render(<ProductsTable application={application} />)

  expect(screen.getByText('FIX-w5 Cocoa')).toBeTruthy()
  expect(screen.getByTitle('Edit Product')).toBeTruthy()
  expect(screen.queryByTitle('Delete Product')).toBeNull()
  expect(fetchSpy).not.toHaveBeenCalled()
  fetchSpy.mockRestore()
})
