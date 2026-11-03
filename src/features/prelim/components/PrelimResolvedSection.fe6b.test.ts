import { expect, it } from 'vitest'
import type { Applicant, Task } from '@/types/application'
import { extractResolvedData, getResolvedMasterPlantId } from './PrelimResolvedSection'
it('shows master plant id from the resolve result instead of SubmissionPlant id', () => {
  const task = { name: 'ResolvePlant1', status: 'COMPLETED', Result: '2108', ResultData: '{"PlantID":2108}', plantSelected: { PlantID: 282 }, plantFromApplication: { plantID: 282 } } as unknown as Task
  const app = { stages: { Intake: { tasks: [task] } } } as unknown as Applicant
  expect(extractResolvedData(app)?.plants[0].plant.plantID).toBe(2108)
  expect(getResolvedMasterPlantId({ ...task, ResultData: undefined })).toBe('2108')
  expect(getResolvedMasterPlantId({ ...task, ResultData: undefined, Result: '' })).toBe('')
  expect(getResolvedMasterPlantId({ ...task, status: 'pending' })).toBe('')
})
