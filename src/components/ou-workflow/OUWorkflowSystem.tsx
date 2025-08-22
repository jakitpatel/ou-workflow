import React, { useState } from 'react'
import { Navigation } from './Navigation'
import { NCRCDashboard } from './NCRCDashboard'
import { TaskDashboard } from './TaskDashboard'

export function OUWorkflowSystem() {
  const [activeScreen, setActiveScreen] = useState<'ncrc-dashboard' | 'tasks-dashboard'>('ncrc-dashboard')
  const [showIngredientsManager, setShowIngredientsManager] = useState(false)
  const [selectedIngredientApp, setSelectedIngredientApp] = useState<any>(null)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeScreen={activeScreen} setActiveScreen={setActiveScreen} />

      {activeScreen === 'ncrc-dashboard' && (
        <NCRCDashboard
          showIngredientsManager={showIngredientsManager}
          setShowIngredientsManager={setShowIngredientsManager}
          selectedIngredientApp={selectedIngredientApp}
          setSelectedIngredientApp={setSelectedIngredientApp}
          setActiveScreen={setActiveScreen}
        />
      )}

      {activeScreen === 'tasks-dashboard' && (
        <TaskDashboard setActiveScreen={setActiveScreen} />
      )}
    </div>
  )
}
