export function InspectionEmailBodyPreview({ body, applicationUrl }: { body: string; applicationUrl: string }) {
  const lines = body.split('\n')
  return lines.map((line, index) => {
    const applicationLinkLabel = line.match(/^Application link:\s*(.*)$/)?.[1]
    const ouDirectLink = line.match(/^(Planned visit date|Actual EIR\/inspection|OUDirect):\s*(https?:\/\/\S+)\s*$/)

    return (
      <span key={`${index}-${line}`}>
        {ouDirectLink ? (
          <a href={ouDirectLink[2]} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline hover:text-blue-800">
            {ouDirectLink[1]}
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
