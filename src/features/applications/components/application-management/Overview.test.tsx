import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ApplicationOverviewDetail } from '@/features/applications/model/applicationOverview'
import Overview from './Overview'

function detail(flag: boolean | 'Y' | 'N' = 'Y'): ApplicationOverviewDetail {
  return {
    applicationId: '1220', status: 'In Progress', contacts: [], products: [],
    company: [{ name: 'Instafarm, LLC', companyId: 1445256, is_new: flag }],
    plants: [{
      id: 14065202, plantId: '14065202', plantID: 14065202, name: 'Instafarm, LLC',
      address: null, contact: null, manufacturing: null,
      ownsId: 14095521, status: 'Pending', is_new_plant: false, is_new_owns: flag,
    }],
    OwnsID: 999, OwnsStatus: 'Old status',
  }
}

function row(label: string) {
  return within(screen.getByText(label, { exact: true }).parentElement!)
}

describe('Application Detail Overview', () => {
  it('uses the revised plant ownership fields and marks the sample company/plant/owns', () => {
    render(<Overview application={detail()} />)
    expect(row('Owns ID').getByText('14095521')).toBeTruthy()
    expect(row('OwnsStatus').getByText('Pending')).toBeTruthy()
    expect(row('Company ID').getByTitle('Created').textContent).toBe('C')
    expect(row('Plant ID').getByTitle('Modified').textContent).toBe('M')
    expect(row('Owns ID').getByTitle('Created').textContent).toBe('C')
    expect(screen.queryByText('Old status')).toBeNull()
  })

  it.each([true, false, 'Y', 'N'] as const)('handles creation flag %s for every ID', (flag) => {
    const application = detail(flag)
    application.plants[0].is_new_plant = flag
    render(<Overview application={application} />)
    const created = flag === true || flag === 'Y'
    for (const label of ['Company ID', 'Plant ID', 'Owns ID']) {
      expect(row(label).getByTitle(created ? 'Created' : 'Modified').textContent).toBe(created ? 'C' : 'M')
    }
  })

  it('omits markers for absent flags and retains legacy ownership fallbacks', () => {
    const application = detail()
    delete application.company[0].is_new
    delete application.plants[0].is_new_plant
    delete application.plants[0].is_new_owns
    delete application.plants[0].ownsId
    delete application.plants[0].status
    render(<Overview application={application} />)
    expect(screen.queryByTitle('Created')).toBeNull()
    expect(screen.queryByTitle('Modified')).toBeNull()
    expect(row('Owns ID').getByText('999')).toBeTruthy()
    expect(row('OwnsStatus').getByText('Old status')).toBeTruthy()
  })

  it('preserves Intake IDs, ownership status, and Matched marker wording', () => {
    const application = detail()
    application.globalData = {
      company_id: 10, is_new_company: false,
      plants: [{ plant_id: 20, owns_id: 30, owns_status: 'Active', is_new_plant: true, is_new_owns: false }],
    }
    render(<Overview application={application} dataSource="prelim" />)
    expect(row('Company ID').getByText('10')).toBeTruthy()
    expect(row('Company ID').getByTitle('Matched').textContent).toBe('M')
    expect(row('Plant ID').getByText('20')).toBeTruthy()
    expect(row('Plant ID').getByTitle('Created').textContent).toBe('C')
    expect(row('Owns ID').getByText('30')).toBeTruthy()
    expect(row('Owns ID').getByTitle('Matched').textContent).toBe('M')
    expect(row('Owns Status').getByText('Active')).toBeTruthy()
  })
})
