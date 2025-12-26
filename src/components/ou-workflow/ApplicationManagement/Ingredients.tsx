import type { ApplicationDetail } from "@/types/application";

export default function IngredientMgmt({ 
  application, 
  showRecentOnly, 
  setShowRecentOnly 
}: { 
  application: ApplicationDetail, 
  showRecentOnly: boolean, 
  setShowRecentOnly: (value: boolean) => void 
}) {
  const ingredientData = application.ingredients || [];
  const filteredIngredients = showRecentOnly 
    ? ingredientData.filter(i => i.status === 'Recent') 
    : ingredientData;

  // Calculate statistics
  const stats = {
    total: ingredientData.length,
    recentlyAdded: ingredientData.filter(i => i.status === 'Recent').length,
    inNCRC: ingredientData.filter(i => i.ncrcId).length,
    manualAdditions: ingredientData.filter(i => i.addedBy !== 'System Import').length
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header Section */}
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

      {/* Statistics Cards */}
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

      {/* Table Section */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">NCRC ID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Ingredient Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Manufacturer</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Brand</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Packaging</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Certification</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Added Date</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Added By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredIngredients.length > 0 ? (
                filteredIngredients.map((ingredient, index) => (
                  <tr 
                    key={index} 
                    className={`hover:bg-gray-50 transition-colors ${
                      ingredient.status === 'Recent' ? 'bg-green-50/50' : ''
                    }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        ingredient.status === 'Recent' 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {ingredient.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-blue-600 font-mono text-xs font-medium">
                        {ingredient.ncrcId || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{ingredient.ingredient}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{ingredient.manufacturer}</td>
                    <td className="py-3 px-4 text-gray-700">{ingredient.brand}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                        ingredient.packaging === 'bulk' 
                          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}>
                        {ingredient.packaging}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-medium">
                        {ingredient.certification}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {ingredient.addedDate}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{ingredient.addedBy}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="text-gray-400">
                      <p className="text-sm font-medium">No ingredients found</p>
                      <p className="text-xs mt-1">
                        {showRecentOnly 
                          ? 'No recent ingredients to display' 
                          : 'No ingredients have been added yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800 leading-relaxed">
          <strong className="font-semibold">NCRC Database Integration:</strong> All ingredients automatically sync with NCRC database. 
          Recent additions are highlighted and tracked for audit purposes. Ingredient certifications verified 
          with suppliers and documentation uploaded.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-green-600 rounded"></span>
            Ingredient Sources
          </h4>
          <div className="space-y-2 text-sm text-green-800">
            <div className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">•</span>
              <span>7 ingredients from uploaded spreadsheets</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">•</span>
              <span>2 ingredients manually added by team</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">•</span>
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
              <span className="text-blue-600 mt-0.5">•</span>
              <span>All ingredients OU certified</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>1 ingredient OU-P (Pareve) certified</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Certification documents uploaded and verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}