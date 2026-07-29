import { useQueryClient } from '@tanstack/react-query'
import { useUser } from '@/context/UserContext'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { PrelimResolutionDrawer } from '@/features/prelim/components/PrelimResolutionDrawer'
import {
  isResolvePlantTask,
  toCompanyDrawerData,
  toPlantDrawerData,
} from '@/features/prelim/components/PrelimResolvedSection'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'
import { confirmTask } from '@/features/tasks/api'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'
import type { ApplicationTask } from '@/types/application'

export type TaskPrelimResolutionDrawerState = {
  open: boolean
  task?: ApplicationTask
  companyTask?: ApplicationTask
}

type Props = TaskPrelimResolutionDrawerState & {
  onClose: () => void
}

export function TaskPrelimResolutionDrawer({
  open,
  task,
  companyTask,
  onClose,
}: Props) {
  const queryClient = useQueryClient()
  const { token, username } = useUser()

  if (!open) return null

  const isCompany = task?.taskName === 'ResolveCompany'
  const isPlant = isResolvePlantTask(task?.taskName)

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.details() }),
      queryClient.invalidateQueries({ queryKey: prelimQueryKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() }),
    ])
  }

  if (!task || (!isCompany && !isPlant)) return null

  const assign = async (match: { Id: string | number }) => {
    await confirmTask({
      taskId: String(task.taskInstanceId),
      applicationId: task.applicationId,
      result: String(match.Id),
      token: token ?? undefined,
      username: username ?? undefined,
      capacity: task.capacity,
    })
    await refresh()
  }

  return (
    <PrelimResolutionDrawer
      isOpen={open}
      onClose={onClose}
      type={isCompany ? 'company' : 'plant'}
      data={
        isCompany
          ? toCompanyDrawerData(task.companyFromApplication)
          : toPlantDrawerData(
              task.plantFromApplication,
              companyTask?.companyFromApplication?.companyWebsite,
            )
      }
      matches={isCompany ? task.companyMatchList ?? [] : task.plantMatchList ?? []}
      onAssign={assign}
      onRefresh={refresh}
      selectedId={
        isCompany
          ? task.companySelected?.ID ?? task.Result
          : task.plantSelected?.PlantID ?? task.Result
      }
      applicationId={task.applicationId}
      taskInstanceId={task.taskInstanceId}
      taskCapacity={task.capacity}
      companyId={companyTask?.companySelected?.ID ?? companyTask?.Result ?? task.companyId}
      isActionable={(task.status ?? '').toLowerCase() === 'pending'}
      taskStatus={task.status}
    />
  )
}
