import type { ReactNode } from 'react'

type RouteErrorViewProps = {
  error: unknown
  reset?: () => void
  title?: string
  description?: string
  primaryActionLabel?: string
  secondaryAction?: ReactNode
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  return 'An unexpected error occurred while loading this page.'
}

export function RouteErrorView({
  error,
  reset,
  title = 'Something went wrong',
  description = 'The page hit an unexpected problem. You can try again without leaving your current workflow.',
  primaryActionLabel = 'Try Again',
  secondaryAction,
}: RouteErrorViewProps) {
  const message = getErrorMessage(error)

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        </div>

        <div className="rounded-lg border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Error details</p>
          <p className="mt-1 break-words text-sm text-red-700">{message}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {reset ? (
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              {primaryActionLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Go Home
          </button>
          {secondaryAction}
        </div>
      </div>
    </div>
  )
}
