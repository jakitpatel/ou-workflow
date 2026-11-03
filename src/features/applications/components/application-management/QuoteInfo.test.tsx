import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { ApplicationDetail } from '@/types/application'
import QuoteInfo from './QuoteInfo'
it.each([undefined, null, {}])('reports unavailable quote data honestly (%s)', (quotes) => {
  render(<QuoteInfo application={{ quotes } as unknown as ApplicationDetail} />)
  expect(screen.getByText('Quote information is unavailable for this application.')).toBeTruthy()
  expect(screen.queryByText(/Quote Requires Verification|marked complete/)).toBeNull()
})
it('distinguishes an explicit empty list from unavailable data', () => {
  render(<QuoteInfo application={{ quotes: [] } as unknown as ApplicationDetail} />)
  expect(screen.getByText('No quotes were returned for this application.')).toBeTruthy()
})
it.each(['accepted', 'pending_acceptance', 'rejected', 'expired', 'custom status', ''])('renders the returned status without completion policy (%s)', (Status) => {
  render(<QuoteInfo application={{ quotes: [{ QuoteNumber: 'HUNT-C-03', TotalAmount: '250', Status, items: [] }] } as unknown as ApplicationDetail} />)
  expect(screen.getByText(Status || 'Unknown')).toBeTruthy()
  expect(screen.getByText('HUNT-C-03')).toBeTruthy()
  expect(screen.queryByText(/Requires Verification|marked complete/)).toBeNull()
})
