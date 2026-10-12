import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { ScheduleIngredientEditCells } from './ScheduleIngredientEditCells'

it('renders one Source input and forwards source edits', () => {
  const onChange = vi.fn()
  render(<table><tbody><tr><ScheduleIngredientEditCells
    draft={{ ingredientLabelName: 'Ingredient', manufacturer: 'Supplier', source: 'Supplier', brandName: '', rawMaterialCode: '', certifyingAgency: '' }}
    disabled={false} onChange={onChange}
  /></tr></tbody></table>)
  expect(screen.getAllByRole('textbox', { name: 'Source' })).toHaveLength(1)
  expect(screen.queryByRole('textbox', { name: 'Manufacturer' })).toBeNull()
  fireEvent.change(screen.getByRole('textbox', { name: 'Source' }), { target: { value: 'New supplier' } })
  expect(onChange).toHaveBeenCalledWith('source', 'New supplier')
})
