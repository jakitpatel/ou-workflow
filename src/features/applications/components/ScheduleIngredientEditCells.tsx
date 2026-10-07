import type { ScheduleIngredientEdit } from '../api/scheduleIngredientMutations'

export function ScheduleIngredientEditCells({
  draft,
  disabled,
  onChange,
}: {
  draft: ScheduleIngredientEdit
  disabled: boolean
  onChange: (key: keyof ScheduleIngredientEdit, value: string) => void
}) {
  const input = (key: keyof ScheduleIngredientEdit, label: string) => (
    <input
      aria-label={label}
      placeholder={label}
      value={draft[key]}
      disabled={disabled}
      onChange={(event) => onChange(key, event.target.value)}
      className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500"
    />
  )
  return (
    <>
      <td className="px-3 py-3">{input('rawMaterialCode', 'RMC')}</td>
      <td className="px-3 py-3">{input('ingredientLabelName', 'Ingredient Name')}</td>
      <td className="space-y-1 px-3 py-3">
        {input('source', 'Source')}
        {input('manufacturer', 'Manufacturer')}
      </td>
      <td className="px-3 py-3">{input('brandName', 'Brand Name')}</td>
      <td className="px-3 py-3">{input('certifyingAgency', 'Certifier')}</td>
    </>
  )
}
