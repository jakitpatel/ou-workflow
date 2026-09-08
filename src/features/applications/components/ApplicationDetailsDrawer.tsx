import { lazy, Suspense } from 'react'
import type { ComponentProps } from 'react'

const DrawerContent = lazy(() =>
  import('./ApplicationDetailsDrawerContent').then((module) => ({
    default: module.ApplicationDetailsDrawer,
  })),
)

export function ApplicationDetailsDrawer(props: ComponentProps<typeof DrawerContent>) {
  if (!props.open) return null

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 bg-black/40" onClick={props.onClose}>
          <div
            role="status"
            className="fixed right-0 top-0 h-full w-full max-w-[96vw] bg-white p-8 shadow-2xl lg:max-w-[50vw]"
            onClick={(event) => event.stopPropagation()}
          >
            Loading application details...
            <button type="button" onClick={props.onClose} className="ml-4 underline">
              Close
            </button>
          </div>
        </div>
      }
    >
      <DrawerContent {...props} />
    </Suspense>
  )
}
