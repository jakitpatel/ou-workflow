import { useState } from 'react'
import type { Match } from '../model/resolution'

// Keep an explicit choice separate from the suggested matches so refetching the
// application cannot replace a company selected through search or manual entry.
export function useResolutionMatch(matches: Match[], selectedId?: string | number, scope = '') {
  const [selection, setSelection] = useState<{
    scope: string
    choice?: Match | null
    createdMatch: Match | null
  }>({ scope, createdMatch: null })
  const current = selection.scope === scope ? selection : { scope, createdMatch: null }
  const suggested =
    matches.find((match) => String(match.Id) === String(selectedId)) ?? matches[0] ?? null
  return {
    selectedMatch: current.choice === undefined ? suggested : current.choice,
    setSelectedMatch: (choice: Match | null) => setSelection((previous) => ({
      ...(previous.scope === scope ? previous : { scope, createdMatch: null }), choice,
    })),
    createdMatch: current.createdMatch,
    setCreatedMatch: (createdMatch: Match | null) => setSelection((previous) => ({
      ...(previous.scope === scope ? previous : { scope }), createdMatch,
    })),
  }
}
