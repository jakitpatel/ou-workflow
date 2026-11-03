import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PrelimResolutionDrawerHeader } from './PrelimResolutionDrawerHeader'

const renderPlantHeader = (plantCompanyId?: string | number | null) =>
  render(
    <PrelimResolutionDrawerHeader
      isCompany={false}
      type="plant"
      companyData={{ companyName: 'I.P.A. srl' } as never}
      plantData={{ plantName: 'I.P.A. srl plant' } as never}
      selectedMatch={null}
      isCreatedMatch={false}
      bestMatch={null}
      confirmedMatch={null}
      applicationId={1659}
      plantCompanyId={plantCompanyId}
      onClose={vi.fn()}
    />,
  )

describe('PrelimResolutionDrawerHeader (plant)', () => {
  it('shows the company the plant is resolved under', () => {
    renderPlantHeader('1446414')
    expect(screen.getByText('Co #1446414')).toBeTruthy()
  })

  it('shows N/A, not a made-up company number, when there is no company yet', () => {
    for (const value of [undefined, null, '', '  ']) {
      const { unmount } = renderPlantHeader(value)
      expect(screen.getByText('Co #N/A')).toBeTruthy()
      expect(screen.queryByText(/182456/)).toBeNull()
      unmount()
    }
  })
})
