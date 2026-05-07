import { useEffect, useMemo, useState } from 'react'
import { Beaker, Boxes, Link2, Package, X } from 'lucide-react'
import { useScheduleAIngredients } from '@/features/applications/hooks/useScheduleAIngredients'
import type { KashIngredient, ScheduleAIngredient } from '@/types/application'

type ScheduleATab = 'application' | 'kash' | 'mapping'

type Props = {
  open: boolean
  applicationId?: string | number
  applicationName?: string
  taskName?: string
  onClose: () => void
}

const TABS: Array<{ id: ScheduleATab; label: string }> = [
  { id: 'application', label: 'Application' },
  { id: 'kash', label: 'KASH' },
  { id: 'mapping', label: 'Mapping' },
]

function formatValue(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized || '-'
}

function getIngredientField(ingredient: ScheduleAIngredient, fieldNames: string[]) {
  const ingredientRecord = ingredient as Record<string, unknown>
  return fieldNames.map((fieldName) => ingredientRecord[fieldName]).find((value) => formatValue(value) !== '-')
}

function getKashField(ingredient: KashIngredient, fieldNames: string[]) {
  const ingredientRecord = ingredient as Record<string, unknown>
  return fieldNames.map((fieldName) => ingredientRecord[fieldName]).find((value) => formatValue(value) !== '-')
}

function ApplicationIngredientsTable({ ingredients }: { ingredients: ScheduleAIngredient[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full table-fixed divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="w-[22%] px-4 py-3">Name</th>
              <th scope="col" className="w-[17%] px-3 py-3">Source</th>
              <th scope="col" className="w-[15%] px-3 py-3">Brand</th>
              <th scope="col" className="w-[13%] px-3 py-3">RMC</th>
              <th scope="col" className="w-[12%] px-3 py-3">UKDID</th>
              <th scope="col" className="w-[11%] px-3 py-3">Attachment</th>
              <th scope="col" className="w-[10%] px-3 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {ingredients.map((ingredient) => {
              const source = getIngredientField(ingredient, ['source', 'Source', 'SOURCE', 'manufacturer'])
              const attachment = getIngredientField(ingredient, [
                'attachment',
                'Attachment',
                'attachmentUrl',
                'AttachmentUrl',
                'attachmentURL',
                'AttachmentURL',
                'FilePath',
                'filePath',
              ])
              const notes = getIngredientField(ingredient, ['notes', 'Notes', 'note', 'Note'])
              const formattedAttachment = formatValue(attachment)
              const formattedNotes = formatValue(notes)

              return (
                <tr key={getApplicationIngredientKey(ingredient)} className="align-top hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="truncate" title={formatValue(ingredient.ingredientLabelName)}>
                      {formatValue(ingredient.ingredientLabelName)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate" title={formatValue(source)}>
                      {formatValue(source)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate" title={formatValue(ingredient.brandName)}>
                      {formatValue(ingredient.brandName)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate" title={formatValue(ingredient.rawMaterialCode)}>
                      {formatValue(ingredient.rawMaterialCode)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate" title={formatValue(ingredient.UKDID)}>
                      {formatValue(ingredient.UKDID)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    {formattedAttachment === '-' ? (
                      <span>-</span>
                    ) : (
                      <a
                        href={formattedAttachment}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        View
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700 shadow-sm"
                      value={formattedNotes}
                      aria-label={`Notes for ${formatValue(ingredient.ingredientLabelName)}`}
                      onChange={() => undefined}
                    >
                      <option value={formattedNotes}>{formattedNotes}</option>
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KashIngredientsTable({ ingredients }: { ingredients: KashIngredient[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1320px] w-full table-fixed divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" className="w-[8%] px-4 py-3">RMC</th>
              <th scope="col" className="w-[19%] px-3 py-3">Ingredient Name</th>
              <th scope="col" className="w-[12%] px-3 py-3">Source</th>
              <th scope="col" className="w-[12%] px-3 py-3">Brand Name</th>
              <th scope="col" className="w-[7%] px-3 py-3">Group</th>
              <th scope="col" className="w-[10%] px-3 py-3">Certification</th>
              <th scope="col" className="w-[8%] px-3 py-3">Passover</th>
              <th scope="col" className="w-[10%] px-3 py-3">Plant-Status</th>
              <th scope="col" className="w-[10%] px-3 py-3">MERCHANDISE_ID</th>
              <th scope="col" className="w-[8%] px-3 py-3">LABEL_ID</th>
              <th scope="col" className="w-[8%] px-3 py-3">UKDID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {ingredients.map((ingredient) => {
              const rmc = getKashField(ingredient, ['RMC', 'rmc', 'rawMaterialCode', 'RawMaterialCode', 'CNTA'])
              const source = getKashField(ingredient, [
                'SOURCE',
                'Source',
                'source',
                'CompanyName',
                'SRC_MAR_ID',
                'SRC_STREET',
                'SRC_CITY',
              ])
              const certification = getKashField(ingredient, [
                'Certification',
                'CERTIFICATION',
                'certification',
                'SYMBOL',
                'SEAL_SIGN',
              ])
              const labelId = ingredient.LABEL_ID ?? ingredient.LabelID
              const cta = formatValue(ingredient.CTA)
              const plantCta = formatValue(ingredient.PlantCTA)

              return (
                <tr key={getKashIngredientKey(ingredient)} className="align-top hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">
                    <div className="truncate" title={formatValue(rmc)}>
                      {formatValue(rmc)}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    <div className="truncate" title={formatValue(ingredient.INGREDIENT_NAME)}>
                      {formatValue(ingredient.INGREDIENT_NAME)}
                    </div>
                    {cta !== '-' ? (
                      <div className="mt-1 truncate text-xs italic text-gray-500" title={cta}>
                        {cta}
                      </div>
                    ) : null}
                    {plantCta !== '-' ? (
                      <div className="mt-0.5 truncate text-xs italic text-gray-500" title={plantCta}>
                        {plantCta}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate" title={formatValue(source)}>
                      {formatValue(source)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate" title={formatValue(ingredient.BRAND_NAME)}>
                      {formatValue(ingredient.BRAND_NAME)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate" title={formatValue(ingredient.GRP)}>
                      {formatValue(ingredient.GRP)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate" title={formatValue(certification)}>
                      {formatValue(certification)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate" title={formatValue(ingredient.PESACH)}>
                      {formatValue(ingredient.PESACH)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate" title={formatValue(ingredient.PlantStatus)}>
                      {formatValue(ingredient.PlantStatus)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate" title={formatValue(ingredient.MERCHANDISE_ID)}>
                      {formatValue(ingredient.MERCHANDISE_ID)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate" title={formatValue(labelId)}>
                      {formatValue(labelId)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="truncate" title={formatValue(ingredient.UKDID)}>
                      {formatValue(ingredient.UKDID)}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const getApplicationIngredientKey = (ingredient: ScheduleAIngredient) =>
  `application-${ingredient.ApplicationID}-${ingredient.IngredientId}-${ingredient.rawMaterialCode ?? ingredient.ingredientLabelName ?? 'ingredient'}`

const getKashIngredientKey = (ingredient: KashIngredient) =>
  `kash-${String(ingredient.LABEL_ID ?? ingredient.LabelID ?? ingredient.USED_IN1_ID ?? ingredient.MERCHANDISE_ID ?? ingredient.INGREDIENT_NAME ?? 'ingredient')}`

function IngredientsTabPanel({
  ingredients,
  isLoading,
  error,
  variant,
}: {
  ingredients: Array<ScheduleAIngredient | KashIngredient>
  isLoading: boolean
  error: unknown
  variant: 'application' | 'kash'
}) {
  if (isLoading) {
    return <div className="p-6 text-sm text-gray-600">Loading ingredients...</div>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load ingredients: {(error as Error).message}
      </div>
    )
  }

  if (ingredients.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
          {variant === 'application' ? (
            <Beaker className="h-5 w-5 text-sky-600" />
          ) : (
            <Boxes className="h-5 w-5 text-emerald-600" />
          )}
        </div>
        <p className="mt-3 text-sm font-medium text-gray-900">No ingredients found</p>
        <p className="mt-1 text-sm text-gray-500">
          This application does not currently have any Schedule A ingredients.
        </p>
      </div>
    )
  }

  return (
    variant === 'application' ? (
      <ApplicationIngredientsTable ingredients={ingredients as ScheduleAIngredient[]} />
    ) : (
      <KashIngredientsTable ingredients={ingredients as KashIngredient[]} />
    )
  )
}

function MappingTabPanel({ ingredientsCount }: { ingredientsCount: number }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
          <Link2 className="h-4 w-4 text-violet-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Mapping</h4>
          <p className="text-sm text-gray-500">
            Mapping UI is not available yet. {ingredientsCount} ingredient
            {ingredientsCount === 1 ? '' : 's'} loaded for this application.
          </p>
        </div>
      </div>
    </div>
  )
}

export function ScheduleAIngredientsDrawer({
  open,
  applicationId,
  applicationName,
  taskName,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<ScheduleATab>('application')
  const resolvedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)
  const { data, isLoading, error } = useScheduleAIngredients(open ? resolvedApplicationId : undefined)

  const applicationIngredients = useMemo(() => data?.scheduleIngredients ?? [], [data])
  const kashIngredients = useMemo(() => data?.kashIngredients ?? [], [data])
  const totalIngredientsCount = applicationIngredients.length + kashIngredients.length

  useEffect(() => {
    if (open) {
      setActiveTab('application')
    }
  }, [open, resolvedApplicationId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 flex h-full w-full max-w-[96vw] flex-col overflow-hidden bg-white shadow-2xl lg:max-w-[54vw]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b bg-gray-900 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-sky-300" />
                <h3 className="text-lg font-semibold">Schedule A Ingredients</h3>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-300">
                {taskName ? <span className="rounded-full bg-white/10 px-2.5 py-1">{taskName}</span> : null}
                {applicationName ? (
                  <span className="rounded-full bg-white/10 px-2.5 py-1">{applicationName}</span>
                ) : null}
                {resolvedApplicationId ? (
                  <span className="rounded-full bg-white/10 px-2.5 py-1">AppId: {resolvedApplicationId}</span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-300 hover:bg-white/10 hover:text-white"
              aria-label="Close Schedule A drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b bg-white px-5 py-3">
          <div className="flex gap-2">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-5">
          {activeTab === 'application' ? (
            <IngredientsTabPanel
              ingredients={applicationIngredients}
              isLoading={isLoading}
              error={error}
              variant="application"
            />
          ) : null}
          {activeTab === 'kash' ? (
            <IngredientsTabPanel
              ingredients={kashIngredients}
              isLoading={isLoading}
              error={error}
              variant="kash"
            />
          ) : null}
          {activeTab === 'mapping' ? <MappingTabPanel ingredientsCount={totalIngredientsCount} /> : null}
        </div>
      </div>
    </div>
  )
}
