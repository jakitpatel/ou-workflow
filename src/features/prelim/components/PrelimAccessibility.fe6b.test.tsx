import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { ApplicationDetail } from '@/types/application'
import PlantsSection from '@/features/applications/components/application-management/PlantsSection'
import { CancelApplicationDialog } from '@/features/applications/components/CancelApplicationDialog'
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ username: 'viewer', role: 'readonly' }) }))
vi.mock('@tanstack/react-router', async (importOriginal) => ({ ...(await importOriginal<typeof import('@tanstack/react-router')>()), useNavigate: () => vi.fn() }))
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({ useFetchTaskRoles: () => ({ data: [] }) }))
import { ComparisonRow } from './PrelimResolutionComparisonRow'
it('labels submitted value editors', () => {
  render(<ComparisonRow field="Company Name" appValue="FIX-fe6b" dbValue="" status="empty" editable onAppValueChange={vi.fn()} />)
  expect(screen.getByRole('textbox', { name: 'Company Name' })).toBeTruthy()
})
it('labels all rendered Plants inputs and the process description', () => {
  render(<PlantsSection application={{ plants: [{ id: 1, name: 'FIX-fe6b', manufacturing: {}, otherProducts: true, otherPlantsProducing: true }] } as ApplicationDetail} editMode={false} />)
  const inputs = screen.getAllByRole('textbox')
  expect(inputs.length).toBe(14)
  expect(inputs.every((input) => Boolean(input.getAttribute('aria-label')))).toBe(true)
})
it('names Undo Withdraw for its actual action', () => {
  render(<CancelApplicationDialog companyName="FIX-fe6b" reason="" saving={false} actionType="undo_withdraw" onReasonChange={vi.fn()} onClose={vi.fn()} onConfirm={vi.fn()} />)
  expect(screen.getByRole('dialog', { name: 'Undo Withdraw Application' })).toBeTruthy()
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
})

it('names the intake card plant expansion control', async () => {
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
  const { PrelimResolvedSection } = await import('./PrelimResolvedSection')
  render(<QueryClientProvider client={new QueryClient()}><PrelimResolvedSection application={{
    applicationId: 2106, company: 'FIX-fe6b', status: 'NEW', assignedRoles: [],
    stages: { Intake: { tasks: [{ name: 'ResolveCompany', status: 'pending', companyFromApplication: { companyName: 'FIX-fe6b' } }] } },
  } as unknown as import('@/types/application').Applicant} /></QueryClientProvider>)
  const collapse = screen.getByRole('button', { name: 'Collapse intake plants' })
  expect(collapse.getAttribute('aria-expanded')).toBe('true')
  fireEvent.click(collapse)
  expect(screen.getByRole('button', { name: 'Expand intake plants' }).getAttribute('aria-expanded')).toBe('false')
})
