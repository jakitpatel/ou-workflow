import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ScheduleIngredientDeleteConfirm } from './ScheduleIngredientDeleteConfirm'

// Audit F20: deleting a Schedule A ingredient needs an explicit confirmation.
describe('ScheduleIngredientDeleteConfirm', () => {
  it('names the ingredient and only deletes on confirm', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ScheduleIngredientDeleteConfirm ingredientName="Sugar" onConfirm={onConfirm} onCancel={onCancel} />)

    expect(screen.getByRole('alertdialog', { name: 'Delete ingredient?' }).textContent).toContain('Sugar')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('cancels on Escape but not while the delete is pending', () => {
    const onCancel = vi.fn()
    const { rerender } = render(
      <ScheduleIngredientDeleteConfirm ingredientName="Sugar" pending onConfirm={vi.fn()} onCancel={onCancel} />,
    )
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: 'Deleting...' }) as HTMLButtonElement).disabled).toBe(true)

    rerender(<ScheduleIngredientDeleteConfirm ingredientName="Sugar" onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
