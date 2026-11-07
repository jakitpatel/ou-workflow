import { Paperclip } from 'lucide-react'
import { parseMessageAttachments } from './messageAttachments'

const S3_UNAVAILABLE =
  'Stored in S3. It can be opened from the dashboard once the server provides a download link.'

/** The attachments recorded on a message (request or response), as chips; openable ones are links. */
export function MessageAttachmentList({ attachments }: { attachments?: string | null }) {
  const items = parseMessageAttachments(attachments)
  if (!items.length) return null

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Attachments" role="group">
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
        <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
        {items.length === 1 ? 'Attachment' : `${items.length} attachments`}
      </span>
      {items.map((item, index) =>
        item.href ? (
          <a
            key={`${item.reference}-${index}`}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`Open ${item.name}`}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Paperclip className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.name}</span>
          </a>
        ) : (
          <span
            key={`${item.reference}-${index}`}
            title={item.storage === 's3' ? S3_UNAVAILABLE : item.reference}
            className="inline-flex max-w-full cursor-not-allowed items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600"
          >
            <Paperclip className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.name}</span>
            {item.storage === 's3' ? <span className="sr-only"> ({S3_UNAVAILABLE})</span> : null}
          </span>
        ),
      )}
    </div>
  )
}
