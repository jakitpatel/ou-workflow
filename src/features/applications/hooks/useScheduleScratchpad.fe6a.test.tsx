import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getApplicationIngredientRowId,
  getLegacyApplicationIngredientRowId,
  useScheduleAScratchpad,
} from './useScheduleAIngredients'
import {
  getApplicationProductRowId,
  getLegacyApplicationProductRowId,
  useScheduleBScratchpad,
} from './useScheduleBProducts'
import { migrateLegacyRowKeys } from '@/features/applications/utils/scratchpadSave'

// fe6a NEW-2 (marks keyed by stable row ids, old keys migrated), NEW-3 (unsaved marks survive
// closing the drawer) and NEW-8 (Schedule B "Label #").
const mocks = vi.hoisted(() => ({
  fetchTaskInstance: vi.fn(),
  patchTaskStatusDetails: vi.fn(),
}))

vi.mock('@/context/UserContext', () => ({
  useUser: () => ({ token: 'token', username: 'iar.one' }),
}))
vi.mock('@/features/tasks/api', () => ({
  fetchTaskInstance: mocks.fetchTaskInstance,
  patchTaskStatusDetails: mocks.patchTaskStatusDetails,
}))
vi.mock('@/features/applications/cache/applicationListCache', () => ({
  refreshApplicationInListCaches: vi.fn(async () => {}),
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
describe('NEW-2: row ids do not change when a row is edited', () => {
  it('Schedule B: same id after renaming / changing the UPC; old id kept for migration', () => {
    const before = { ApplicationID: 1356, ScheduleProductId: 188, productName: 'Bread', UPC: '123' }
    const after = { ...before, productName: 'Bread renamed', UPC: '456' }
    expect(getApplicationProductRowId(after, 0)).toBe('application-1356-188')
    expect(getApplicationProductRowId(before, 3)).toBe('application-1356-188')
    expect(getLegacyApplicationProductRowId(before, 0)).toBe('application-1356-188-123')
  })

  it('Schedule A: same id after changing the RMC / name', () => {
    const before = { ApplicationID: 1356, IngredientId: 200, rawMaterialCode: 'VF-1', ingredientLabelName: 'Sugar' }
    const after = { ...before, rawMaterialCode: 'VF-1b', ingredientLabelName: 'Cane sugar' }
    expect(getApplicationIngredientRowId(after as never, 0)).toBe('application-1356-200')
    expect(getApplicationIngredientRowId(before as never, 0)).toBe(getApplicationIngredientRowId(after as never, 0))
    expect(getLegacyApplicationIngredientRowId(before as never, 0)).toBe('application-1356-200-VF-1')
  })

  it('rows without a database id keep a positional id that cannot collide with a migrated one', () => {
    expect(getApplicationProductRowId({ ApplicationID: 1, productName: 'New' }, 4)).toBe('application-1-row4-New')
    const marks = { flags: { 'application-1-row4-New': true }, halacha: {}, resolved: {}, attachments: {}, rounds: [] }
    expect(migrateLegacyRowKeys(marks)).toBe(marks)
  })
})

describe('migrateLegacyRowKeys', () => {
  const base = { flags: {}, halacha: {}, resolved: {}, attachments: {}, rounds: [] }

  it('moves every kind of mark from the old key to the stable key', () => {
    const migrated = migrateLegacyRowKeys({
      ...base,
      flags: { 'application-1356-188-Bread "rye"': { flagged: true, note: 'n' }, 'kash-9-X': { flagged: true, note: '' } },
      halacha: { 'application-1356-188-Bread "rye"': { open: true, note: 'send "LOC"' } },
      resolved: { 'application-1356-200-VF-1': true },
      attachments: { 'application-1356-188-Bread "rye"': 'file.pdf' },
      rounds: [{ items: [{ ingId: 'application-1356-188-Bread "rye"' }, { ingId: 'kash-9-X' }] }],
    })
    expect(migrated.flags).toEqual({ 'application-1356-188': { flagged: true, note: 'n' }, 'kash-9-X': { flagged: true, note: '' } })
    expect(migrated.halacha).toEqual({ 'application-1356-188': { open: true, note: 'send "LOC"' } })
    expect(migrated.resolved).toEqual({ 'application-1356-200': true })
    expect(migrated.attachments).toEqual({ 'application-1356-188': 'file.pdf' })
    expect(migrated.rounds[0].items.map((item) => item.ingId)).toEqual(['application-1356-188', 'kash-9-X'])
  })

  it('ambiguous old keys: the row\'s current data decides; with no hint they are left alone', () => {
    const marks = {
      ...base,
      flags: { 'application-7-5-Old name': { flagged: true, note: 'old' }, 'application-7-5-New name': { flagged: false, note: 'new' } },
    }
    expect(migrateLegacyRowKeys(marks).flags).toBe(marks.flags)
    const migrated = migrateLegacyRowKeys(marks, { 'application-7-5': 'application-7-5-New name' })
    expect(migrated.flags).toEqual({
      'application-7-5': { flagged: false, note: 'new' },
      'application-7-5-Old name': { flagged: true, note: 'old' },
    })
  })

  it('never overwrites marks already under the stable key, and returns the same object when nothing moves', () => {
    const marks = {
      ...base,
      flags: { 'application-7-5': { flagged: true, note: 'current' }, 'application-7-5-Old': { flagged: false, note: 'old' } },
    }
    expect(migrateLegacyRowKeys(marks).flags['application-7-5']).toEqual({ flagged: true, note: 'current' })
    expect(migrateLegacyRowKeys(marks)).toBe(marks)
  })
})

describe('useScheduleAScratchpad (task-owned marks)', () => {
  const savedA = (savedState: object) => JSON.stringify({ savedState: { username: 'someone', rounds: [], ...savedState } })
  const lastPatchedState = () =>
    (mocks.patchTaskStatusDetails.mock.calls.at(-1)?.[0] as { statusDetails: { savedState: Record<string, unknown> } })
      .statusDetails.savedState

  beforeEach(() => {
    window.localStorage.clear()
    mocks.fetchTaskInstance.mockReset().mockResolvedValue({ data: { attributes: { StatusDetails: '{}' } } })
    mocks.patchTaskStatusDetails.mockReset().mockResolvedValue({})
  })

  it('NEW-2: shows server marks saved under old keys and re-saves them under the stable key on the next edit', async () => {
    const server = savedA({ attachments: { 'application-15-188-Bread': 'old.pdf' } })
    const { result } = renderHook(() => useScheduleAScratchpad(15, 569, server), { wrapper })
    await waitFor(() => expect(result.current.scratchpad.attachments['application-15-188']).toBe('old.pdf'))
    await wait(900)
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled() // migrating alone never writes (w6b)

    act(() => result.current.markEirReceived())
    await waitFor(() => expect(mocks.patchTaskStatusDetails).toHaveBeenCalledTimes(1), { timeout: 2000 })
    expect(lastPatchedState().attachments).toEqual({ 'application-15-188': 'old.pdf' })
    expect(lastPatchedState()).not.toHaveProperty('flags')
  })

  it('NEW-2: legacyRowKeys picks the current row when a row was renamed before (two old keys)', async () => {
    const server = savedA({
      attachments: { 'application-15-188-Old': 'stale.pdf', 'application-15-188-Current': 'visible.pdf' },
    })
    const legacyRowKeys = { 'application-15-188': 'application-15-188-Current' }
    const { result } = renderHook(() => useScheduleAScratchpad(15, 569, server, { legacyRowKeys }), { wrapper })
    await waitFor(() => expect(result.current.scratchpad.attachments['application-15-188']).toBe('visible.pdf'))
  })

  it('an edit that was not saved is not restored from the browser on reopen', async () => {
    const server = savedA({ eirNeedsEntry: true })
    mocks.patchTaskStatusDetails.mockRejectedValue(Object.assign(new Error('Injected 500'), { status: 500 }))
    const first = renderHook(() => useScheduleAScratchpad(15, 569, server), { wrapper })
    await waitFor(() => expect(first.result.current.scratchpad.eirNeedsEntry).toBe(true))
    act(() => first.result.current.markEirReceived())
    await waitFor(() => expect(first.result.current.saveFailed).toBe(true), { timeout: 2000 })
    // The close prompt still warns while the edit is unsaved.
    expect(first.result.current.hasUnsavedChanges()).toBe(true)
    first.unmount()

    mocks.patchTaskStatusDetails.mockReset().mockResolvedValue({})
    const second = renderHook(() => useScheduleAScratchpad(15, 569, server), { wrapper })
    await waitFor(() => expect(second.result.current.scratchpad.eirNeedsEntry).toBe(true))
    expect(second.result.current.scratchpad.eirReceived).toBe(false)
    await wait(900)
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()
    expect(window.localStorage.length).toBe(0)
  })
})

describe('useScheduleBScratchpad (task-owned marks)', () => {
  const savedA = (savedState: object) => JSON.stringify({ savedState: { username: 'someone', rounds: [], ...savedState } })
  const lastPatchedState = () =>
    (mocks.patchTaskStatusDetails.mock.calls.at(-1)?.[0] as { statusDetails: { savedState: Record<string, unknown> } })
      .statusDetails.savedState

  beforeEach(() => {
    window.localStorage.clear()
    mocks.fetchTaskInstance.mockReset().mockResolvedValue({ data: { attributes: { StatusDetails: '{}' } } })
    mocks.patchTaskStatusDetails.mockReset().mockResolvedValue({})
  })

  it('NEW-2: shows server marks saved under old keys and re-saves them under the stable key on the next edit', async () => {
    const server = savedA({ attachments: { 'application-15-188-Bread': 'old.pdf' } })
    const { result } = renderHook(() => useScheduleBScratchpad(15, 569, server), { wrapper })
    await waitFor(() => expect(result.current.scratchpad.attachments['application-15-188']).toBe('old.pdf'))
    await wait(900)
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled() // migrating alone never writes (w6b)

    act(() => result.current.markEirReceived())
    await waitFor(() => expect(mocks.patchTaskStatusDetails).toHaveBeenCalledTimes(1), { timeout: 2000 })
    expect(lastPatchedState().attachments).toEqual({ 'application-15-188': 'old.pdf' })
    expect(lastPatchedState()).not.toHaveProperty('flags')
  })

  it('NEW-2: legacyRowKeys picks the current row when a row was renamed before (two old keys)', async () => {
    const server = savedA({
      attachments: { 'application-15-188-Old': 'stale.pdf', 'application-15-188-Current': 'visible.pdf' },
    })
    const legacyRowKeys = { 'application-15-188': 'application-15-188-Current' }
    const { result } = renderHook(() => useScheduleBScratchpad(15, 569, server, { legacyRowKeys }), { wrapper })
    await waitFor(() => expect(result.current.scratchpad.attachments['application-15-188']).toBe('visible.pdf'))
  })

  it('an edit that was not saved is not restored from the browser on reopen', async () => {
    const server = savedA({ eirNeedsEntry: true })
    mocks.patchTaskStatusDetails.mockRejectedValue(Object.assign(new Error('Injected 500'), { status: 500 }))
    const first = renderHook(() => useScheduleBScratchpad(15, 569, server), { wrapper })
    await waitFor(() => expect(first.result.current.scratchpad.eirNeedsEntry).toBe(true))
    act(() => first.result.current.markEirReceived())
    await waitFor(() => expect(first.result.current.saveFailed).toBe(true), { timeout: 2000 })
    // The close prompt still warns while the edit is unsaved.
    expect(first.result.current.hasUnsavedChanges()).toBe(true)
    first.unmount()

    mocks.patchTaskStatusDetails.mockReset().mockResolvedValue({})
    const second = renderHook(() => useScheduleBScratchpad(15, 569, server), { wrapper })
    await waitFor(() => expect(second.result.current.scratchpad.eirNeedsEntry).toBe(true))
    expect(second.result.current.scratchpad.eirReceived).toBe(false)
    await wait(900)
    expect(mocks.patchTaskStatusDetails).not.toHaveBeenCalled()
    expect(window.localStorage.length).toBe(0)
  })
})
