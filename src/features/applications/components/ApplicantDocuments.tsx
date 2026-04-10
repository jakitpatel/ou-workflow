import { ClipboardList, ExternalLink, FileText, Package } from 'lucide-react'

const DOCUMENT_TYPES = [
  { key: 'APP', label: 'Application Details', icon: ClipboardList },
  { key: 'ING', label: 'Ingredients List', icon: Package },
  { key: 'PROD', label: 'Product Details', icon: FileText },
] as const

export function ApplicantDocuments({ filesByType }: { filesByType?: Record<string, any> }) {
  if (!filesByType) return null

  const availableDocs = DOCUMENT_TYPES.filter((doc) => filesByType[doc.key])
  if (availableDocs.length === 0) return null

  return (
    <div className="flex items-center gap-3 min-w-0 overflow-hidden whitespace-nowrap">
      <span className="text-xs text-gray-500 font-medium shrink-0">Pre-NCRC Documentation:</span>
      {availableDocs.map(({ key, label, icon: Icon }) => {
        const file = filesByType[key]
        return (
          <a
            key={key}
            href={file.filePath}
            target="_blank"
            rel="noopener noreferrer"
            title={file.fileName}
            className="flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded whitespace-nowrap"
          >
            <Icon className="w-3 h-3 mr-1" aria-hidden="true" />
            {label}
            <ExternalLink className="w-3 h-3 ml-1" aria-hidden="true" />
            <span className="sr-only">(opens in new tab)</span>
          </a>
        )
      })}
    </div>
  )
}
