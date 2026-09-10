import { useState } from 'react'

export function useInspectionInvoiceCc(...businessEmails: Array<string | null | undefined>) {
  const [editedCc, setEmailCc] = useState<string>()
  const addresses = businessEmails.map((email) => email?.trim() ?? '').filter(Boolean)
  const defaultCc = addresses
    .filter((email, index) => addresses.findIndex((other) => other.toLowerCase() === email.toLowerCase()) === index)
    .join(', ')

  return { emailCc: editedCc ?? defaultCc, setEmailCc }
}
