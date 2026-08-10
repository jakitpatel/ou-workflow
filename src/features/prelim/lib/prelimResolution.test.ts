import { describe, expect, it } from 'vitest'
import {
  findPrelimResolutionTask,
  toCompanyDrawerData,
  toPlantDrawerData,
} from './prelimResolution'
import type { Task } from '@/types/application'

const task = (name: string, overrides: Partial<Task> = {}) =>
  ({
    name,
    TaskInstanceId: 1,
    PreScript: '',
    status: 'pending',
    assignee: '',
    daysActive: 0,
    required: true,
    overdue: false,
    description: '',
    ...overrides,
  }) satisfies Task

describe('findPrelimResolutionTask', () => {
  it('selects the company resolver from the Intake task list', () => {
    const companyTask = task('ResolveCompany')

    expect(findPrelimResolutionTask([task('OtherTask'), companyTask], 'ResolveCompany')).toBe(
      companyTask,
    )
  })

  it('maps ResolvePlant1 to the first legacy ResolvePlant task', () => {
    const firstPlant = task('ResolvePlant')
    const secondPlant = task('ResolvePlant2')

    expect(findPrelimResolutionTask([firstPlant, secondPlant], 'ResolvePlant1')).toBe(firstPlant)
  })

  it('prefers an exact numbered plant resolver match', () => {
    const firstPlant = task('ResolvePlant')
    const secondPlant = task('ResolvePlant2')

    expect(findPrelimResolutionTask([firstPlant, secondPlant], 'ResolvePlant2')).toBe(secondPlant)
  })
})

describe('resolution drawer adapters', () => {
  it('maps submission company fields and grouped contacts', () => {
    const result = toCompanyDrawerData({
      companyName: 'Example Company',
      companyAddress: '',
      companyCity: '',
      companyCountry: '',
      Street1: '10 Main Street',
      City: 'Albany',
      State: 'NY',
      Zip: '12207',
      Country: 'USA',
      companyContacts: {
        primaryContact: [
          {
            contactFirst: 'Primary',
            contactLast: 'Person',
            contactEmail: 'primary@example.com',
          },
        ],
      },
    })

    expect(result).toMatchObject({
      companyName: 'Example Company',
      companyAddress: '10 Main Street',
      companyCity: 'Albany',
      companyState: 'NY',
      ZipPostalCode: '12207',
      companyCountry: 'USA',
      primaryContact: {
        name: 'Primary Person',
        email: 'primary@example.com',
      },
    })
  })

  it('maps submission plant fields and inherits the company website', () => {
    const result = toPlantDrawerData(
      {
        plantName: 'Example Plant',
        plantAddress: '',
        plantCity: '',
        plantCountry: '',
        Street1: '20 Plant Road',
        City: 'Buffalo',
        State: 'NY',
        Zip: '14201',
        Country: 'USA',
      },
      'example.com',
    )

    expect(result).toMatchObject({
      plantName: 'Example Plant',
      plantAddress: '20 Plant Road',
      plantCity: 'Buffalo',
      plantState: 'NY',
      plantZip: '14201',
      plantCountry: 'USA',
      companyWebsite: 'example.com',
    })
  })

  it('keeps the submitted non-primary plant contact group as its drawer label', () => {
    const result = toPlantDrawerData({
      plantName: 'Example Plant',
      plantAddress: '',
      plantCity: '',
      plantCountry: '',
      plantContacts: {
        OtherContact: [
          {
            contactFirst: 'Kriszelle Shane',
            contactLast: 'Apor',
            jobTitle: 'Quality Assurance Head',
          },
        ],
      },
    })

    expect(result).toMatchObject({
      secondaryContactLabel: 'Other',
      marketingContact: {
        name: 'Kriszelle Shane Apor',
        title: 'Quality Assurance Head',
      },
    })
  })
})
