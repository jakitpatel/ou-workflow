import type { ApplicationDetail } from "@/types/application";
import { Beaker } from "lucide-react";

export default function IngredientMgmt({ application, showRecentOnly, setShowRecentOnly }: { application: ApplicationDetail, showRecentOnly: boolean, setShowRecentOnly: (value: boolean) => void }) {
  const ingredientData = application.ingredients || [];
  return (
    <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Ingredient Management</h2>
            <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Show:</label>
                <button
                onClick={() => setShowRecentOnly(!showRecentOnly)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    showRecentOnly 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-700'
                }`}
                >
                {showRecentOnly ? 'Recent Only' : 'All Ingredients'}
                </button>
            </div>
            <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Beaker className="h-4 w-4 mr-2" />
                Add New Ingredient
            </button>
            </div>
        </div>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">{ingredientData.length}</div>
            <div className="text-sm text-blue-700">Total Ingredients</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{ingredientData.filter(i => i.status === 'Recent').length}</div>
            <div className="text-sm text-green-700">Added This Week</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600">{ingredientData.filter(i => i.ncrcId).length}</div>
            <div className="text-sm text-purple-700">In NCRC Database</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600">{ingredientData.filter(i => i.addedBy !== 'System Import').length}</div>
            <div className="text-sm text-orange-700">Manual Additions</div>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full table-auto">
            <thead>
                <tr className="border-b">
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">NCRC ID</th>
                <th className="text-left py-3 px-4">Ingredient Name</th>
                <th className="text-left py-3 px-4">Manufacturer</th>
                <th className="text-left py-3 px-4">Brand</th>
                <th className="text-left py-3 px-4">Packaging</th>
                <th className="text-left py-3 px-4">Certification</th>
                <th className="text-left py-3 px-4">Added Date</th>
                <th className="text-left py-3 px-4">Added By</th>
                </tr>
            </thead>
            <tbody>
                {(showRecentOnly ? ingredientData.filter(i => i.status === 'Recent') : ingredientData).map((ingredient, index) => (
                <tr key={index} className={`border-b ${ingredient.status === 'Recent' ? 'bg-green-50' : ''}`}>
                    <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ingredient.status === 'Recent' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                        {ingredient.status === 'Recent' ? '🆕 New' : '📋 Original'}
                    </span>
                    </td>
                    <td className="py-3 px-4">
                    <span className="text-blue-600 font-mono text-xs">{ingredient.ncrcId}</span>
                    </td>
                    <td className="py-3 px-4 font-medium">{ingredient.ingredient}</td>
                    <td className="py-3 px-4">{ingredient.manufacturer}</td>
                    <td className="py-3 px-4">{ingredient.brand}</td>
                    <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                        ingredient.packaging === 'bulk' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                        {ingredient.packaging}
                    </span>
                    </td>
                    <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        {ingredient.agency}
                    </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{ingredient.addedDate}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{ingredient.addedBy}</td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
            <strong>NCRC Database Integration:</strong> All ingredients automatically sync with NCRC database. 
            Recent additions are highlighted and tracked for audit purposes. Ingredient certifications verified 
            with suppliers and documentation uploaded.
            </p>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Ingredient Sources</h4>
            <div className="space-y-1 text-sm text-green-700">
                <div>• 7 ingredients from uploaded spreadsheets</div>
                <div>• 2 ingredients manually added by team</div>
                <div>• 1 ingredient auto-synced from supplier portal</div>
            </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Kosher Status</h4>
            <div className="space-y-1 text-sm text-blue-700">
                <div>• All ingredients OU certified</div>
                <div>• 1 ingredient OU-P (Pareve) certified</div>
                <div>• Certification documents uploaded and verified</div>
            </div>
            </div>
        </div>
    </div>
  );
}