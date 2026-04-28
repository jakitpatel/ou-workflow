import { useEffect, useMemo, useState } from 'react'
import { Beaker, Boxes, Link2, Package, X } from 'lucide-react'
import { useScheduleAIngredients } from '@/features/applications/hooks/useScheduleAIngredients'
import type { ScheduleAIngredient } from '@/types/application'

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

function IngredientCard({
  ingredient,
  variant,
}: {
  ingredient: ScheduleAIngredient
  variant: 'application' | 'kash'
}) {
  const badgeClassName =
    variant === 'application'
      ? 'bg-sky-100 text-sky-700 border-sky-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200'

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">
            {ingredient.ingredientLabelName || ingredient.rawMaterialCode || 'Unnamed Ingredient'}
          </h4>
          <p className="mt-1 text-xs text-gray-500">
            Ingredient ID: {ingredient.IngredientId}
          </p>
        </div>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClassName}`}>
          {variant === 'application' ? 'Application' : 'KASH'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Raw Material Code" value={ingredient.rawMaterialCode} />
        <Field label="UKDID" value={ingredient.UKDID} />
        <Field label="Brand Name" value={ingredient.brandName} />
        <Field label="Manufacturer" value={ingredient.manufacturer} />
        <Field label="Certifying Agency" value={ingredient.certifyingAgency} />
        <Field label="Packaged/Bulk" value={ingredient.packagedOrBulk} />
        <Field label="Passover" value={ingredient.passover} />
        <Field label="Plant Status" value={ingredient.plantStatus} />
        <Field label="Group" value={ingredient.group} />
      </div>
    </article>
  )
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-900">{String(value ?? '').trim() || '-'}</div>
    </div>
  )
}

function IngredientsTabPanel({
  ingredients,
  isLoading,
  error,
  variant,
}: {
  ingredients: ScheduleAIngredient[]
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
    <div className="space-y-4">
      {ingredients.map((ingredient) => (
        <IngredientCard
          key={`${variant}-${ingredient.IngredientId}-${ingredient.ApplicationID}`}
          ingredient={ingredient}
          variant={variant}
        />
      ))}
    </div>
  )
}

function MappingTabPanel({ ingredients }: { ingredients: ScheduleAIngredient[] }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
          <Link2 className="h-4 w-4 text-violet-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Mapping</h4>
          <p className="text-sm text-gray-500">
            Mapping UI is not available yet. {ingredients.length} ingredient
            {ingredients.length === 1 ? '' : 's'} loaded for this application.
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

  const ingredients = useMemo(() => data ?? [], [data])

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
              ingredients={ingredients}
              isLoading={isLoading}
              error={error}
              variant="application"
            />
          ) : null}
          {activeTab === 'kash' ? (
            <IngredientsTabPanel
              ingredients={ingredients}
              isLoading={isLoading}
              error={error}
              variant="kash"
            />
          ) : null}
          {activeTab === 'mapping' ? <MappingTabPanel ingredients={ingredients} /> : null}
        </div>
      </div>
    </div>
  )
}
