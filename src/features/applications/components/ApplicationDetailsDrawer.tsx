import { ModalSurface, ModalFocusBoundary } from '@/components/ui/ModalSurface'
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
    <ModalFocusBoundary>
    <Suspense
      fallback={
        <div className="fixed inset-0 pointer-events-auto z-50 bg-black/40">
          <ModalSurface onClose={props.onClose} label="Application Details"
            role="dialog"
            aria-modal="true"
            aria-label="Application Details"
            aria-busy="true"
            className="fixed right-0 top-0 h-full w-full max-w-[96vw] bg-white p-8 shadow-2xl lg:max-w-[50vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <span role="status">Loading application details...</span>
            <button type="button" onClick={props.onClose} className="ml-4 underline">
              Close
            </button>
          </ModalSurface>
        </div>
      }
    >
      <DrawerContent {...props} />
    </Suspense>
    </ModalFocusBoundary>
  )
}
