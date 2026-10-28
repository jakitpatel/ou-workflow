import { expect, it } from 'vitest'
import { removeContractPackageFooter } from './contractCoverLetter'

it('removes the generated footer from saved cover letters', () => {
  expect(
    removeContractPackageFooter(
      'Dear Customer,\n\nSincerely, RC\n\nCertification package:\n/file/1308',
    ),
  ).toBe('Dear Customer,\n\nSincerely, RC')
})
it('preserves a cover letter without the generated footer', () => {
  expect(removeContractPackageFooter('Review the attached certification package.')).toBe(
    'Review the attached certification package.',
  )
})
