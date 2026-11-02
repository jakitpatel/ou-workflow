import { describe, expect, it } from 'vitest'
import type { ApplicationTask } from '@/types/application'
import { getTaskRowDisplayName } from './TaskRow'

// Audit F16: the row label read "View details for  - 0 applications" when plantName was null.
describe('getTaskRowDisplayName', () => {
  const row = (fields: Partial<ApplicationTask>) => ({ applicationId: 7, ...fields }) as ApplicationTask

  it('prefers the plant, then the company, then the application id', () => {
    expect(getTaskRowDisplayName(row({ plantName: 'Plant A', companyName: 'Co' }))).toBe('Plant A')
    expect(getTaskRowDisplayName(row({ plantName: null as unknown as string, companyName: 'Co' }))).toBe('Co')
    expect(getTaskRowDisplayName(row({ plantName: '  ', companyName: null as unknown as string }))).toBe('Application 7')
  })
})
