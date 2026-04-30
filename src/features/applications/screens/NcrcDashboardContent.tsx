import React, { useMemo, useRef, useState } from 'react'
import { ErrorDialog, type ErrorDialogRef } from '@/components/ErrorDialog'
import { ActionModal } from '@/components/ou-workflow/modal/ActionModal'
import { ConditionalModal } from '@/components/ou-workflow/modal/ConditionalModal'
import { UploadNdaModal } from '@/components/ou-workflow/modal/UploadNdaModal'
import { NcrcDashboardControls } from '@/features/applications/components/NcrcDashboardControls'
import { ApplicationDetailsDrawer } from '@/features/applications/components/ApplicationDetailsDrawer'
import { NcrcDashboardListSection } from '@/features/applications/components/NcrcDashboardListSection'
import { ScheduleAIngredientsDrawer } from '@/features/applications/components/ScheduleAIngredientsDrawer'
import { ScheduleBProductsDrawer } from '@/features/applications/components/ScheduleBProductsDrawer'
import { useNcrcDashboardState } from '@/features/applications/hooks/useNcrcDashboardState'
import { TaskNotesDrawer } from '@/features/tasks/notes/TaskNotesDrawer'
import { useTaskActions } from '@/features/tasks/hooks/useTaskActions'
import { useUser } from '@/context/UserContext'
import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'
import { Route } from '@/routes/_authed/ou-workflow/ncrc-dashboard'
import type { Applicant, Task } from '@/types/application'
import type { NoteTab, TaskNotesDrawerTabConfig } from '@/features/tasks/notes/TaskNotesDrawer'

const SHOW_APPLICANT_STATS_CARDS = false
const normalizeApplicationId = (value: unknown): number | undefined => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

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
    taskName?: string
  }>({
    open: false,
  })
  const [scheduleBDrawerState, setScheduleBDrawerState] = useState<{
    open: boolean
    applicationId?: string | number
    applicationName?: string
    taskName?: string
  }>({
    open: false,
  })
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
    isError,
    error,
    applicants,
    totalCount,
    totalPages,
    applicantStats,
    infiniteQuery,
    sentinelRef,
    myNotesOpen,
    myNotes,
    myNotesLoading,
    myNotesError,
    myNotesMarkingReadMessageId,
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
  } = useNcrcDashboardState({
    search,
    navigate,
  })

  const { executeAction, completeTaskWithResult } = useTaskActions({
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
            (note as any)?.ApplicationID ??
              (note as any)?.applicationId ??
              (note as any)?.ApplicationId,
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
            (note as any)?.ApplicationID ??
              (note as any)?.applicationId ??
              (note as any)?.ApplicationId,
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
            (note as any)?.ApplicationID ??
              (note as any)?.applicationId ??
              (note as any)?.ApplicationId,
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

    const actionType = action.taskType?.toLowerCase()
    const actionCategory = action.taskCategory?.toLowerCase()

    if (actionType === TASK_TYPES.ACTION && actionCategory === TASK_CATEGORIES.SCHEDULEA) {
      setScheduleADrawerState({
        open: true,
        applicationId: application.applicationId,
        applicationName: application.company,
        taskName: action.name,
      })
      return
    }

    if (actionType === TASK_TYPES.ACTION && actionCategory === TASK_CATEGORIES.SCHEDULEB) {
      setScheduleBDrawerState({
        open: true,
        applicationId: application.applicationId,
        applicationName: application.company,
        taskName: action.name,
      })
      return
    }

    if (actionType === TASK_TYPES.CONFIRM && actionCategory === TASK_CATEGORIES.CONFIRMATION) {
      executeAction('Confirmed', action, 'yes', { application, action })
      return
    }

    if (
      (actionType === TASK_TYPES.CONDITIONAL || actionType === TASK_TYPES.CONDITION) &&
      [TASK_CATEGORIES.APPROVAL, TASK_CATEGORIES.APPROVAL1].includes(actionCategory as any)
    ) {
      setShowConditionModal(action)
      return
    }

    if (
      (actionType === TASK_TYPES.ACTION &&
        [TASK_CATEGORIES.UPLOAD, TASK_CATEGORIES.EMAIL].includes(actionCategory as any)) ||
      (actionCategory === TASK_CATEGORIES.UPLOAD && actionType === TASK_TYPES.UPLOAD)
    ) {
      setShowUploadModal(action)
      return
    }

    if (actionType === TASK_TYPES.ACTION) {
      if (actionCategory === TASK_CATEGORIES.ASSIGNMENT) {
        setShowActionModal(action)
      } else {
        setShowConditionModal(action)
      }
      return
    }

    if (actionType === TASK_TYPES.PROGRESS && actionCategory === TASK_CATEGORIES.PROGRESS_TASK) {
      setShowConditionModal(action)
    }
  }

  const handleCancelTask = async (application: Applicant, action: Task, reason: string) => {
    handleSelectAppActions(application, action)
    completeTaskWithResult(action, reason)
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

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <NcrcDashboardControls
            q={q}
            status={status}
            priority={priority}
            page={page}
            myOnly={myOnly}
            totalCount={totalCount}
            totalPages={totalPages}
            paginationMode={paginationMode}
            isLoading={isLoading}
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
            isError={isError}
            isInfiniteInitialLoading={
              paginationMode === 'infinite' && infiniteQuery.isLoading && !infiniteQuery.data
            }
            hasNextPage={Boolean(infiniteQuery.hasNextPage)}
            isFetchingNextPage={infiniteQuery.isFetchingNextPage}
            sentinelRef={sentinelRef}
            onTaskAction={handleTaskAction}
            onCancelTask={handleCancelTask}
          />
        </div>
      </div>

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
        onApplicationIdClick={openMyNotesApplicationDetails}
        onViewApplicationClick={viewApplicationFromMyNotes}
        onIncomingNoteClick={markMyNoteRead}
        markingReadMessageId={myNotesMarkingReadMessageId}
        onClose={closeMyNotesDrawer}
        onTabChange={setMyMessagesActiveTab}
        onComposeTextChange={() => {}}
        onComposeToUserChange={() => {}}
        onComposePrivateChange={() => {}}
        onSubmit={() => {}}
        onReplySubmit={submitMyNotesReply}
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
        taskName={scheduleADrawerState.taskName}
        onClose={() => setScheduleADrawerState({ open: false })}
      />
      <ScheduleBProductsDrawer
        open={scheduleBDrawerState.open}
        applicationId={scheduleBDrawerState.applicationId}
        applicationName={scheduleBDrawerState.applicationName}
        taskName={scheduleBDrawerState.taskName}
        onClose={() => setScheduleBDrawerState({ open: false })}
      />
    </>
  )
}
