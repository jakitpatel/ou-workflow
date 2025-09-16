import React from 'react'
import { History, X } from 'lucide-react'

interface Plant {
  applications: number
  lastCertified: string | null
  currentStage: string
  notes: string
  contact: string
  products: string[]
}

interface PlantHistoryModalProps {
  showPlantHistory: string | null
  setShowPlantHistory: (plant: string | null) => void
  plantHistory?: Record<string, Plant>
  onViewNCRCDashboard?: (plantName: string) => void
}

export const PlantHistoryModal: React.FC<PlantHistoryModalProps> = ({
  showPlantHistory,
  setShowPlantHistory,
  plantHistory = {},
  onViewNCRCDashboard,
}) => {
  if (!showPlantHistory) return null

  const plant = plantHistory[showPlantHistory]
  if (!plant) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="plant-history-modal bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <History className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-semibold">{showPlantHistory}</h3>
          </div>
          <button
            onClick={() => setShowPlantHistory(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Application History</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Total Applications:</span> {plant.applications}
                </p>
                <p>
                  <span className="font-medium">Last Certified:</span> {plant.lastCertified || 'Never'}
                </p>
                <p>
                  <span className="font-medium">Current Stage:</span> {plant.currentStage}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
              <div className="text-sm">
                <p className="font-medium">{plant.contact}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Products</h4>
            <div className="flex flex-wrap gap-2">
              {plant.products.map((product, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {product}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{plant.notes}</p>
          </div>

          {onViewNCRCDashboard && (
            <div className="pt-4 border-t">
              <button
                onClick={() => {
                  setShowPlantHistory(null)
                  onViewNCRCDashboard(showPlantHistory)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View in NCRC Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
