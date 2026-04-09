import { Outlet, createRootRoute } from '@tanstack/react-router'
import { RouteErrorView } from '@/components/feedback/RouteErrorView'

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RootErrorBoundary,
})

function RootLayout() {
  return <Outlet />
}

function RootErrorBoundary({
  error,
  reset,
}: {
  error: unknown
  reset?: () => void
}) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      title="Application error"
      description="The application hit an unexpected error. Try recovering here before refreshing the whole app."
    />
  )
}
