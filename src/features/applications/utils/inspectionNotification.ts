export const formatInspectionContactName = (
  contact?: { PREFIX?: string | null; LAST?: string | null; FIRST?: string | null } | string | null,
): string => {
  if (typeof contact === 'string') {
    const parts = contact.split(',').map((part) => part.replace(/\s+/g, ' ').trim())
    if (parts.length === 2) return [parts[1], parts[0]].filter(Boolean).join(' ')
    if (parts.length === 3) return [parts[0], parts[2], parts[1]].filter(Boolean).join(' ')
    return contact.replace(/\s+/g, ' ').trim()
  }
  return [contact?.PREFIX, contact?.FIRST, contact?.LAST]
    .map((part) => part?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean)
    .join(' ')
}

export const formatDate = (ymd: string) => {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const buildNotificationBody = ({
  rfrName,
  senderName,
  plant,
  company,
  accountNumber,
  applicationLinkLabel,
  accountApplicationUrl,
  assignmentStartDate,
  assignmentEndDate,
  visitId,
}: {
  rfrName: string
  senderName: string
  plant: string
  company: string
  accountNumber: string
  applicationLinkLabel: string
  accountApplicationUrl: string
  assignmentStartDate: string
  assignmentEndDate: string
  visitId: string
}) =>
  [
    `To ${rfrName || 'RFR'},`,
    '',
    `You've been assigned an initial inspection by ${senderName || 'NCRC'}. Please review the plant and set your planned visit date.`,
    '',
    `Plant: ${plant || '-'}`,
    '',
    `Company: ${company || '-'}`,
    '',
    `Account #: ${accountNumber || '-'}`,
    ...(accountApplicationUrl ? ['', `Application link: ${applicationLinkLabel}`] : []),
    '',
    `Date range: ${formatDate(assignmentStartDate)} - ${formatDate(assignmentEndDate)}`,
    '',
    `Visit ID: ${visitId || '-'}`,
    '',
    'Please submit EIR for Initial Inspection on OUDirect',
  ].join('\n')
