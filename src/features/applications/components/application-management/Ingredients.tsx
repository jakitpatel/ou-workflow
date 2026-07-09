import type { ApplicationDetail } from "@/types/application";

type IngredientRow = {
  BrandName?: string
  CTA?: string
  CompanyName?: string
  GRP?: string | number
  IngredientInPlantStatus?: string
  IngredientName?: string
  RMC?: string
  SYMBOL?: string
  addedBy?: string
  addedDate?: string
  brand?: string
  certification?: string
  certifyingAgency?: string
  group?: string | number
  ingredient?: string
  ingredientLabelName?: string
  manufacturer?: string
  ncrcId?: string
  packaging?: string
  plantStatus?: string
  rawMaterialCode?: string
  status?: string
}

type Props = {
  application: ApplicationDetail
  dataSource?: 'application' | 'prelim'
  showRecentOnly: boolean
  setShowRecentOnly: (value: boolean) => void
}

const readRecordText = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key]
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

const displayText = (value: string) => value || '-'

export default function IngredientMgmt({
  application,
  dataSource = 'application',
  showRecentOnly,
  setShowRecentOnly,
}: Props) {
  const ingredientData: IngredientRow[] =
    dataSource === 'prelim'
      ? (
          application.ingredients?.length
            ? (application.ingredients as IngredientRow[])
            : application.preferences?.prelimPlantsRaw?.flatMap((plant: any) => plant.ingredients ?? [])
        ) || []
      : (application.ingredients as IngredientRow[]) || []
  const filteredIngredients = showRecentOnly
    ? ingredientData.filter((ingredient) => ingredient.status === 'Recent')
    : ingredientData

  const stats = {
    total: ingredientData.length,
    recentlyAdded: ingredientData.filter((ingredient) => ingredient.status === 'Recent').length,
    inNCRC: ingredientData.filter((ingredient) => ingredient.ncrcId).length,
    manualAdditions: ingredientData.filter((ingredient) => ingredient.addedBy !== 'System Import').length,
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Ingredient Management</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Show:</label>
          <button
            onClick={() => setShowRecentOnly(!showRecentOnly)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              showRecentOnly
                ? 'bg-green-600 text-white shadow-sm hover:bg-green-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showRecentOnly ? 'Recent Only' : 'All Ingredients'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-3xl font-bold text-blue-700">{stats.total}</div>
          <div className="text-sm font-medium text-blue-600 mt-1">Total Ingredients</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-3xl font-bold text-green-700">{stats.recentlyAdded}</div>
          <div className="text-sm font-medium text-green-600 mt-1">Added This Week</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-3xl font-bold text-purple-700">{stats.inNCRC}</div>
          <div className="text-sm font-medium text-purple-600 mt-1">In NCRC Database</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="text-3xl font-bold text-orange-700">{stats.manualAdditions}</div>
          <div className="text-sm font-medium text-orange-600 mt-1">Manual Additions</div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">RMC</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">IngredientName</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">CompanyName</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">BrandName</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">GRP</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">SYMBOL</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">IngredientInPlantStatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredIngredients.length > 0 ? (
                filteredIngredients.map((ingredient, index) => {
                  const ingredientRecord = ingredient as Record<string, unknown>
                  const rmc = readRecordText(ingredientRecord, ['RMC', 'rawMaterialCode', 'RawMaterialCode', 'rmc'])
                  const cta = readRecordText(ingredientRecord, ['CTA', 'PlantCTA'])
                  const ingredientName = readRecordText(ingredientRecord, [
                    'IngredientName',
                    'INGREDIENT_NAME',
                    'ingredient',
                    'ingredientLabelName',
                  ])
                  const companyName = readRecordText(ingredientRecord, [
                    'CompanyName',
                    'COMPANY_NAME',
                    'manufacturer',
                  ])
                  const brandName = readRecordText(ingredientRecord, [
                    'BrandName',
                    'BRAND_NAME',
                    'brandName',
                    'brand',
                  ])
                  const group = readRecordText(ingredientRecord, ['GRP', 'group'])
                  const symbol = readRecordText(ingredientRecord, [
                    'SYMBOL',
                    'certification',
                    'certifyingAgency',
                  ])
                  const plantStatus = readRecordText(ingredientRecord, [
                    'IngredientInPlantStatus',
                    'plantStatus',
                    'status',
                  ])

                  return (
                    <tr
                      key={`${ingredientName || rmc || 'ingredient'}-${index}`}
                      className={`hover:bg-gray-50 transition-colors ${
                        ingredient.status === 'Recent' ? 'bg-green-50/50' : ''
                      }`}
                    >
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="font-medium text-gray-900">{displayText(rmc)}</div>
                        {cta ? <div className="mt-1 text-xs font-normal text-gray-500">CTA: {cta}</div> : null}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <span className="font-medium text-gray-900">{displayText(ingredientName)}</span>
                      </td>
                      <td className="py-3 px-4 align-top text-gray-700">{displayText(companyName)}</td>
                      <td className="py-3 px-4 align-top text-gray-700">{displayText(brandName)}</td>
                      <td className="py-3 px-4 align-top text-gray-700">{displayText(group)}</td>
                      <td className="py-3 px-4 align-top text-gray-700">{displayText(symbol)}</td>
                      <td className="py-3 px-4 align-top text-gray-700">{displayText(plantStatus)}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="text-gray-400">
                      <p className="text-sm font-medium">No ingredients found</p>
                      <p className="text-xs mt-1">
                        {showRecentOnly ? 'No recent ingredients to display' : 'No ingredients have been added yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800 leading-relaxed">
          <strong className="font-semibold">NCRC Database Integration:</strong> All ingredients automatically sync with NCRC database.
          Recent additions are highlighted and tracked for audit purposes. Ingredient certifications verified
          with suppliers and documentation uploaded.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-green-600 rounded"></span>
            Ingredient Sources
          </h4>
          <div className="space-y-2 text-sm text-green-800">
            <div className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">-</span>
              <span>7 ingredients from uploaded spreadsheets</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">-</span>
              <span>2 ingredients manually added by team</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">-</span>
              <span>1 ingredient auto-synced from supplier portal</span>
            </div>
          </div>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-600 rounded"></span>
            Kosher Status
          </h4>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">-</span>
              <span>All ingredients OU certified</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">-</span>
              <span>1 ingredient OU-P (Pareve) certified</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">-</span>
              <span>Certification documents uploaded and verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
