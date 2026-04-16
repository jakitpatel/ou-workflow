import React from 'react';
import { History, X } from 'lucide-react';
import type { PlantHistoryEntry } from '@/features/tasks/model/plantHistory';

interface PlantHistoryModalProps {
  showPlantHistory: string | null;
  setShowPlantHistory: (plant: string | null) => void;
  plantHistory?: Record<string, PlantHistoryEntry>;
  onViewNCRCDashboard?: (plantName: string) => void;
}

export const PlantHistoryModal: React.FC<PlantHistoryModalProps> = ({
  showPlantHistory,
  setShowPlantHistory,
  plantHistory = {},
  onViewNCRCDashboard,
}) => {
  if (!showPlantHistory) return null;

  const plant = plantHistory[showPlantHistory];
  if (!plant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="plant-history-modal max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b bg-gray-50 p-6">
          <div className="flex items-center space-x-3">
            <History className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold">{showPlantHistory}</h3>
          </div>
          <button
            onClick={() => setShowPlantHistory(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="mb-3 font-medium text-gray-900">Application History</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Total Applications:</span> {plant.applications}
                </p>
                <p>
                  <span className="font-medium">Last Certified:</span>{' '}
                  {plant.lastCertified || 'Never'}
                </p>
                <p>
                  <span className="font-medium">Current Stage:</span> {plant.currentStage}
                </p>
              </div>
            </div>

            <div>
              <h4 className="mb-3 font-medium text-gray-900">Contact Information</h4>
              <div className="text-sm">
                <p className="font-medium">{plant.contact}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-medium text-gray-900">Products</h4>
            <div className="flex flex-wrap gap-2">
              {plant.products.map((product, index) => (
                <span
                  key={index}
                  className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                >
                  {product}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-medium text-gray-900">Notes</h4>
            <p className="rounded bg-gray-50 p-3 text-sm text-gray-700">{plant.notes}</p>
          </div>

          {onViewNCRCDashboard && (
            <div className="border-t pt-4">
              <button
                onClick={() => {
                  setShowPlantHistory(null);
                  onViewNCRCDashboard(showPlantHistory);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                View in NCRC Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
