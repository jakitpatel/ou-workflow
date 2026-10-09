import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { scheduleVisit } from '@/features/tasks/api/scheduleVisit'
import type { Applicant, Task } from '@/types/application'

import { ExternalVisitWaitDialog } from './ExternalVisitWaitDialog'

const { invalidateQueries } = vi.hoisted(() => ({ invalidateQueries: vi.fn() }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries }) }))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'test-token' }) }))
vi.mock('@/features/tasks/api/scheduleVisit', () => ({ scheduleVisit: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('MODE', 'development')
  vi.mocked(scheduleVisit).mockResolvedValue({ success: true })
  invalidateQueries.mockResolvedValue(undefined)
})
afterEach(() => vi.unstubAllEnvs())

function setup(
  name = 'SCHEDULE VISIT',
  overrides: Partial<Task> = {},
  stage = 'inspection',
  peers: Task[] = [],
) {
  const task = {
    TaskInstanceId: 1,
    name,
    taskType: 'CONFIRM',
    taskCategory: 'EXTERNAL',
    StatusDetails:
      '{\'inputParam\': \'{RFR:KrelinC, visitId:"2970391", Daterange:"May 14 - Aug 12"}\'}',
    ...overrides,
  } as Task
  const applicant = {
    applicationId: 42,
    stages: { [stage]: { tasks: [task, ...peers] } },
  } as unknown as Applicant
  const onClose = vi.fn()
  render(
    <ExternalVisitWaitDialog task={task} stage={stage} applicant={applicant} onClose={onClose} />,
  )
  return onClose
}

describe('external inspection visit dates', () => {
  it.each(['development', 'staging'])('schedules a visit in %s', async (mode) => {
    vi.stubEnv('MODE', mode)
    const onClose = setup()
    expect(screen.queryByLabelText('Scheduled visit date')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    expect(screen.getByRole('button', { name: 'Schedule' }).hasAttribute('disabled')).toBe(true)
    fireEvent.change(screen.getByLabelText('Scheduled visit date'), {
      target: { value: '2026-10-15' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(scheduleVisit).toHaveBeenCalledWith({
      visitType: 'SCHEDULE',
      visitId: '2970391',
      visitDate: '2026-10-15',
      token: 'test-token',
    })
    expect(invalidateQueries).toHaveBeenCalledTimes(3)
  })

  it('records ACTUAL and accepts object-shaped assignment details', async () => {
    const onClose = setup('Actual Date', {
      StatusDetails: { inputParam: { visitId: '2970391' } } as unknown as string,
    })
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    fireEvent.change(screen.getByLabelText('Actual visit date'), {
      target: { value: '2026-10-08' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(scheduleVisit).toHaveBeenCalledWith(
      expect.objectContaining({ visitType: 'ACTUAL', visitDate: '2026-10-08', visitId: '2970391' }),
    )
  })

  it.each(['production', 'test', 'preview'])('keeps %s informational', (mode) => {
    vi.stubEnv('MODE', mode)
    setup()
    expect(screen.getByText('Waiting for external event')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Schedule' })).toBeNull()
    expect(scheduleVisit).not.toHaveBeenCalled()
  })

  it.each([
    ['Receive signed contract', 'inspection'],
    ['SCHEDULE VISIT', 'contract'],
  ])('does not offer scheduling for %s in %s', (name, stage) => {
    setup(name, {}, stage)
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull()
  })

  it('blocks submission when the visit ID is absent', () => {
    setup('Actual Date', { StatusDetails: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    fireEvent.change(screen.getByLabelText('Actual visit date'), {
      target: { value: '2026-10-08' },
    })
    expect(screen.getByRole('alert').textContent).toContain('Visit ID not found')
    expect(screen.getByRole('button', { name: 'Schedule' }).hasAttribute('disabled')).toBe(true)
    expect(scheduleVisit).not.toHaveBeenCalled()
  })

  it('uses the same Inspection stage schedule task when actual-date details omit the visit ID', () => {
    setup('Actual Date', { StatusDetails: undefined }, 'inspection', [
      {
        name: 'SCHEDULE VISIT',
        taskType: 'CONFIRM',
        taskCategory: 'EXTERNAL',
        StatusDetails: '{visitId:2970391}',
      } as Task,
    ])
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    expect(screen.getByText('Visit ID: 2970391')).toBeTruthy()
  })

  it('keeps the selected date on failure and permits retry', async () => {
    vi.mocked(scheduleVisit).mockRejectedValueOnce(new Error('Backend unavailable'))
    const onClose = setup()
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    const date = screen.getByLabelText('Scheduled visit date') as HTMLInputElement
    fireEvent.change(date, { target: { value: '2026-10-15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Backend unavailable'))
    expect(date.value).toBe('2026-10-15')
    expect(onClose).not.toHaveBeenCalled()
    expect(invalidateQueries).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('prevents duplicate requests and dismissal while saving', async () => {
    let finish!: (value: { success: boolean }) => void
    vi.mocked(scheduleVisit).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const onClose = setup()
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    fireEvent.change(screen.getByLabelText('Scheduled visit date'), {
      target: { value: '2026-10-15' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    fireEvent.click(screen.getByRole('button', { name: 'Scheduling...' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(scheduleVisit).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    finish({ success: true })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})
