import type { RawApplicationEntry } from '@/types/application'

const normalizeText = (value?: string) =>
  String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export default function RawApplicationPanel({ entries }: { entries?: RawApplicationEntry[] }) {
  const normalizedEntries = (entries ?? []).map((entry, index) => ({
    id: `${index}-${normalizeText(entry.prompt)}`,
    prompt: normalizeText(entry.prompt) || `Question ${index + 1}`,
    answer: normalizeText(entry.answer) || '-',
  }))

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-2xl font-semibold text-gray-900">Raw Application</h2>
        <p className="mt-1 text-sm text-gray-500">
          Original submitted question and answer pairs from the application detail response.
        </p>
      </div>

      {normalizedEntries.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {normalizedEntries.map((entry) => (
            <div
              key={entry.id}
              className="grid gap-2 px-6 py-3 lg:grid-cols-[minmax(260px,360px)_1fr] lg:items-start lg:gap-4"
            >
              <div className="text-sm font-medium text-gray-700">{entry.prompt}</div>
              <div className="text-sm text-gray-900">{entry.answer}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6 py-10 text-sm text-gray-500">No raw application data is available for this record.</div>
      )}
    </div>
  )
}
