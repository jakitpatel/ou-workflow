import React, { useMemo, useRef, useState } from 'react'
import { ErrorDialog, type ErrorDialogRef } from '@/components/ErrorDialog'
import { ActionModal } from '@/features/tasks/modals/ActionModal'
import { ConditionalModal } from '@/features/tasks/modals/ConditionalModal'
import { UploadNdaModal } from '@/features/tasks/modals/UploadNdaModal'
import { resolveTaskUi, type TaskUi } from '@/features/tasks/lib/taskUiRoutes'
import {
  TaskPrelimResolutionDrawer,
  type TaskPrelimResolutionDrawerState,
} from '@/features/tasks/components/TaskPrelimResolutionDrawer'
import { NcrcDashboardControls } from '@/features/applications/components/NcrcDashboardControls'
import { ApplicationDetailsDrawer } from '@/features/applications/components/ApplicationDetailsDrawer'
import { ContractStageDrawer } from '@/features/applications/components/ContractStageDrawer'
import { CertificationStageDrawer } from '@/features/applications/components/CertificationStageDrawer'
import { InspectionAssignmentDrawer } from '@/features/applications/components/InspectionAssignmentDrawer'
import { InspectionInvoiceDrawer } from '@/features/applications/components/InspectionInvoiceDrawer'
import { InspectionVisitDateDrawer } from '@/features/applications/components/InspectionVisitDateDrawer'
import { NcrcDashboardListSection } from '@/features/applications/components/NcrcDashboardListSection'
import { ScheduleAIngredientsDrawer } from '@/features/applications/components/ScheduleAIngredientsDrawer'
import { ScheduleBProductsDrawer } from '@/features/applications/components/ScheduleBProductsDrawer'
import { useNcrcDashboardState } from '@/features/applications/hooks/useNcrcDashboardState'
import { usePriorityOptions } from '@/features/applications/hooks/usePriorityOptions'
import { TaskNotesDrawer } from '@/features/tasks/notes/TaskNotesDrawer'
import { useTaskActions } from '@/features/tasks/hooks/useTaskActions'
import { useUser } from '@/context/UserContext'
import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'
import { Route } from '@/routes/_authed/ou-workflow/ncrc-dashboard'
import { Route as PrelimDashboardRoute } from '@/routes/_authed/ou-workflow/prelim-dashboard'
import type { Applicant, ApplicantAppVars, AssignedRole, Task } from '@/types/application'
import type { NoteTab, TaskNotesDrawerTabConfig } from '@/features/tasks/notes/TaskNotesDrawer'
import { PageShell } from '@/components/layout/PageShell'
import { getAllTasks } from '@/lib/utils/taskHelpers'

const SHOW_APPLICANT_STATS_CARDS = false
const normalizeApplicationId = (value: unknown): number | undefined => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const normalizeTaskText = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

export function NcrcDashboardContent() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { token, username } = useUser()
  const errorDialogRef = useRef<ErrorDialogRef>(null)

  const [selectedAction, setSelectedAction] = useState<{
    application: Applicant
    action: Task
  } | null>(null)
  const [showActionModal, setShowActionModal] = useState<Task | null | boolean>(null)
  const [showConditionModal, setShowConditionModal] = useState<Task | null | boolean>(null)
  const [showUploadModal, setShowUploadModal] = useState<Task | null | boolean>(null)
  const [scheduleADrawerState, setScheduleADrawerState] = useState<{
    open: boolean
    applicationId?: string | number
    applicationName?: string
    visitId?: string | number | null
    appVars?: ApplicantAppVars | null
    assignedRoles?: AssignedRole[]
    taskInstanceId?: string | number
    taskName?: string
    taskCategory?: string
    scheduleATaskInstanceId?: string | number
    scheduleATaskStatusDetails?: unknown
  }>({
    open: false,
  })
  const [scheduleBDrawerState, setScheduleBDrawerState] = useState<{
    open: boolean
    applicationId?: string | number
    applicationName?: string
    visitId?: string | number | null
    appVars?: ApplicantAppVars | null
    assignedRoles?: AssignedRole[]
    taskInstanceId?: string | number
    taskName?: string
    taskCategory?: string
    scheduleBTaskInstanceId?: string | number
    scheduleBTaskStatusDetails?: unknown
  }>({
    open: false,
  })
  const [inspectionInvoiceDrawerState, setInspectionInvoiceDrawerState] = useState<{
    open: boolean
    applicant?: Applicant
    applicationId?: string | number
    applicationName?: string
    taskInstanceId?: string | number
    taskName?: string
  }>({
    open: false,
  })
  const [inspectionAssignmentDrawerState, setInspectionAssignmentDrawerState] = useState<{
    open: boolean
    applicant?: Applicant
    task?: Task
  }>({
    open: false,
  })
  const [inspectionVisitDateDrawerState, setInspectionVisitDateDrawerState] = useState<{
    open: boolean
    applicant?: Applicant
    task?: Task
  }>({
    open: false,
  })
  const [contractDrawerState, setContractDrawerState] = useState<{
    open: boolean
    applicant?: Applicant
    applicationId?: string | number
    applicationName?: string
    taskInstanceId?: string | number
    taskName?: string
    appVars?: ApplicantAppVars | null
    assignedRoles?: AssignedRole[]
  }>({
    open: false,
  })
  const [certificationDrawerState, setCertificationDrawerState] = useState<{
    open: boolean
    applicant?: Applicant
    task?: Task
  }>({ open: false })
  const [prelimResolutionDrawerState, setPrelimResolutionDrawerState] =
    useState<TaskPrelimResolutionDrawerState>({ open: false })
  const [myNotesSelectedApplicationId, setMyNotesSelectedApplicationId] = useState<number | null>(
    null,
  )
  const [myMessagesActiveTab, setMyMessagesActiveTab] = useState<NoteTab>('incoming')

  const {
    q,
    status,
    priority,
    page,
    myOnly,
    paginationMode,
    isLoading,
    isRefreshing,
    isError,
    error,
    applicants,
    totalCount,
    pageSize,
    applicantStats,
    infiniteQuery,
    sentinelRef,
    myNotesOpen,
    myNotes,
    myNotesLoading,
    myNotesError,
    myNotesMarkingReadMessageId,
    myNotesReactingMessageId,
    myNotesReplySubmitting,
    updateSearch,
    handleFirst,
    handlePrev,
    handleNext,
    handleLast,
    openMyNotesDrawer,
    closeMyNotesDrawer,
    submitMyNotesReply,
    markMyNoteRead,
    updateMyNoteReactionTag,
  } = useNcrcDashboardState({
    search,
    navigate,
  })
  const priorityOptions = usePriorityOptions()

  const { executeAction, completeTaskWithResult } = useTaskActions({
    applicationType: 'WORKFLOW',
    applications: applicants,
    token: token ?? undefined,
    username: username ?? undefined,
    onError: (message) => errorDialogRef.current?.open(message),
  })
  const myMessagesTabs = useMemo<TaskNotesDrawerTabConfig[]>(
    () => [
      {
        id: 'incoming',
        label: 'Direct',
        notes: myNotes.incoming.map((note) => ({
          ...note,
          ApplicationID: normalizeApplicationId(
            note?.ApplicationID ??
              note?.applicationId ??
              note?.ApplicationId,
          ),
        })),
        loading: myNotesLoading,
        mode: 'public',
        threaded: true,
        tabClassName: 'border-sky-600 text-sky-700',
        badgeClassName: 'bg-sky-100 text-sky-700',
      },
      {
        id: 'mention',
        label: 'Mention',
        notes: myNotes.mention.map((note) => ({
          ...note,
          ApplicationID: normalizeApplicationId(
            note?.ApplicationID ??
              note?.applicationId ??
              note?.ApplicationId,
          ),
        })),
        loading: myNotesLoading,
        mode: 'public',
        threaded: true,
        tabClassName: 'border-amber-600 text-amber-700',
        badgeClassName: 'bg-amber-100 text-amber-700',
      },
      {
        id: 'private',
        label: 'Private',
        notes: myNotes.private.map((note) => ({
          ...note,
          ApplicationID: normalizeApplicationId(
            note?.ApplicationID ??
              note?.applicationId ??
              note?.ApplicationId,
          ),
        })),
        loading: myNotesLoading,
        mode: 'public',
        threaded: true,
        tabClassName: 'border-blue-600 text-blue-700',
        badgeClassName: 'bg-blue-100 text-blue-700',
      },
    ],
    [myNotes, myNotesLoading],
  )

  const handleSelectAppActions = (application: Applicant, action: Task) => {
    setSelectedAction({ application, action })
  }

  const handleTaskAction = (event: React.MouseEvent, application: Applicant, action: Task) => {
    event.stopPropagation()
    event.preventDefault()

    handleSelectAppActions(application, action)

    const actionRecord = action as Task & {
      TaskType?: unknown
      TaskCategory?: unknown
      taskInstanceId?: unknown
    }
    const actionCategory = normalizeTaskText(actionRecord.taskCategory ?? actionRecord.TaskCategory)

    // Which UI a task opens is configured in TASK_UI_ROUTES; these open each kind of UI.
    const openTaskUi: Record<TaskUi, () => void> = {
      'certification-drawer': () => {
        setCertificationDrawerState({ open: true, applicant: application, task: action })
      },
      'prelim-resolution-drawer': () => {
        setPrelimResolutionDrawerState({
          open: true,
          task: {
            applicationId: application.applicationId,
            taskInstanceId: Number(actionRecord.TaskInstanceId ?? actionRecord.taskInstanceId),
            taskName: action.name,
            capacity: action.capacity,
            companyId: application.companyId,
          },
        })
      },
      'schedule-a-drawer': () => {
        const scheduleATask = getAllTasks(application).find(
          (task) =>
            normalizeTaskText(task.name) === TASK_CATEGORIES.SCHEDULEA &&
            normalizeTaskText(task.taskCategory ?? task.TaskCategory) ===
              TASK_CATEGORIES.SCHEDULEA &&
            normalizeTaskText(task.taskType ?? task.TaskType) === TASK_TYPES.ACTION,
        )
        setScheduleADrawerState({
          open: true,
          applicationId: application.applicationId,
          applicationName: application.company,
          visitId:
            application.visit_id ?? application.visitId ?? application.appvars?.visit_id ?? null,
          appVars: application.appvars ?? null,
          assignedRoles: application.assignedRoles,
          taskInstanceId: actionRecord.TaskInstanceId ?? actionRecord.taskInstanceId,
          taskName: action.name,
          taskCategory: actionCategory,
          scheduleATaskInstanceId:
            scheduleATask?.TaskInstanceId ?? scheduleATask?.taskInstanceId,
          scheduleATaskStatusDetails:
            scheduleATask?.StatusDetails ?? scheduleATask?.statusDetails,
        })
      },
      'schedule-b-drawer': () => {
        const scheduleBTask = getAllTasks(application).find(
          (task) =>
            normalizeTaskText(task.name) === TASK_CATEGORIES.SCHEDULEB &&
            normalizeTaskText(task.taskCategory ?? task.TaskCategory) ===
              TASK_CATEGORIES.SCHEDULEB &&
            normalizeTaskText(task.taskType ?? task.TaskType) === TASK_TYPES.ACTION,
        )
        setScheduleBDrawerState({
          open: true,
          applicationId: application.applicationId,
          applicationName: application.company,
          visitId:
            application.visit_id ?? application.visitId ?? application.appvars?.visit_id ?? null,
          appVars: application.appvars ?? null,
          assignedRoles: application.assignedRoles,
          taskInstanceId: actionRecord.TaskInstanceId ?? actionRecord.taskInstanceId,
          taskName: action.name,
          taskCategory: actionCategory,
          scheduleBTaskInstanceId:
            scheduleBTask?.TaskInstanceId ?? scheduleBTask?.taskInstanceId,
          scheduleBTaskStatusDetails:
            scheduleBTask?.StatusDetails ?? scheduleBTask?.statusDetails,
        })
      },
      'inspection-invoice-drawer': () => {
        setInspectionInvoiceDrawerState({
          open: true,
          applicant: application,
          applicationId: application.applicationId,
          applicationName: application.company,
          taskInstanceId: action.TaskInstanceId,
          taskName: action.name,
        })
      },
      'inspection-assignment-drawer': () => {
        setInspectionAssignmentDrawerState({ open: true, applicant: application, task: action })
      },
      'inspection-visit-drawer': () => {
        setInspectionVisitDateDrawerState({ open: true, applicant: application, task: action })
      },
      'contract-drawer': () => {
        setContractDrawerState({
          open: true,
          applicant: application,
          applicationId: application.applicationId,
          applicationName: application.company,
          taskInstanceId: actionRecord.TaskInstanceId ?? actionRecord.taskInstanceId,
          taskName: action.name,
          appVars: application.appvars ?? null,
          assignedRoles: application.assignedRoles,
        })
      },
      confirm: () => executeAction('Confirmed', action, 'yes', { application, action }),
      'condition-modal': () => setShowConditionModal(action),
      'upload-modal': () => setShowUploadModal(action),
      'action-modal': () => setShowActionModal(action),
    }

    const ui = resolveTaskUi(action)
    if (ui) openTaskUi[ui]()
  }

  const handleCancelTask = async (application: Applicant, action: Task, reason: string) => {
    handleSelectAppActions(application, action)
    completeTaskWithResult(action, reason, undefined, undefined, application.applicationId)
  }

  const openMyNotesApplicationDetails = (applicationId: number) => {
    setMyNotesSelectedApplicationId(applicationId)
  }

  const closeMyNotesApplicationDetails = () => {
    setMyNotesSelectedApplicationId(null)
  }

  const viewApplicationFromMyNotes = (applicationId: number) => {
    setMyNotesSelectedApplicationId(null)
    closeMyNotesDrawer()
    updateSearch({
      applicationId,
      page: 0,
    })
  }

  const handleOpenMyMessages = () => {
    setMyMessagesActiveTab('incoming')
    openMyNotesDrawer()
  }

  const handleIntakeIdClick = (intakeId: string | number) => {
    const applicationId = Number(intakeId)
    if (!Number.isFinite(applicationId)) return

    navigate({
      to: PrelimDashboardRoute.to,
      search: {
        q: '',
        status: 'all',
        page: 0,
        applicationId,
      },
    })
  }

  return (
    <>
      <PageShell>
        <NcrcDashboardControls
          applicationId={search.applicationId}
          q={q}
          status={status}
          priority={priority}
          page={page}
          myOnly={myOnly}
          totalCount={totalCount}
          pageSize={pageSize}
          paginationMode={paginationMode}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          priorityOptions={priorityOptions}
          isError={isError}
          error={error}
          username={username}
          showApplicantStats={SHOW_APPLICANT_STATS_CARDS}
          applicantStats={applicantStats}
          onOpenMyNotes={handleOpenMyMessages}
          onUpdateSearch={updateSearch}
          onFirstPage={handleFirst}
          onPrevPage={handlePrev}
          onNextPage={handleNext}
          onLastPage={handleLast}
        />

        <NcrcDashboardListSection
          applicants={applicants}
          paginationMode={paginationMode}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          isError={isError}
          isInfiniteInitialLoading={
            paginationMode === 'infinite' && infiniteQuery.isLoading && !infiniteQuery.data
          }
          hasNextPage={Boolean(infiniteQuery.hasNextPage)}
          isFetchingNextPage={infiniteQuery.isFetchingNextPage}
          sentinelRef={sentinelRef}
          onTaskAction={handleTaskAction}
          onCancelTask={handleCancelTask}
          onIntakeIdClick={handleIntakeIdClick}
        />
      </PageShell>

      <ActionModal
        setShowActionModal={setShowActionModal}
        showActionModal={showActionModal}
        executeAction={executeAction}
        selectedAction={selectedAction}
      />
      <ConditionalModal
        setShowConditionModal={setShowConditionModal}
        showConditionModal={showConditionModal}
        executeAction={executeAction}
        selectedAction={selectedAction}
      />
      <UploadNdaModal
        showUploadModal={showUploadModal}
        setShowUploadModal={setShowUploadModal}
        selectedAction={selectedAction}
        taskInstanceId={selectedAction?.action?.TaskInstanceId}
        completeTaskWithResult={completeTaskWithResult}
      />

      <ErrorDialog ref={errorDialogRef} />
      <TaskNotesDrawer
        open={myNotesOpen}
        applicantCompany="My Messages"
        contextType="application"
        taskName={username?.trim() || 'Current User'}
        activeTab={myMessagesActiveTab}
        incomingNotes={[]}
        outgoingNotes={[]}
        mentionNotes={[]}
        privateNotes={[]}
        loadingIncoming={false}
        loadingOutgoing={false}
        loadingMention={false}
        loadingPrivate={false}
        composeText=""
        composePrivate={false}
        currentUsername={username}
        isSubmitting={myNotesReplySubmitting}
        error={myNotesError}
        notesTitleOverride="My Messages"
        currentLabelOverride="Logged In User"
        customTabs={myMessagesTabs}
        showMyNotesThreadType
        hideComposer
        hidePrivacyToggle
        showPerNoteApplicationId
        showViewApplicationAction
        enableMessageFilters
        onApplicationIdClick={openMyNotesApplicationDetails}
        onViewApplicationClick={viewApplicationFromMyNotes}
        onIncomingNoteClick={markMyNoteRead}
        markingReadMessageId={myNotesMarkingReadMessageId}
        reactingMessageId={myNotesReactingMessageId}
        onClose={closeMyNotesDrawer}
        onTabChange={setMyMessagesActiveTab}
        onComposeTextChange={() => {}}
        onComposeToUserChange={() => {}}
        onComposePrivateChange={() => {}}
        onSubmit={() => {}}
        onReplySubmit={submitMyNotesReply}
        onReactionTagChange={updateMyNoteReactionTag}
      />
      <ApplicationDetailsDrawer
        open={myNotesSelectedApplicationId !== null}
        applicationId={myNotesSelectedApplicationId ?? undefined}
        onClose={closeMyNotesApplicationDetails}
      />
      <ScheduleAIngredientsDrawer
        open={scheduleADrawerState.open}
        applicationId={scheduleADrawerState.applicationId}
        applicationName={scheduleADrawerState.applicationName}
        visitId={scheduleADrawerState.visitId}
        appVars={scheduleADrawerState.appVars}
        assignedRoles={scheduleADrawerState.assignedRoles}
        taskInstanceId={scheduleADrawerState.taskInstanceId}
        taskName={scheduleADrawerState.taskName}
        taskCategory={scheduleADrawerState.taskCategory}
        scheduleATaskInstanceId={scheduleADrawerState.scheduleATaskInstanceId}
        scheduleATaskStatusDetails={scheduleADrawerState.scheduleATaskStatusDetails}
        onClose={() => setScheduleADrawerState({ open: false })}
      />
      <ScheduleBProductsDrawer
        open={scheduleBDrawerState.open}
        applicationId={scheduleBDrawerState.applicationId}
        applicationName={scheduleBDrawerState.applicationName}
        visitId={scheduleBDrawerState.visitId}
        appVars={scheduleBDrawerState.appVars}
        assignedRoles={scheduleBDrawerState.assignedRoles}
        taskInstanceId={scheduleBDrawerState.taskInstanceId}
        taskName={scheduleBDrawerState.taskName}
        taskCategory={scheduleBDrawerState.taskCategory}
        scheduleBTaskInstanceId={scheduleBDrawerState.scheduleBTaskInstanceId}
        scheduleBTaskStatusDetails={scheduleBDrawerState.scheduleBTaskStatusDetails}
        onClose={() => setScheduleBDrawerState({ open: false })}
      />
      <InspectionInvoiceDrawer
        open={inspectionInvoiceDrawerState.open}
        applicant={inspectionInvoiceDrawerState.applicant}
        applicationId={inspectionInvoiceDrawerState.applicationId}
        applicationName={inspectionInvoiceDrawerState.applicationName}
        taskInstanceId={inspectionInvoiceDrawerState.taskInstanceId}
        taskName={inspectionInvoiceDrawerState.taskName}
        onClose={() => setInspectionInvoiceDrawerState({ open: false })}
      />
      <InspectionAssignmentDrawer
        open={inspectionAssignmentDrawerState.open}
        applicant={inspectionAssignmentDrawerState.applicant}
        task={inspectionAssignmentDrawerState.task}
        onClose={() => setInspectionAssignmentDrawerState({ open: false })}
      />
      <InspectionVisitDateDrawer
        open={inspectionVisitDateDrawerState.open}
        applicant={inspectionVisitDateDrawerState.applicant}
        task={inspectionVisitDateDrawerState.task}
        onClose={() => setInspectionVisitDateDrawerState({ open: false })}
      />
      <ContractStageDrawer
        open={contractDrawerState.open}
        applicant={contractDrawerState.applicant}
        applicationId={contractDrawerState.applicationId}
        applicationName={contractDrawerState.applicationName}
        taskInstanceId={contractDrawerState.taskInstanceId}
        taskName={contractDrawerState.taskName}
        appVars={contractDrawerState.appVars}
        assignedRoles={contractDrawerState.assignedRoles}
        onClose={() => setContractDrawerState({ open: false })}
      />
      <CertificationStageDrawer
        key={String(
          certificationDrawerState.task?.TaskInstanceId ??
            (certificationDrawerState.task)?.taskInstanceId ??
            'certification-drawer',
        )}
        open={certificationDrawerState.open}
        applicant={certificationDrawerState.applicant}
        task={certificationDrawerState.task}
        onClose={() => setCertificationDrawerState({ open: false })}
      />
      <TaskPrelimResolutionDrawer
        {...prelimResolutionDrawerState}
        onClose={() => setPrelimResolutionDrawerState({ open: false })}
      />
    </>
  )
}
