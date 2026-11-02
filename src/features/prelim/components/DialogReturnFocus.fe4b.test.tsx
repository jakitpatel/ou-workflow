import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import { CompanySearchDialog } from './CompanySearchDialog'
import { PlantSearchDialog } from './PlantSearchDialog'
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token:'test' }) }))
it.each([['Company', CompanySearchDialog], ['Plant', PlantSearchDialog]] as const)('returns from %s search to its opener', async (_name, Component) => {
  function Harness() {
    const [open, setOpen] = useState(false)
    return <><button onClick={() => setOpen(true)}>Search trigger</button>{open && <Component companyName="" plantName="" onClose={() => setOpen(false)} onSelect={() => {}} />}</>
  }
  render(<QueryClientProvider client={new QueryClient()}><Harness /></QueryClientProvider>)
  const trigger = screen.getByText('Search trigger'); trigger.focus(); fireEvent.click(trigger)
  await waitFor(() => expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true))
  fireEvent.keyDown(document.activeElement!, { key:'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await waitFor(() => expect(document.activeElement).toBe(trigger))
})
