import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseRcDetails, resolveContractCoordinators } from './contractCoordinators'

// Shapes copied from get_applications_v1 / get_application_detail_v2 for app 16 (local seed).
const listApp16 = {
  assignedRC: '',
  companyRC: 'rachel.levy',
  RCDetails: '[{"userid":4,"First":"Rachel","Last":"Levy","email":"rachel.levy"}]',
  assignedRoles: [
    { DISPATCH: 'sarah.gold', isPrimary: true },
    { NCRC: 'rachel.levy', isPrimary: true },
  ],
}
const rcDirectory = [
  { name: 'Local Admin', assigneeValue: 'local.admin', userName: 'local.admin', email: 'local.admin@local.test' },
  { name: 'Rachel Levy', assigneeValue: 'rachel.levy', userName: 'rachel.levy', email: 'rachel.levy@local.test' },
]

describe('resolveContractCoordinators (F3)', () => {
  it('uses the application RC/NCRC and the RC record email, not the signed-in user', () => {
    expect(resolveContractCoordinators({ applicant: listApp16, rcDirectory })).toEqual({
      rcName: 'rachel.levy',
      rcEmail: 'rachel.levy@local.test',
      ncrcName: 'rachel.levy',
    })
  })

  it('prefers the assigned RC (assignedRoles, then assignedRC) over the company RC', () => {
    expect(
      resolveContractCoordinators({ applicant: { ...listApp16, assignedRC: 'david.cohen' } }).rcName,
    ).toBe('david.cohen')
    expect(
      resolveContractCoordinators({
        applicant: listApp16,
        assignedRoles: [{ RC: 'tyler.band', isPrimary: true }],
      }).rcName,
    ).toBe('tyler.band')
  })

  it('reads the detail response assignedRC/assignedNCRC', () => {
    const detail = JSON.parse(
      readFileSync(
        '/Users/dobkins/Sites/ou-workflow/audit/2026-10-27/frontend/api-samples/detail_v2_app16.json',
        'utf8',
      ),
    ).appplicationinfo
    expect(resolveContractCoordinators({ applicationDetail: detail })).toMatchObject({
      rcName: 'rachel.levy',
      ncrcName: 'rachel.levy',
    })
  })

  it('uses an RCDetails email when it is a real address', () => {
    expect(
      resolveContractCoordinators({
        applicant: { companyRC: 'rachel.levy', RCDetails: [{ First: 'Rachel', Last: 'Levy', email: 'rlevy@ou.org', userName: 'rachel.levy' }] },
      }).rcEmail,
    ).toBe('rlevy@ou.org')
  })

  it('returns blanks rather than inventing a coordinator or email when none is assigned', () => {
    expect(
      resolveContractCoordinators({
        applicant: { assignedRC: '', companyRC: '', assignedRoles: [{ DISPATCH: 'sarah.gold', isPrimary: true }] },
        rcDirectory,
      }),
    ).toEqual({ rcName: '', rcEmail: '', ncrcName: '' })
  })

  it('leaves the RC email blank when the RC record has no address', () => {
    expect(resolveContractCoordinators({ applicant: listApp16 }).rcEmail).toBe('')
  })
})

describe('parseRcDetails', () => {
  it('parses the JSON string form and tolerates bad input', () => {
    expect(parseRcDetails(listApp16.RCDetails)).toEqual([
      { username: 'rachel.levy', fullName: 'Rachel Levy', email: '' },
    ])
    expect(parseRcDetails('not json')).toEqual([])
    expect(parseRcDetails(null)).toEqual([])
  })
})
