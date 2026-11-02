import type { Applicant, ApplicationTask, Task } from '@/types/application'

export type TaskAction = Partial<Omit<Task, keyof ApplicationTask | 'application' | 'applicationId'>> &
  Partial<Omit<ApplicationTask, 'id' | 'status' | 'TaskInstanceId' | 'applicationId' | 'taskInstanceId'>> & {
    id?: string | number
    taskInstanceId?: string | number
    TaskInstanceId?: string | number
    applicationId?: string | number
    status?: string
    application?: Partial<Applicant>
  }

export type SelectedTaskAction = {
  application: Partial<Applicant> & { companyName?: string; assignee?: string; GlobalData?: string }
  action: TaskAction
}
