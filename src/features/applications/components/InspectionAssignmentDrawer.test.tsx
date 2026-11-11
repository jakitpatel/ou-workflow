import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { Applicant, Task } from '@/types/application'
import { InspectionAssignmentDrawer } from './InspectionAssignmentDrawer'

const mocks = vi.hoisted(() => ({
  assign: vi.fn().mockResolvedValue({ visitId: '789' }),
  message: vi.fn().mockResolvedValue({}),
  display: vi.fn().mockResolvedValue({}),
  result: vi.fn(),
  upload: vi.fn(),
  toastError: vi.fn(),
  rfrs: [{ id: 'rfr1', userName: 'rfr1', name: 'Test RFR', fullName: 'Rabbi Test Full Name', email: 'rfr@example.com' }],
}))
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ email: 'sender@example.com', username: 'sender', token: 'token' }) }))
vi.mock('@/features/applications/hooks/useApplicationDetail', () => ({
  useApplicationDetail: () => ({
    data: {
      plantAddresses: [{ street: '101 Plant Street', type: 'Physical' }],
      plantContacts: {
        primaryContact: [{ name: 'Plant Contact', role: 'Plant Manager', email: 'plant@example.com', phone: '555-0100' }],
      },
      companyContacts: {
        primaryContact: [{ name: 'Company Contact', email: 'company@example.com' }],
      },
    },
  }),
}))
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({ useUserListByRole: () => ({ data: mocks.rfrs }) }))
vi.mock('@/features/tasks/hooks/useTaskMutations', () => ({ useAssignTaskMutation: () => ({ mutateAsync: mocks.assign }) }))
vi.mock('@/features/applications/api', () => ({ createApplicationMessage: mocks.message, uploadApplicationFile: mocks.upload }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: mocks.toastError } }))
vi.mock('@/features/tasks/api', () => ({ patchTaskGuiDisplayResult: mocks.display, patchTaskResult: mocks.result }))
vi.mock('@/features/applications/cache/applicationListCache', () => ({ refreshApplicationInListCaches: vi.fn().mockResolvedValue(true) }))

afterEach(() => {
  vi.unstubAllEnvs()
  mocks.message.mockClear()
  mocks.upload.mockReset()
  mocks.toastError.mockClear()
})

it('creates and notifies without a Visit Date task or status-details save', async () => {
  vi.stubEnv('VITE_OUDIRECT_BASE_URL', 'https://oudirect-st.ou.org')
  const task = { TaskInstanceId: 123, name: 'Assign RFR' } as Task
  const applicant = { applicationId: 1, company: 'Test company', stages: {} } as Applicant
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InspectionAssignmentDrawer open applicant={applicant} task={task} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: /Rabbi Test Full Name/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Create Assignment & Notify' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Resend Notification' })).toBeTruthy())
  expect(mocks.assign).toHaveBeenCalledWith(expect.objectContaining({ taskId: '123', assignee: 'rfr1' }))
  expect(mocks.message).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ TaskInstanceId: '123', ToUser: 'rfr@example.com', Attachments: null }) }))
  expect(mocks.message).toHaveBeenCalledWith(expect.objectContaining({
    payload: expect.objectContaining({
      MessageTextPlain: expect.stringContaining(
        'Address: 101 Plant Street\nPrimary Contact: Plant Contact\nRole: Plant Manager\nEmail: plant@example.com\nPhone: 555-0100\n\nCompany: Test company\nPrimary Contact: Company Contact\nEmail: company@example.com',
      ),
    }),
  }))
  expect(mocks.display).toHaveBeenCalledWith(expect.objectContaining({ taskId: '123', result: expect.stringContaining('Visit #789') }))
  expect(mocks.display).toHaveBeenCalledWith(expect.objectContaining({
    taskId: '123', result: expect.stringContaining('{RFR:Rabbi Test Full Name,'),
  }))
  expect(mocks.message).toHaveBeenCalledWith(expect.objectContaining({
    payload: expect.objectContaining({
      MessageTextPlain: expect.stringContaining('Actual EIR/inspection: https://oudirect-st.ou.org/oudirect/inspections/RfrVisitInspectionForm?type=Inspection&mode=new&subtype=short&visitID=789'),
    }),
  }))
  expect(mocks.message).toHaveBeenCalledWith(expect.objectContaining({
    payload: expect.objectContaining({
      MessageTextPlain: expect.stringContaining('Planned visit date: https://oudirect-st.ou.org/oudirect/PlantVisitDetails/789'),
    }),
  }))
  expect(mocks.result).not.toHaveBeenCalled()
})

it('full email view lists From, To, Cc and Subject left-aligned', () => {
  vi.stubEnv('VITE_OUDIRECT_BASE_URL', 'https://oudirect-st.ou.org')
  const task = { TaskInstanceId: 123, name: 'Assign RFR' } as Task
  const applicant = { applicationId: 1, company: 'Test company', plant: 'Test plant', stages: {} } as Applicant
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InspectionAssignmentDrawer open applicant={applicant} task={task} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: /Rabbi Test Full Name/ }))
  fireEvent.click(screen.getByRole('button', { name: /View full/ }))
  const fullView = screen.getByText('Notification email to RFR').closest('[role="dialog"]') as HTMLElement
  for (const label of ['From', 'To', 'Subject']) {
    const row = Array.from(fullView.querySelectorAll('span')).find((span) => span.textContent === label)?.parentElement
    expect(row, label).toBeTruthy()
    expect(row!.className, label).not.toContain('justify-between')
    expect(row!.lastElementChild!.className, label).toContain('text-left')
    expect(row!.lastElementChild!.className, label).not.toContain('text-right')
  }
  expect(fullView.textContent).toContain('OU Kosher - Inspection Assignment for Test plant')
})

const renderDrawer = () => {
  vi.stubEnv('VITE_OUDIRECT_BASE_URL', 'https://oudirect-st.ou.org')
  const task = { TaskInstanceId: 123, name: 'Assign RFR' } as Task
  const applicant = { applicationId: 1, company: 'Test company', plant: 'Test plant', stages: {} } as Applicant
  const ui = (isOpen: boolean) => (
    <QueryClientProvider client={new QueryClient()}>
      <InspectionAssignmentDrawer open={isOpen} applicant={applicant} task={task} onClose={vi.fn()} />
    </QueryClientProvider>
  )
  const view = render(ui(true))
  return { rerender: (isOpen: boolean) => view.rerender(ui(isOpen)) }
}

const fileOf = (name: string, size = 1000, type = 'application/pdf') => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const addFiles = (...files: File[]) =>
  fireEvent.change(screen.getByLabelText('Add email attachments'), { target: { files } })

const createButton = () => screen.getByRole('button', { name: 'Create Assignment & Notify' }) as HTMLButtonElement

it('uploads attachments and sends them with the assignment email', async () => {
  mocks.upload
    .mockResolvedValueOnce({ message: 'ok', file_path: 's3://bucket/app1/scope.pdf', link: 'https://files/scope.pdf' })
    .mockResolvedValueOnce({ data: { attributes: { FileName: 'map.png', FilePath: '/file/77' } } })
  renderDrawer()
  fireEvent.click(screen.getByRole('button', { name: /Rabbi Test Full Name/ }))
  addFiles(fileOf('scope.pdf'), fileOf('map.png', 2000, 'image/png'))

  const list = await screen.findByRole('list', { name: 'Email attachments' })
  expect(list.textContent).toContain('scope.pdf')
  expect(list.textContent).toContain('map.png')
  expect(mocks.upload).toHaveBeenCalledTimes(2)
  expect(mocks.upload).toHaveBeenCalledWith(expect.objectContaining({
    applicationId: '1', taskInstanceID: '123', description: 'Inspection assignment email attachment', token: 'token',
  }))

  fireEvent.click(screen.getByRole('button', { name: /View full/ }))
  const fullView = screen.getByText('Notification email to RFR').closest('[role="dialog"]') as HTMLElement
  expect(fullView.textContent).toContain('scope.pdf, map.png')
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))

  fireEvent.click(createButton())
  await waitFor(() => expect(screen.getByRole('button', { name: 'Resend Notification' })).toBeTruthy())
  expect(mocks.message).toHaveBeenCalledWith(expect.objectContaining({
    payload: expect.objectContaining({ Attachments: 'scope.pdf<s3://bucket/app1/scope.pdf>, map.png</file/77>' }),
  }))
  // Sent: the attachments stay visible but can no longer be changed.
  expect(screen.getByRole('list', { name: 'Email attachments' }).textContent).toContain('scope.pdf')
  expect(screen.queryByRole('button', { name: 'Remove scope.pdf' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Add files' })).toBeNull()
})

it('does not send a removed attachment', async () => {
  mocks.upload.mockResolvedValue({ file_path: '/file/1' })
  renderDrawer()
  fireEvent.click(screen.getByRole('button', { name: /Rabbi Test Full Name/ }))
  addFiles(fileOf('remove-me.pdf'))
  fireEvent.click(await screen.findByRole('button', { name: 'Remove remove-me.pdf' }))
  expect(screen.queryByRole('list', { name: 'Email attachments' })).toBeNull()
  fireEvent.click(createButton())
  await waitFor(() => expect(mocks.message).toHaveBeenCalled())
  expect(mocks.message).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ Attachments: null }) }))
})

it('reports an upload without a file reference and attaches nothing', async () => {
  mocks.upload.mockResolvedValue({ message: 'stored' })
  renderDrawer()
  fireEvent.click(screen.getByRole('button', { name: /Rabbi Test Full Name/ }))
  addFiles(fileOf('broken.pdf'))
  await waitFor(() =>
    expect(mocks.toastError).toHaveBeenCalledWith('Upload completed but no file URL was returned for broken.pdf.'),
  )
  expect(screen.queryByRole('list', { name: 'Email attachments' })).toBeNull()
})

it('rejects files over the total email size limit without uploading', async () => {
  renderDrawer()
  fireEvent.click(screen.getByRole('button', { name: /Rabbi Test Full Name/ }))
  addFiles(fileOf('huge.pdf', 26 * 1024 * 1024))
  await waitFor(() =>
    expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining('The maximum allowed size is 25 MB.')),
  )
  expect(mocks.upload).not.toHaveBeenCalled()
})

it('blocks sending while an attachment is still uploading', async () => {
  let finish: (value: unknown) => void = () => {}
  mocks.upload.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
  renderDrawer()
  fireEvent.click(screen.getByRole('button', { name: /Rabbi Test Full Name/ }))
  addFiles(fileOf('slow.pdf'))
  expect(await screen.findByRole('button', { name: 'Uploading...' })).toBeTruthy()
  expect(createButton().disabled).toBe(true)
  finish({ file_path: '/file/9' })
  await waitFor(() => expect(createButton().disabled).toBe(false))
  expect(screen.getByRole('list', { name: 'Email attachments' }).textContent).toContain('slow.pdf')
})

it('starts without attachments when the drawer is reopened', async () => {
  mocks.upload.mockResolvedValue({ file_path: '/file/5' })
  const { rerender } = renderDrawer()
  fireEvent.click(screen.getByRole('button', { name: /Rabbi Test Full Name/ }))
  addFiles(fileOf('old.pdf'))
  expect(await screen.findByRole('list', { name: 'Email attachments' })).toBeTruthy()
  rerender(false)
  rerender(true)
  expect(screen.queryByRole('list', { name: 'Email attachments' })).toBeNull()
})
