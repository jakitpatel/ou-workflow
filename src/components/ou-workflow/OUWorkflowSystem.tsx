import React, { useState } from 'react'
import { Navigation } from './Navigation'
import { NCRCDashboard } from './NCRCDashboard'
import { TaskDashboard } from './TaskDashboard'
import { useUser } from './../../context/UserContext'  // 👈 new import

export function OUWorkflowSystem() {
  const { activeScreen } = useUser();
  const [showIngredientsManager, setShowIngredientsManager] = useState(false)
  const [selectedIngredientApp, setSelectedIngredientApp] = useState<any>(null)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {activeScreen === 'ncrc-dashboard' && (
        <NCRCDashboard
          showIngredientsManager={showIngredientsManager}
          setShowIngredientsManager={setShowIngredientsManager}
          selectedIngredientApp={selectedIngredientApp}
          setSelectedIngredientApp={setSelectedIngredientApp}
        />
      )}

      {activeScreen === 'tasks-dashboard' && (
        <TaskDashboard />
      )}
    </div>
  )
}
