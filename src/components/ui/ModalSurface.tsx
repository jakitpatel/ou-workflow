import * as Dialog from '@radix-ui/react-dialog'
import { createContext, forwardRef, useContext, useRef } from 'react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type Props = ComponentPropsWithoutRef<'div'> & {
  onClose: () => void
  label?: string
  dismissible?: boolean
  embedded?: boolean
}

const ReturnFocusContext = createContext<HTMLElement | null | undefined>(undefined)

/** Keep the original trigger across loading/content replacements. Mount only while open. */
export function ModalFocusBoundary({ children }: { children: ReactNode }) {
  const opener = useRef(document.activeElement as HTMLElement | null)
  return <ReturnFocusContext.Provider value={opener.current}>{children}</ReturnFocusContext.Provider>
}

/** Add modal behavior without changing custom dialog/drawer layouts. */
export const ModalSurface = forwardRef<HTMLDivElement, Props>(function ModalSurface(
  { onClose, label = 'Dialog', dismissible = true, embedded = false, children, ...props }, ref,
) {
  const inheritedFocus = useContext(ReturnFocusContext)
  const returnFocus = useRef<HTMLElement | null>(
    inheritedFocus === undefined ? (typeof document === 'undefined' ? null : document.activeElement as HTMLElement) : inheritedFocus,
  )
  if (embedded) return <div {...props} ref={ref}>{children}</div>
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && dismissible) onClose() }}>
      <Dialog.Content
        {...props}
        ref={ref}
        aria-describedby={props['aria-describedby']}
        aria-label={props['aria-label'] ?? (props['aria-labelledby'] ? undefined : label)}
        onEscapeKeyDown={(event) => {
          event.stopPropagation()
          if (!dismissible) event.preventDefault()
        }}
        onInteractOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (returnFocus.current?.isConnected) returnFocus.current.focus()
        }}
      >
        <Dialog.Title className="sr-only">{label}</Dialog.Title>
        <ReturnFocusContext.Provider value={undefined}>{children}</ReturnFocusContext.Provider>
      </Dialog.Content>
    </Dialog.Root>
  )
})
