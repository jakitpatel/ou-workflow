import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ApplicationDetail } from '@/types/application'
import PlantsSection from './PlantsSection'

const application = (address: Record<string, string>) =>
  ({
    applicationId: '16',
    plants: [{ name: 'Main Plant', plantID: 1016, ownsId: 16, status: 'PROSPECT' }],
    plantAddresses: [{ street: '200 Depot St', city: 'Seattle', state: 'WA', country: 'USA', type: 'Physical', ...address }],
    plantContacts: {},
  }) as unknown as ApplicationDetail

const inputValues = (container: HTMLElement) =>
  [...container.querySelectorAll('input')].map((input) => input.value)

describe('PlantsSection ZIP (F13)', () => {
  it('shows postalCode from get_application_detail_v2', () => {
    const { container } = render(<PlantsSection application={application({ postalCode: '20043' })} editMode={false} />)
    expect(inputValues(container)).toContain('20043')
  })

  it('still shows zip from the intake adapter', () => {
    const { container } = render(<PlantsSection application={application({ zip: '11201' })} editMode={false} />)
    expect(inputValues(container)).toContain('11201')
  })
})
