import { expect, it } from 'vitest'
import { createAppError } from './errors'
import { getErrorMessage } from './record'
import { apiErrorMessage } from './httpClient'

it('shows a human authorization refusal and retains the exact server reason', () => {
  const reason = "Grant Security Error on User: rachel.levy with roles: ['NCRC', 'RC'] does not have generic API ins (not authorized on application 1478) access on entity: WFApplicationMessage"
  const body = { errors: [{ detail: reason }] }
  const error = createAppError(apiErrorMessage(body)!, { status: 403, details: body })
  expect(getErrorMessage(error, 'Failed')).toBe('You do not have permission to add messages to application 1478. Ask the assigned coordinator or an administrator for access.')
  expect(error.details).toBe(body)
  expect(error.status).toBe(403)
})
it('normalizes a raw resolve network failure and preserves ordinary server validation', () => {
  expect(getErrorMessage(new TypeError('Failed to fetch'), 'Failed')).toBe('Network error. Please check your connection.')
  expect(getErrorMessage(createAppError('Please choose a contact'), 'Failed')).toBe('Please choose a contact')
})
