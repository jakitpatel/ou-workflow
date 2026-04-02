import { useQuery } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAppPreferences } from '@/context/AppPreferencesContext'
import { renderWithProviders } from '@/test/renderWithProviders'

function QueryAndUserExample() {
  const { stageLayout } = useAppPreferences()

  const { data } = useQuery({
    queryKey: ['example', 'greeting'],
    queryFn: async () => 'hello from query',
  })

  return (
    <div>
      <div>stage-layout: {stageLayout}</div>
      <div>{data ?? 'loading'}</div>
    </div>
  )
}

describe('renderWithProviders example', () => {
  it('renders with QueryClientProvider + UserProvider', async () => {
    renderWithProviders(<QueryAndUserExample />)

    expect(screen.getByText('stage-layout: mixed')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByText('hello from query')).toBeTruthy()
    })
  })
})
