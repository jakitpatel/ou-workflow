import { useRef } from 'react'

/** Radix dialogs without a DialogTrigger still return focus to their opener. */
export function useDialogReturnFocus() {
  const opener = useRef<HTMLElement | null>(null)
  return {
    onOpenAutoFocus: () => { opener.current = document.activeElement as HTMLElement | null },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault()
      if (opener.current?.isConnected) opener.current.focus()
    },
  }
}
