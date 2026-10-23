import { describe, expect, it } from 'vitest'
import { normalizeTaskApplicationId } from './applicationIdFilter'

describe('task Application ID filter', () => {
  it.each([3719, '3719'])('accepts a positive whole-number ID %s', (value) => {
    expect(normalizeTaskApplicationId(value)).toBe(3719)
  })

  it.each([undefined, null, '', ' ', 'abc', 0, -1, 1.5, Infinity, true, [], Number.MAX_SAFE_INTEGER + 1])(
    'ignores invalid URL filter %s', (value) => {
      expect(normalizeTaskApplicationId(value)).toBeUndefined()
    },
  )
})
