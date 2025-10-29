import { createFileRoute } from '@tanstack/react-router'
import { NCRCDashboard } from '@/components/ou-workflow/NCRCDashboard'

export const Route = createFileRoute('/ou-workflow/ncrc-dashboard/')({
  component: NcrcDashboardWrapper,
})

function NcrcDashboardWrapper() {
  // Access context passed from index.tsx layout
  const {
    showIngredientsManager,
    setShowIngredientsManager,
    selectedIngredientApp,
    setSelectedIngredientApp,
  } = Route.useRouteContext() as any

  return (
    <NCRCDashboard
      showIngredientsManager={showIngredientsManager}
      setShowIngredientsManager={setShowIngredientsManager}
      selectedIngredientApp={selectedIngredientApp}
      setSelectedIngredientApp={setSelectedIngredientApp}
    />
  )
}
