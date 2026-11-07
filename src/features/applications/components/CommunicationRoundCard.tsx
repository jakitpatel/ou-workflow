import { useId, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

/**
 * One round in a Communication tab (Contract, Schedule A, Schedule B). Collapsed by default: only
 * the header and the summary (To / Subject) show; clicking the header reveals the message,
 * attachments and replies.
 */
export function CommunicationRoundCard({
  header,
  summary,
  children,
  defaultOpen = false,
}: {
  /** Header content (round number, status, sent date); the whole header is the toggle. */
  header: ReactNode
  summary: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const detailsId = useId()

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={open ? detailsId : undefined}
        className="flex w-full items-center gap-2 border-b bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
          aria-hidden="true"
        />
        <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
          {header}
        </span>
      </button>
      <div className="space-y-3 px-4 py-3">
        {summary}
        {open ? (
          <div id={detailsId} className="space-y-3">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * One reply inside a round. Collapsed by default like the round: the header (Reply, From,
 * received date) and the summary (To / Subject) show; clicking the header reveals the reply
 * text and its attachments.
 */
export function CommunicationReplyCard({
  header,
  summary,
  children,
  defaultOpen = false,
}: {
  header: ReactNode
  summary: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const detailsId = useId()

  return (
    <div className="rounded-md border border-green-100 bg-green-50/60 px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={open ? detailsId : undefined}
        className="mb-2 flex w-full items-center gap-1.5 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
          aria-hidden="true"
        />
        <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
          {header}
        </span>
      </button>
      {summary}
      {open ? (
        <div id={detailsId} className="mt-1">
          {children}
        </div>
      ) : null}
    </div>
  )
}
