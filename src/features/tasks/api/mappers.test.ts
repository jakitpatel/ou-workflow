import { describe, expect, it } from 'vitest'
import { mapApplicationTasksResponse } from './mappers'

describe('mapApplicationTasksResponse', () => {
  it('preserves company resolution payloads used by the preliminary drawer', () => {
    const companyFromApplication = {
      companyName: 'Big Tiny General LLC',
      Street1: '418 Broadway STE N',
      City: 'Albany',
      State: 'NY',
      Zip: '12207',
      Country: 'USA',
      companyAddress: '',
      companyCity: '',
      companyCountry: '',
      companyPhone: '412-583-3310',
      companyWebsite: 'oozwater.com',
    }
    const companyMatchList = [
      {
        Id: 1443585,
        companyName: 'Big Tiny General LLC',
        Address: '418 Broadway STE N Albany, NY 12207 USA',
        matchRating: 100,
      },
    ]

    const result = mapApplicationTasksResponse({
      data: [
        {
          applicationId: 4520,
          taskInstanceId: 66268,
          taskName: 'ResolveCompany',
          taskType: 'ACTION',
          TaskCategory: 'INPUT',
          companyFromApplication,
          companyMatchList,
          companySelected: {
            ID: '1443585',
            companyName: 'Big Tiny General LLC',
            Address: '418 Broadway STE N',
          },
        },
      ],
      status: 'ok',
    })

    expect(result.data[0].companyFromApplication).toEqual(companyFromApplication)
    expect(result.data[0].companyMatchList).toEqual(companyMatchList)
    expect(result.data[0].companySelected?.ID).toBe('1443585')
  })

  it('preserves plant resolution payloads used by the preliminary drawer', () => {
    const plantFromApplication = {
      plantName: 'Yichun Jiufengshan',
      Street1: 'Beixing Street',
      City: 'Yichun City',
      State: 'NY',
      Zip: '153026',
      Country: 'China',
      plantAddress: '',
      plantCity: '',
      plantCountry: '',
    }
    const plantMatchList = [
      {
        Id: 14065053,
        PlantID: 14065053,
        plantName: 'Yichun Jiufengshan',
        Address: 'Beixing Street',
      },
    ]

    const result = mapApplicationTasksResponse({
      data: [
        {
          applicationId: 4520,
          taskInstanceId: 66269,
          taskName: 'ResolvePlant1',
          taskType: 'ACTION',
          TaskCategory: 'INPUT',
          plantFromApplication,
          plantMatchList,
          plantSelected: {
            PlantID: '14065053',
            plantName: 'Yichun Jiufengshan',
            Address: 'Beixing Street',
          },
        },
      ],
      status: 'ok',
    })

    expect(result.data[0].plantFromApplication).toEqual(plantFromApplication)
    expect(result.data[0].plantMatchList).toEqual(plantMatchList)
    expect(result.data[0].plantSelected?.PlantID).toBe('14065053')
  })
})
