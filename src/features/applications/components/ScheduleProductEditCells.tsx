import type { ScheduleProductEdit } from '../api/scheduleProductMutations'
import type { ScheduleBProductRow } from '../hooks/useScheduleBProducts'

export function ScheduleProductEditCells({ row, draft, disabled, onChange }: {
  row: ScheduleBProductRow
  draft: ScheduleProductEdit
  disabled: boolean
  onChange: <K extends keyof ScheduleProductEdit>(key: K, value: ScheduleProductEdit[K]) => void
}) {
  const text = (key: 'productName' | 'BrandName' | 'privateLabelCo' | 'list' | 'symbol' | 'UPC', label: string) => (
    <td className="px-3 py-3"><input aria-label={label} value={draft[key]} disabled={disabled}
      onChange={(event) => onChange(key, event.target.value)}
      className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500" /></td>
  )
  const yn = (key: 'bulkShipped' | 'internal_use_only' | 'passover', label: string) => (
    <td className="px-3 py-3"><select aria-label={label} value={draft[key]} disabled={disabled}
      onChange={(event) => onChange(key, event.target.value)} className="rounded border border-gray-300 px-2 py-1 text-xs">
      <option value="">-</option><option value="Y">Yes</option><option value="N">No</option>
    </select></td>
  )
  return <>
    <td className="px-3 py-3 text-gray-700">{row.labelNo || '-'}</td>
    {text('productName', 'Product Name')}
    {text('BrandName', 'Brand Name')}
    {text('privateLabelCo', 'Label Company')}
    <td className="px-3 py-3"><select aria-label="Private Label" value={String(draft.privateLabel)} disabled={disabled}
      onChange={(event) => onChange('privateLabel', event.target.value === 'true')}>
      <option value="false">No</option><option value="true">Yes</option>
    </select></td>
    <td className="px-3 py-3"><select aria-label="Product Use" disabled={disabled}
      value={draft.Retail ? (draft.Industrial ? 'both' : 'consumer') : (draft.Industrial ? 'industrial' : '')}
      onChange={(event) => {
        onChange('Retail', ['consumer', 'both'].includes(event.target.value))
        onChange('Industrial', ['industrial', 'both'].includes(event.target.value))
      }}>
      <option value="">-</option><option value="consumer">Consumer</option>
      <option value="industrial">Industrial</option><option value="both">Consumer / Industrial</option>
    </select></td>
    {yn('bulkShipped', 'Bulk Shipped')}
    {text('list', 'List')}
    {text('symbol', 'Symbol')}
    {yn('internal_use_only', 'Internal Use Only')}
    {yn('passover', 'Passover')}
    {text('UPC', 'UPC')}
    <td className="px-3 py-3 text-gray-700">{row.artwork || '-'}</td>
  </>
}
