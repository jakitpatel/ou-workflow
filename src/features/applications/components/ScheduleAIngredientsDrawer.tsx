type Props = {
  open: boolean
  applicationId?: string | number
  applicationName?: string
  taskInstanceId?: string | number | null
  taskName?: string
  onClose: () => void
}

export function ScheduleAIngredientsDrawer({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 flex h-full w-full max-w-[96vw] items-center justify-center bg-white shadow-2xl lg:max-w-[72vw]"
        onClick={(event) => event.stopPropagation()}
      >
        Hello World
      </div>
    </div>
  )
}
