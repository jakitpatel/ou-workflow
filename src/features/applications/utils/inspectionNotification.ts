import type { ApplicationDetail } from '@/types/application'

export const buildInspectionContactLines = (application?: ApplicationDetail) => {
  const addresses = application?.plantAddresses ?? []
  const address = addresses.find((entry) => entry.type?.toLowerCase() === 'physical') ?? addresses[0]
  const addressText = address
    ? [address.street, address.line2 || address.street2, address.city, address.state, address.zip || address.postalCode, address.country]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(', ')
    : ''
  const contacts = application?.companyContacts
  const primaryContacts = Array.isArray(contacts)
    ? contacts.filter((contact) => contact.type?.toLowerCase() === 'primary contact')
    : contacts?.primaryContact ?? contacts?.PrimaryContact ?? []

  return {
    plantAddressLines: addressText ? [`Address: ${addressText}`] : [],
    primaryContactLines: primaryContacts.flatMap((contact) => [
      ...(contact.name?.trim() ? [`Primary Contact: ${contact.name.trim()}`] : []),
      ...(contact.role?.trim() ? [`Role: ${contact.role.trim()}`] : []),
      ...(contact.email?.trim() ? [`Email: ${contact.email.trim()}`] : []),
      ...(contact.phone?.trim() ? [`Phone: ${contact.phone.trim()}`] : []),
    ]),
  }
}

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
  plantAddressLines = [],
  primaryContactLines = [],
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
  plantAddressLines?: string[]
  primaryContactLines?: string[]
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
    ...plantAddressLines,
    '',
    `Company: ${company || '-'}`,
    ...primaryContactLines,
    '',
    `Account #: ${accountNumber || '-'}`,
    '',
    'ou-direct: https://oudirect-st.ou.org/oudirect/login',
    ...(accountApplicationUrl ? [`Application link: ${applicationLinkLabel}`] : []),
    '',
    `Date range: ${formatDate(assignmentStartDate)} - ${formatDate(assignmentEndDate)}`,
    '',
    `Visit ID: ${visitId || '-'}`,
    '',
    'Please submit EIR for Initial Inspection on OUDirect',
  ].join('\n')
