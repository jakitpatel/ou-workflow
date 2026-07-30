import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useUser } from '@/context/UserContext'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { PrelimResolutionDrawer } from '@/features/prelim/components/PrelimResolutionDrawer'
import { usePrelimApplications } from '@/features/prelim/hooks/usePrelimApplications'
import {
  findPrelimResolutionTask,
  isResolvePlantTask,
  toCompanyDrawerData,
  toPlantDrawerData,
} from '@/features/prelim/lib/prelimResolution'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'
import { confirmTask } from '@/features/tasks/api'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'
import type { ApplicationTask } from '@/types/application'

export type TaskPrelimResolutionDrawerState = {
  open: boolean
  task?: ApplicationTask
}

type Props = TaskPrelimResolutionDrawerState & {
  onClose: () => void
}

export function TaskPrelimResolutionDrawer({ open, task, onClose }: Props) {
  const queryClient = useQueryClient()
  const { token, username } = useUser()
  const numericApplicationId = Number(task?.applicationId)
  const prelimApplicationsQuery = usePrelimApplications({
    applicationId: Number.isFinite(numericApplicationId) ? numericApplicationId : undefined,
    page: 0,
    limit: 5,
    enabled: open && Number.isFinite(numericApplicationId),
  })
  const submissionApplication =
    prelimApplicationsQuery.data?.data.find(
      (application) => Number(application.applicationId) === numericApplicationId,
    ) ?? prelimApplicationsQuery.data?.data[0]
  const intakeTasks = submissionApplication?.stages?.Intake?.tasks ?? []
  const resolverTask = findPrelimResolutionTask(intakeTasks, task?.taskName)
  const companyResolverTask = intakeTasks.find((intakeTask) => intakeTask.name === 'ResolveCompany')
  const isCompany = resolverTask?.name === 'ResolveCompany'
  const isPlant = isResolvePlantTask(resolverTask?.name)

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.details() }),
      queryClient.invalidateQueries({ queryKey: prelimQueryKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() }),
    ])
  }

  if (!open) return null

  if (prelimApplicationsQuery.isLoading || prelimApplicationsQuery.isFetching) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40">
        <div className="fixed right-0 top-0 h-full w-full max-w-[780px] bg-white p-8 shadow-2xl">
          Loading resolution details...
        </div>
      </div>
    )
  }

  if (
    !task ||
    prelimApplicationsQuery.isError ||
    !submissionApplication ||
    !resolverTask ||
    (!isCompany && !isPlant)
  ) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
        <div
          className="fixed right-0 top-0 h-full w-full max-w-[780px] bg-white p-8 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="float-right rounded p-1 text-gray-600 hover:bg-gray-100"
            aria-label="Close resolution drawer"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-red-600">
            {prelimApplicationsQuery.error instanceof Error
              ? prelimApplicationsQuery.error.message
              : 'Resolution task details could not be loaded from the submission application.'}
          </p>
        </div>
      </div>
    )
  }

  const assign = async (match: { Id: string | number }) => {
    await confirmTask({
      taskId: String(task.taskInstanceId),
      applicationId: task.applicationId,
      result: String(match.Id),
      token: token ?? undefined,
      username: username ?? undefined,
      capacity: resolverTask.capacity ?? task.capacity,
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
          ? toCompanyDrawerData(resolverTask.companyFromApplication)
          : toPlantDrawerData(
              resolverTask.plantFromApplication,
              companyResolverTask?.companyFromApplication?.companyWebsite,
            )
      }
      matches={
        isCompany ? (resolverTask.companyMatchList ?? []) : (resolverTask.plantMatchList ?? [])
      }
      onAssign={assign}
      onRefresh={refresh}
      selectedId={
        isCompany
          ? (resolverTask.companySelected?.ID ?? resolverTask.Result)
          : (resolverTask.plantSelected?.PlantID ?? resolverTask.Result)
      }
      applicationId={task.applicationId}
      taskInstanceId={task.taskInstanceId}
      taskCapacity={resolverTask.capacity ?? task.capacity}
      companyId={
        companyResolverTask?.companySelected?.ID ?? companyResolverTask?.Result ?? task.companyId
      }
      isActionable={(resolverTask.status ?? '').toLowerCase() === 'pending'}
      taskStatus={resolverTask.status}
    />
  )
}
