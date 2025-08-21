import React, { useState } from 'react'
import { Navigation } from './Navigation'
import { IngredientsManagerPage } from './IngredientsManagerPage'
import { NCRCDashboard } from './NCRCDashboard'
import { TasksTab } from './TasksTab'
import { NotificationsTab } from './NotificationsTab'

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
        <>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-800">Tasks & Notifications (TODO)</h2>
        </div>
        <TasksTab />
        <NotificationsTab />
        </>
      )}

      {showIngredientsManager && selectedIngredientApp && (
        <IngredientsManagerPage
          selectedIngredientApp={selectedIngredientApp}
          setShowIngredientsManager={setShowIngredientsManager}
        />
      )}
    </div>
  )
}
