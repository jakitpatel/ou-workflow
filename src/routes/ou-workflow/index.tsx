import { Outlet, createFileRoute,redirect } from '@tanstack/react-router'
import { Navigation } from '@/components/ou-workflow/Navigation'
import { TaskProvider } from '@/context/TaskContext'
import { useState } from 'react'

function OUWorkflowLayout() {
  const [showIngredientsManager, setShowIngredientsManager] = useState(false)
  const [selectedIngredientApp, setSelectedIngredientApp] = useState<any>(null)

  return (
    <TaskProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <Outlet
          context={{
            showIngredientsManager,
            setShowIngredientsManager,
            selectedIngredientApp,
            setSelectedIngredientApp,
          }}
        />
      </div>
    </TaskProvider>
  )
}

export const Route = createFileRoute('/ou-workflow/')({
  beforeLoad: () => {
    throw redirect({ to: '/ou-workflow/ncrc-dashboard' })
  },
  component: OUWorkflowLayout,
})
