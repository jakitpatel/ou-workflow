export function InspectionEmailBodyPreview({ body, applicationUrl }: { body: string; applicationUrl: string }) {
  const lines = body.split('\n')
  return lines.map((line, index) => {
    const applicationLinkLabel = line.match(/^Application link:\s*(.*)$/)?.[1]
    const ouDirectUrl = line.match(/^OUDirect:\s*(https:\/\/oudirect-st\.ou\.org\/oudirect\/login)\s*$/)?.[1]

    return (
      <span key={`${index}-${line}`}>
        {ouDirectUrl ? (
          <a href={ouDirectUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline hover:text-blue-800">
            OUDirect
          </a>
        ) : applicationLinkLabel !== undefined && applicationUrl ? (
          <>
            Application link:{' '}
            <a href={applicationUrl} className="font-semibold text-blue-700 underline hover:text-blue-800">
              {applicationLinkLabel || applicationUrl}
            </a>
          </>
        ) : line}
        {index < lines.length - 1 ? '\n' : null}
      </span>
    )
  })
}
