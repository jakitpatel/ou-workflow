// Add the environment recipient only when building an outgoing message, never to a UI draft.
export function withImpliedBcc(visibleBcc?: string | null): string | null {
  const addresses = [visibleBcc, import.meta.env.VITE_EMAIL_IMPLIED_BCC]
    .flatMap((value) => (value ?? '').split(/[;,]/))
    .map((address) => address.trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const unique = addresses.filter((address) => {
    const key = address.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return unique.join(', ') || null
}
