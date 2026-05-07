import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Eye, Link2, Package, Plus, X } from 'lucide-react'
import { useUser } from '@/context/UserContext'
import {
  createScheduleAIngredient,
  type CreateScheduleAIngredientPayload,
} from '@/features/applications/api'
import { ApplicationDetailsDrawer } from '@/features/applications/components/ApplicationDetailsDrawer'
import { useScheduleAIngredients } from '@/features/applications/hooks/useScheduleAIngredients'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
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

type MappingRow = {
  section: string
  field: string
  mapsTo: string
  example: string
  description: string
  crkNotes?: string
}

type ApplicationIngredientDraft = {
  ingredientLabelName: string
  source: string
  brandName: string
  rawMaterialCode: string
  UKDID: string
  attachment: string
  notes: string
}

const EMPTY_APPLICATION_INGREDIENT_DRAFT: ApplicationIngredientDraft = {
  ingredientLabelName: '',
  source: '',
  brandName: '',
  rawMaterialCode: '',
  UKDID: '',
  attachment: '',
  notes: '',
}

const KASH_FIELD_MAPPINGS: MappingRow[] = [
  {
    section: 'Names & Identifiers',
    field: 'rawMaterialCode',
    mapsTo: 'RMC - 1',
    example: '',
    description: '',
  },
  {
    section: 'Names & Identifiers',
    field: 'INGREDIENT_NAME',
    mapsTo: 'Ingredient Name - 2',
    example: 'Agave Fruit, Syrup, Nectar',
    description: 'Display name of the ingredient',
  },
  {
    section: 'Names & Identifiers',
    field: 'ALTERNATE_NAME',
    mapsTo: '',
    example: '(blank)',
    description: 'Alternate name, if any',
  },
  {
    section: 'Names & Identifiers',
    field: 'BRAND_NAME',
    mapsTo: 'Brand Name - 4',
    example: '{NONE}',
    description: "Brand name; '{NONE}' means no brand specified",
  },
  {
    section: 'Names & Identifiers',
    field: 'CompanyName',
    mapsTo: '',
    example: 'Royal Wine Corporation',
    description: 'Owning company',
  },
  {
    section: 'Names & Identifiers',
    field: 'PlantName',
    mapsTo: '',
    example: 'Destiladora Del Valle De Tequila S.A. De C.V. - Tequila',
    description: 'Plant where ingredient is approved',
  },
  {
    section: 'Names & Identifiers',
    field: 'LABEL_COMPANY',
    mapsTo: 'Source - 3',
    example: '** ANY SOURCE ***',
    description: "Label company; '** ANY SOURCE ***' means approved from any source",
  },
  {
    section: 'Kosher Classification',
    field: 'GRP',
    mapsTo: 'Group - 5',
    example: '1',
    description: 'Group classification (1-6)',
  },
  {
    section: 'Kosher Classification',
    field: 'DPM',
    mapsTo: '',
    example: 'Pareve',
    description: 'Dairy, Pareve, or Meat designation',
  },
  {
    section: 'Kosher Classification',
    field: 'PESACH',
    mapsTo: 'Passover - 7',
    example: 'Y',
    description: 'Y = approved for Passover',
  },
  {
    section: 'Kosher Classification',
    field: 'CNTA',
    mapsTo: '',
    example: 'Approved for Passover',
    description: 'Passover note / certification text',
  },
  {
    section: 'Kosher Classification',
    field: 'SYMBOL',
    mapsTo: 'Certification - 6',
    example: '(2027/12/31)',
    description: 'Kosher symbol / certification expiration display',
  },
  {
    section: 'Kosher Classification',
    field: 'SEAL_SIGN',
    mapsTo: '',
    example: '{NONE}',
    description: 'Seal/sign requirement',
  },
  {
    section: 'Kosher Classification',
    field: 'BLK',
    mapsTo: '',
    example: 'N',
    description: 'Bulk indicator (Y/N)',
  },
  {
    section: 'Kosher Classification',
    field: 'AS_STIPULATED',
    mapsTo: '',
    example: 'Y',
    description: 'Y = used as stipulated / per restrictions',
  },
  {
    section: 'Status',
    field: 'ACTIVE',
    mapsTo: '',
    example: '1',
    description: '1 = active record',
  },
  {
    section: 'Status',
    field: 'IngredientInPlantStatus',
    mapsTo: 'Plant-Status - 8',
    example: 'Approved',
    description: 'Status of this ingredient at the plant',
    crkNotes: 'Displayed with DPM when available, e.g. Approved-Dairy',
  },
  {
    section: 'Status',
    field: 'PlantStatus',
    mapsTo: '',
    example: 'Certified',
    description: 'Plant certification status',
  },
  {
    section: 'Status',
    field: 'LabelStatus',
    mapsTo: '',
    example: 'Kosher',
    description: 'Label certification status',
  },
  {
    section: 'Notes / CTAs',
    field: 'CTA',
    mapsTo: 'Under Ingredient Name',
    example: 'Pure, no additives.',
    description: 'Certificate text / additional notes',
    crkNotes: 'Appears beneath Ingredient Name in italics with no header',
  },
  {
    section: 'Notes / CTAs',
    field: 'PlantCTA',
    mapsTo: 'Under Ingredient Name',
    example: '(blank)',
    description: 'Plant-specific certificate text',
    crkNotes: 'Appears beneath Ingredient Name in italics with no header',
  },
  {
    section: 'Dates',
    field: 'DateAdded',
    mapsTo: '',
    example: '02/01/2012',
    description: 'Date this record was added',
  },
  {
    section: 'Dates',
    field: 'LOC',
    mapsTo: '',
    example: '2027-12-31',
    description: 'Letter of Certification expiration date',
  },
  {
    section: 'Source / Origin',
    field: 'SRC_STREET',
    mapsTo: '',
    example: '(blank)',
    description: 'Source address - street',
  },
  {
    section: 'Source / Origin',
    field: 'SRC_CITY',
    mapsTo: '',
    example: '(blank)',
    description: 'Source address - city',
  },
  {
    section: 'Source / Origin',
    field: 'SRC_STATE',
    mapsTo: '',
    example: '(blank)',
    description: 'Source address - state',
  },
  {
    section: 'Source / Origin',
    field: 'SRC_COUNTRY',
    mapsTo: '',
    example: '(blank)',
    description: 'Source address - country',
  },
  {
    section: 'Source / Origin',
    field: 'SRC_ZIP',
    mapsTo: '',
    example: '(blank)',
    description: 'Source address - zip',
  },
  {
    section: 'Source / Origin',
    field: 'SRC_MAR_ID',
    mapsTo: '',
    example: '51999',
    description: 'Source manufacturer/MAR ID',
  },
  {
    section: 'System IDs',
    field: 'COMPANY_ID',
    mapsTo: '',
    example: '3149',
    description: 'Internal company ID',
  },
  {
    section: 'System IDs',
    field: 'OWNS_ID',
    mapsTo: '',
    example: '14077151',
    description: 'Ownership ID',
  },
  {
    section: 'System IDs',
    field: 'PLANT_ID',
    mapsTo: '',
    example: '14055387',
    description: 'Internal plant ID',
  },
  {
    section: 'System IDs',
    field: 'MERCHANDISE_ID',
    mapsTo: 'MERCHANDISE_ID',
    example: '2508237',
    description: 'Merchandise ID',
  },
  {
    section: 'System IDs',
    field: 'LABEL_ID',
    mapsTo: 'LABEL_ID',
    example: '1802997042',
    description: 'Label ID',
  },
  {
    section: 'System IDs',
    field: 'LabelID',
    mapsTo: '',
    example: '1802997042',
    description: 'Duplicate of LABEL_ID (legacy field)',
  },
  {
    section: 'System IDs',
    field: 'LABEL_SEQ_NUM',
    mapsTo: '',
    example: '2',
    description: 'Label sequence number',
  },
  {
    section: 'System IDs',
    field: 'USED_IN1_ID',
    mapsTo: '',
    example: '4160000',
    description: 'Used-in product reference ID',
  },
  {
    section: 'System IDs',
    field: 'UKDID',
    mapsTo: 'UKDID',
    example: '(blank)',
    description: 'Universal Kosher Database ID',
  },
  {
    section: 'System IDs',
    field: 'JobID',
    mapsTo: '',
    example: '0',
    description: 'Job ID (0 = none)',
  },
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

function trimDraftValue(value: string) {
  const normalized = value.trim()
  return normalized || undefined
}

function ApplicationIngredientsTable({
  applicationId,
  ingredients,
  onViewApplication,
}: {
  applicationId?: string
  ingredients: ScheduleAIngredient[]
  onViewApplication: (applicationId?: string | number) => void
}) {
  const { token } = useUser()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<ApplicationIngredientDraft | null>(null)
  const [submitError, setSubmitError] = useState('')

  const createIngredientMutation = useMutation({
    mutationFn: createScheduleAIngredient,
    onSuccess: async () => {
      setDraft(null)
      setSubmitError('')
      await queryClient.invalidateQueries({
        queryKey: applicationsQueryKeys.scheduleAIngredients(applicationId),
      })
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Failed to add Schedule A ingredient.'
      setSubmitError(message)
    },
  })

  const updateDraft = (field: keyof ApplicationIngredientDraft, value: string) => {
    setDraft((current) => ({
      ...(current ?? EMPTY_APPLICATION_INGREDIENT_DRAFT),
      [field]: value,
    }))
  }

  const startDraft = () => {
    setDraft(EMPTY_APPLICATION_INGREDIENT_DRAFT)
    setSubmitError('')
  }

  const cancelDraft = () => {
    setDraft(null)
    setSubmitError('')
  }

  const saveDraft = () => {
    if (!applicationId) {
      setSubmitError('Application ID is required to add a Schedule A ingredient.')
      return
    }

    if (!draft?.ingredientLabelName.trim() && !draft?.rawMaterialCode.trim()) {
      setSubmitError('Enter at least a Name or RMC before saving.')
      return
    }

    const payload: CreateScheduleAIngredientPayload = {
      ApplicationID: applicationId,
      ingredientLabelName: trimDraftValue(draft.ingredientLabelName),
      manufacturer: trimDraftValue(draft.source),
      source: trimDraftValue(draft.source),
      brandName: trimDraftValue(draft.brandName),
      rawMaterialCode: trimDraftValue(draft.rawMaterialCode),
      UKDID: trimDraftValue(draft.UKDID),
      attachment: trimDraftValue(draft.attachment),
      notes: trimDraftValue(draft.notes),
    }

    createIngredientMutation.mutate({
      payload,
      token,
    })
  }

  const inputClassName =
    'h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">Application Ingredients</div>
        <button
          type="button"
          onClick={startDraft}
          disabled={Boolean(draft) || createIngredientMutation.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <Plus className="h-4 w-4" />
          Add Row
        </button>
      </div>

      {submitError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full table-fixed divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="w-[18%] px-4 py-3">Name</th>
                <th scope="col" className="w-[15%] px-3 py-3">Source</th>
                <th scope="col" className="w-[13%] px-3 py-3">Brand</th>
                <th scope="col" className="w-[12%] px-3 py-3">RMC</th>
                <th scope="col" className="w-[11%] px-3 py-3">UKDID</th>
                <th scope="col" className="w-[12%] px-3 py-3">Attachment</th>
                <th scope="col" className="w-[11%] px-3 py-3">Notes</th>
                <th scope="col" className="w-[8%] px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {draft ? (
                <tr className="align-top bg-blue-50/40">
                  <td className="px-4 py-3">
                    <input
                      className={inputClassName}
                      value={draft.ingredientLabelName}
                      onChange={(event) => updateDraft('ingredientLabelName', event.target.value)}
                      placeholder="Name"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className={inputClassName}
                      value={draft.source}
                      onChange={(event) => updateDraft('source', event.target.value)}
                      placeholder="Source"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className={inputClassName}
                      value={draft.brandName}
                      onChange={(event) => updateDraft('brandName', event.target.value)}
                      placeholder="Brand"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className={inputClassName}
                      value={draft.rawMaterialCode}
                      onChange={(event) => updateDraft('rawMaterialCode', event.target.value)}
                      placeholder="RMC"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className={inputClassName}
                      value={draft.UKDID}
                      onChange={(event) => updateDraft('UKDID', event.target.value)}
                      placeholder="UKDID"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className={inputClassName}
                      value={draft.attachment}
                      onChange={(event) => updateDraft('attachment', event.target.value)}
                      placeholder="Attachment"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className={inputClassName}
                      value={draft.notes}
                      onChange={(event) => updateDraft('notes', event.target.value)}
                      placeholder="Notes"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={saveDraft}
                        disabled={createIngredientMutation.isPending}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        aria-label="Save Schedule A ingredient"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelDraft}
                        disabled={createIngredientMutation.isPending}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
                        aria-label="Cancel new Schedule A ingredient"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : null}

              {ingredients.length === 0 && !draft ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                    No Application ingredients found. Add a row to create one.
                  </td>
                </tr>
              ) : null}

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
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onViewApplication(ingredient.ApplicationID ?? applicationId)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 shadow-sm hover:bg-blue-50 hover:text-blue-700"
                        aria-label={`View application ${formatValue(ingredient.ApplicationID ?? applicationId)}`}
                        title="View application"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
            {ingredients.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500">
                  No KASH ingredients found for this application.
                </td>
              </tr>
            ) : null}

            {ingredients.map((ingredient) => {
              const rmc = getKashField(ingredient, ['rawMaterialCode', 'RawMaterialCode', 'RMC', 'rmc'])
              const source = ingredient.LABEL_COMPANY
              const certification = getKashField(ingredient, [
                'Certification',
                'CERTIFICATION',
                'certification',
                'SYMBOL',
                'SEAL_SIGN',
              ])
              const labelId = ingredient.LABEL_ID ?? ingredient.LabelID
              const plantStatus = formatValue(ingredient.IngredientInPlantStatus)
              const dpm = formatValue(ingredient.DPM)
              const displayPlantStatus =
                plantStatus !== '-' && dpm !== '-' ? `${plantStatus}-${dpm}` : plantStatus !== '-' ? plantStatus : dpm
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
                    <div className="truncate" title={displayPlantStatus}>
                      {displayPlantStatus}
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
  applicationId,
  ingredients,
  isLoading,
  error,
  variant,
  onViewApplication,
}: {
  applicationId?: string
  ingredients: Array<ScheduleAIngredient | KashIngredient>
  isLoading: boolean
  error: unknown
  variant: 'application' | 'kash'
  onViewApplication: (applicationId?: string | number) => void
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

  return (
    variant === 'application' ? (
      <ApplicationIngredientsTable
        applicationId={applicationId}
        ingredients={ingredients as ScheduleAIngredient[]}
        onViewApplication={onViewApplication}
      />
    ) : (
      <KashIngredientsTable ingredients={ingredients as KashIngredient[]} />
    )
  )
}

function MappingTabPanel({ ingredientsCount }: { ingredientsCount: number }) {
  let lastSection = ''

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50">
            <Link2 className="h-4 w-4 text-violet-600" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900">KASH to Schedule A Mapping</h4>
            <p className="mt-1 text-sm text-gray-500">
              {ingredientsCount} ingredient{ingredientsCount === 1 ? '' : 's'} loaded. The numbered
              mappings match the KASH tab column order and the unmapped rows document supporting
              backend fields.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full table-fixed divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" className="w-[18%] px-4 py-3">Field</th>
                <th scope="col" className="w-[20%] px-3 py-3">Field Header Name / Order</th>
                <th scope="col" className="w-[18%] px-3 py-3">Value</th>
                <th scope="col" className="w-[27%] px-3 py-3">Description</th>
                <th scope="col" className="w-[17%] px-3 py-3">CRK Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {KASH_FIELD_MAPPINGS.map((mapping) => {
                const showSection = mapping.section !== lastSection
                lastSection = mapping.section

                return (
                  <tr key={`${mapping.section}-${mapping.field}`} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {showSection ? (
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-violet-600">
                          {mapping.section}
                        </div>
                      ) : null}
                      <div className="font-mono text-xs font-medium text-gray-900">{mapping.field}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      <div className="truncate" title={mapping.mapsTo || '-'}>
                        {mapping.mapsTo || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      <div className="truncate" title={mapping.example || '-'}>
                        {mapping.example || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-700">{mapping.description || '-'}</td>
                    <td className="px-3 py-3 text-gray-700">{mapping.crkNotes || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | number | null>(null)
  const resolvedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)
  const { data, isLoading, error } = useScheduleAIngredients(open ? resolvedApplicationId : undefined)

  const applicationIngredients = useMemo(() => data?.scheduleIngredients ?? [], [data])
  const kashIngredients = useMemo(() => data?.kashIngredients ?? [], [data])
  const totalIngredientsCount = applicationIngredients.length + kashIngredients.length

  useEffect(() => {
    if (open) {
      setActiveTab('application')
      setSelectedApplicationId(null)
    }
  }, [open, resolvedApplicationId])

  if (!open) return null

  return (
    <>
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
                applicationId={resolvedApplicationId}
                ingredients={applicationIngredients}
                isLoading={isLoading}
                error={error}
                variant="application"
                onViewApplication={(id) => setSelectedApplicationId(id ?? resolvedApplicationId ?? null)}
              />
            ) : null}
            {activeTab === 'kash' ? (
              <IngredientsTabPanel
                applicationId={resolvedApplicationId}
                ingredients={kashIngredients}
                isLoading={isLoading}
                error={error}
                variant="kash"
                onViewApplication={(id) => setSelectedApplicationId(id ?? resolvedApplicationId ?? null)}
              />
            ) : null}
            {activeTab === 'mapping' ? <MappingTabPanel ingredientsCount={totalIngredientsCount} /> : null}
          </div>
        </div>
      </div>
      <ApplicationDetailsDrawer
        open={selectedApplicationId !== null}
        applicationId={selectedApplicationId ?? undefined}
        onClose={() => setSelectedApplicationId(null)}
      />
    </>
  )
}
