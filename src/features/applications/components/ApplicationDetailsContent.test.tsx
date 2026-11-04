import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ApplicationDetailsContent } from './ApplicationDetailsContent'
import type { ApplicationDetail } from '@/types/application'
import { mapPrelimApplicationDetailToApplicationDetail } from '@/features/prelim/lib/prelimApplicationDetailAdapter'

vi.mock('@/features/tasks/notes/useTaskNotesDrawerState', () => ({
  useTaskNotesDrawerState: () => ({ drawer: null, openDrawer: vi.fn() }),
}))
vi.mock('./application-management/Overview', () => ({ default: () => <div>Overview content</div> }))
vi.mock('./ApplicationEirPanel', () => ({ ApplicationEirPanel: () => <div>Application EIR panel</div> }))
vi.mock('./ScheduleAIngredientsDrawer', () => ({
  ScheduleAIngredientsDrawer: ({ applicationId, readOnly }: { applicationId: number; readOnly: boolean }) => (
    <div>Schedule A application {applicationId} {readOnly ? 'read-only' : 'editable'}</div>
  ),
}))
vi.mock('./ScheduleBProductsDrawer', () => ({
  ScheduleBProductsDrawer: ({ applicationId, readOnly }: { applicationId: number; readOnly: boolean }) => (
    <div>Schedule B application {applicationId} {readOnly ? 'read-only' : 'editable'}</div>
  ),
}))

const application = {
  applicationId: '421', status: 'Pending', company: [{ name: 'RFR Company' }],
  contacts: [], plants: [], products: [], raw_data: [],
} as ApplicationDetail

describe('RFR application details', () => {
  it('shows exactly the allowed sections and opens company details first', () => {
    renderWithProviders(<ApplicationDetailsContent application={application} rfrView />)
    expect(screen.getByText('RFR Preprocessing Interface')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Company Information' })).toBeTruthy()
    expect(screen.getAllByRole('tab').map((button) => button.textContent)).toEqual([
      'Company Details', 'Company Contacts', 'Plants', 'Schedule A', 'Schedule B', 'Raw Application',
    ])
    fireEvent.click(screen.getByRole('tab', { name: 'Schedule A' }))
    expect(screen.getByText('Schedule A application 421 read-only')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Schedule B' }))
    expect(screen.getByText('Schedule B application 421 read-only')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Raw Application' }))
    expect(screen.queryByText('Schedule B application 421 read-only')).toBeNull()
  })

  it('preserves staff sections and hides a previously selected staff section when switching to RFR view', () => {
    const view = renderWithProviders(<ApplicationDetailsContent application={application} />)
    expect(screen.getByText('NCRC Preprocessing Interface')).toBeTruthy()
    expect(screen.getByText('Overview content')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Inspection Invoice' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Contract' })).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'EIR' }))
    expect(screen.getByText('Application EIR panel')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Schedule A' }))
    expect(screen.getByText('Schedule A application 421 read-only')).toBeTruthy()
    view.rerender(<ApplicationDetailsContent application={application} rfrView />)
    expect(screen.queryByText('Overview content')).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Inspection Invoice' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Company Information' })).toBeTruthy()
  })
})

describe('intake plant navigation', () => {
  const intake = mapPrelimApplicationDetailToApplicationDetail({
    applicationId: 3719,
    companyName: 'Multi Plant Company',
    plants: [
      { PlantId: 10, plantNumber: 1, plantName: 'Same Name', plantAddress: 'First Street', products: [{ productName: 'First Product' }], ingredients: [{ ingredientLabelName: 'First Ingredient' }] },
      { PlantId: 20, plantNumber: 2, plantName: 'Same Name', plantAddress: 'Second Street', products: [{ productName: 'Second Product' }], ingredients: [{ ingredientLabelName: 'Second Ingredient' }] },
      { PlantId: 30, plantNumber: 3, plantName: 'Empty Plant', products: [], ingredients: [] },
    ],
  })

  it('shows only the selected plant products, ingredients and details, even with duplicate names', () => {
    renderWithProviders(<ApplicationDetailsContent application={intake} dataSource="prelim" mode="drawer" />)
    const productButtons = screen.getAllByRole('tab', { name: /Products/ })
    fireEvent.click(productButtons[0])
    expect(screen.getByText('First Product')).toBeTruthy()
    expect(screen.queryByText('Second Product')).toBeNull()
    fireEvent.click(productButtons[1])
    expect(screen.getByText('Second Product')).toBeTruthy()
    expect(screen.queryByText('First Product')).toBeNull()
    fireEvent.click(screen.getAllByRole('tab', { name: /Ingredients/ })[1])
    expect(screen.getByText('Second Ingredient')).toBeTruthy()
    expect(screen.queryByText('First Ingredient')).toBeNull()
    fireEvent.click(screen.getAllByRole('tab', { name: 'Details' })[1])
    expect(screen.getByDisplayValue('Second Street')).toBeTruthy()
    expect(screen.queryByDisplayValue('First Street')).toBeNull()
    fireEvent.click(productButtons[2])
    expect(screen.queryByText('First Product')).toBeNull()
    expect(screen.queryByText('Second Product')).toBeNull()
    expect(screen.getByRole('tab', { name: 'Products 0' }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Empty Plant' }))
    expect(screen.queryByRole('tab', { name: 'Products 0' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Expand Empty Plant' }))
    expect(screen.getByRole('tab', { name: 'Products 0' })).toBeTruthy()
  })

  it('handles submissions without plants', () => {
    renderWithProviders(<ApplicationDetailsContent application={application} dataSource="prelim" />)
    expect(screen.getByText('No plants submitted')).toBeTruthy()
    expect(screen.queryByRole('tab', { name: /Products/ })).toBeNull()
  })
})

it('provides tablist, selected tab, linked panel and arrow/Home/End keyboard navigation (NEW-10)', () => {
  renderWithProviders(<ApplicationDetailsContent application={application} />)
  const list = screen.getByRole('tablist', { name: 'Application details' })
  const tabs = screen.getAllByRole('tab')
  expect(list.contains(tabs[0])).toBe(true)
  const selected = screen.getByRole('tab', { selected: true })
  selected.focus()
  fireEvent.keyDown(selected, { key: 'ArrowDown' })
  expect(document.activeElement).toBe(tabs[1])
  expect(tabs[1].getAttribute('aria-selected')).toBe('true')
  expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(tabs[1].id)
  expect(tabs[1].getAttribute('aria-controls')).toBe(screen.getByRole('tabpanel').id)
  fireEvent.keyDown(tabs[1], { key: 'End' })
  expect(document.activeElement).toBe(tabs.at(-1))
  fireEvent.keyDown(tabs.at(-1)!, { key: 'Home' })
  expect(document.activeElement).toBe(tabs[0])
})

it('gives the email preview its real subject (NEW-10)', () => {
  renderWithProviders(<ApplicationDetailsContent application={{ ...application, emails: [{ MessageID: 5, Subject: 'FIX-fe6b subject', MessageText: 'Local preview' }] }} />)
  fireEvent.click(screen.getByRole('tab', { name: 'Emails' }))
  fireEvent.click(screen.getByRole('button', { name: /preview|view/i }))
  expect(screen.getByRole('dialog', { name: 'Email preview: FIX-fe6b subject' })).toBeTruthy()
})

it('does not show BCC recipients in the email preview', () => {
  renderWithProviders(
    <ApplicationDetailsContent
      application={{
        ...application,
        emails: [{
          MessageID: 6,
          Subject: 'Contract package',
          MessageText: 'Please review the contract.',
          FromUser: 'ncrc@ou.org',
          ToUser: 'client@example.com',
          CCUser: 'rc@ou.org',
          BCCUser: 'hidden.copy@ou.org',
        }],
      }}
    />,
  )
  fireEvent.click(screen.getByRole('tab', { name: 'Emails' }))
  fireEvent.click(screen.getByRole('button', { name: /preview|view/i }))
  const preview = screen.getByRole('dialog', { name: 'Email preview: Contract package' })
  expect(preview.textContent).toContain('client@example.com')
  expect(preview.textContent).toContain('rc@ou.org')
  expect(preview.textContent).toContain('Please review the contract.')
  expect(preview.textContent).not.toMatch(/BCC/i)
  expect(preview.textContent).not.toContain('hidden.copy@ou.org')
})
