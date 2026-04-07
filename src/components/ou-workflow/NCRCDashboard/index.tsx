import React, { useRef, useState } from 'react'
import { TaskNotesDrawer } from './TaskNotesDrawer'
import { ErrorDialog, type ErrorDialogRef } from '@/components/ErrorDialog'
import { ActionModal } from '@/components/ou-workflow/modal/ActionModal'
import { ConditionalModal } from '@/components/ou-workflow/modal/ConditionalModal'
import { UploadNdaModal } from '@/components/ou-workflow/modal/UploadNdaModal'
import { NcrcDashboardControls } from '@/features/applications/components/NcrcDashboardControls'
import { NcrcDashboardListSection } from '@/features/applications/components/NcrcDashboardListSection'
import { useNcrcDashboardState } from '@/features/applications/hooks/useNcrcDashboardState'
import { useUser } from '@/context/UserContext'
import { TASK_CATEGORIES, TASK_TYPES } from '@/lib/constants/task'
import { Route } from '@/routes/_authed/ou-workflow/ncrc-dashboard'
import { useTaskActions } from '@/components/ou-workflow/hooks/useTaskActions'
import type { Applicant, Task } from '@/types/application'

const SHOW_APPLICANT_STATS_CARDS = false

export function NCRCDashboard() {
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
    updateSearch,
    handleFirst,
    handlePrev,
    handleNext,
    handleLast,
    openMyNotesDrawer,
    closeMyNotesDrawer,
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

  const handleSelectAppActions = (application: Applicant, action: Task) => {
    setSelectedAction({ application, action })
  }

  const handleTaskAction = (event: React.MouseEvent, application: Applicant, action: Task) => {
    event.stopPropagation()
    event.preventDefault()

    handleSelectAppActions(application, action)

    const actionType = action.taskType?.toLowerCase()
    const actionCategory = action.taskCategory?.toLowerCase()

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
            onOpenMyNotes={openMyNotesDrawer}
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
        applicantCompany="My Notes"
        contextType="application"
        taskName={username?.trim() || 'Current User'}
        activeTab="toMe"
        privateNotes={[]}
        publicNotes={[]}
        toMeNotes={myNotes}
        loadingPrivate={false}
        loadingPublic={false}
        loadingToMe={myNotesLoading}
        composeText=""
        composePrivate={false}
        isSubmitting={false}
        error={myNotesError}
        notesTitleOverride="My Notes"
        currentLabelOverride="Logged In User"
        toMeTabLabel="My Notes"
        singleTabMode
        hideComposer
        hidePrivacyToggle
        onClose={closeMyNotesDrawer}
        onTabChange={() => {}}
        onComposeTextChange={() => {}}
        onComposeToUserChange={() => {}}
        onComposePrivateChange={() => {}}
        onSubmit={() => {}}
        onReplySubmit={async () => {}}
      />
    </>
  )
}
