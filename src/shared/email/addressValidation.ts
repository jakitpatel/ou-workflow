const EMAIL_ADDRESS_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/

export const getInvalidEmailAddresses = (value: string) =>
  value
    .split(/[;,]/)
    .map((address) => address.trim())
    .filter(Boolean)
    .filter((address) => !EMAIL_ADDRESS_PATTERN.test(address))

export const isValidEmailAddressList = (value: string, required = false) => {
  const addresses = value
    .split(/[;,]/)
    .map((address) => address.trim())
    .filter(Boolean)

  return (!required || addresses.length > 0) && getInvalidEmailAddresses(value).length === 0
}

export const assertValidEmailRecipients = ({
  bcc = '',
  cc = '',
  to,
}: {
  bcc?: string
  cc?: string
  to: string
}) => {
  const invalidFields = [
    ['To', to, true],
    ['Cc', cc, false],
    ['Bcc', bcc, false],
  ]
    .map(([label, value, required]) => ({
      label,
      invalid: !isValidEmailAddressList(String(value), Boolean(required)),
      invalidAddresses: getInvalidEmailAddresses(String(value)),
    }))
    .filter(({ invalid }) => invalid)

  if (invalidFields.length === 0) return

  const details = invalidFields
    .map(({ label, invalidAddresses }) =>
      invalidAddresses.length > 0
        ? `${label}: ${invalidAddresses.join(', ')}`
        : `${label}: an email address is required`,
    )
    .join('; ')

  throw new Error(`Enter valid email addresses. ${details}`)
}
