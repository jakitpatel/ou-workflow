import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bot } from 'lucide-react'
import { useUser } from '@/context/UserContext'
import { CancelApplicationDialog } from '@/features/applications/components/CancelApplicationDialog'
import { ApplicantCardActions } from '@/features/applications/components/ApplicantCardActions'
import { ApplicantAIAssistantPanel } from '@/features/applications/components/ApplicantAIAssistantPanel'
import { ApplicantCardHeader } from '@/features/applications/components/ApplicantCardHeader'
import { ApplicantCardStats } from '@/features/applications/components/ApplicantCardStats'
import { ApplicantProgressBar } from '@/features/applications/components/ApplicantProgressBar'
import { ApplicationDetailsDrawer } from '@/features/applications/components/ApplicationDetailsDrawer'
import { ApplicationExpandedStage } from '@/features/applications/components/ApplicationExpandedStage'
import { useApplicantCardState } from '@/features/applications/hooks/useApplicantCardState'
import { fetchPrelimApplicationDetails } from '@/features/prelim/api'
import { PrelimApplicationDetailsDrawer } from '@/features/prelim/components/PrelimApplicationDetailsDrawer'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'
import { queryOptionDefaults } from '@/shared/api/queryOptions'
import { TaskNotesDrawer } from '@/features/tasks/notes/TaskNotesDrawer'
import type { Applicant, Task } from '@/types/application'

const getAssignedNcrc = (applicant: Applicant) => {
  const ncrcRoles = (applicant.assignedRoles ?? []).filter((assignedRole) =>
    Object.keys(assignedRole).some((key) => key.toUpperCase() === 'NCRC'),
  )
  const assignedRole = ncrcRoles.find((role) => role.isPrimary === true) ?? ncrcRoles[0]
  if (!assignedRole) return ''

  const ncrcKey = Object.keys(assignedRole).find((key) => key.toUpperCase() === 'NCRC')
  const assignedName = ncrcKey ? assignedRole[ncrcKey] : undefined
  return typeof assignedName === 'string' ? assignedName.trim() : ''
}

type Props = {
  applicant: Applicant
  handleTaskAction: (e: React.MouseEvent, application: Applicant, action: Task) => void
  handleCancelTask: (application: Applicant, action: Task, reason: string) => Promise<void> | void
  onIntakeIdClick: (intakeId: string | number) => void
}

export function ApplicantCard({
  applicant,
  handleTaskAction,
  handleCancelTask,
  onIntakeIdClick,
}: Props) {
  const { token } = useUser()
  const [showIntakeDetailsDrawer, setShowIntakeDetailsDrawer] = useState(false)
  const rawExternalReferenceId = applicant.externalReferenceId
  const externalReferenceId =
    rawExternalReferenceId !== undefined &&
    rawExternalReferenceId !== null &&
    String(rawExternalReferenceId).trim() !== '' &&
    Number.isFinite(Number(rawExternalReferenceId))
      ? Number(rawExternalReferenceId)
      : null
  const intakeDetailsQuery = useQuery({
    queryKey: prelimQueryKeys.detail(externalReferenceId),
    queryFn: () =>
      fetchPrelimApplicationDetails(externalReferenceId as number, token ?? undefined),
    enabled: showIntakeDetailsDrawer && externalReferenceId !== null,
    select: (data: any[]) => data?.[0] ?? null,
    ...queryOptionDefaults.prelimDetail,
  })
  const assignedNcrc = getAssignedNcrc(applicant)

  const {
    applicationNotes,
    applicationNotesContextKey,
    applicationNotesCount,
    canCancelApplication,
    canUndoWithdrawApplication,
    cancelReason,
    closeCancelDialog,
    expandedStage,
    filesByType,
    handleConfirmCancel,
    handleStageClick,
    handleViewApplicationDetails,
    handleViewTasks,
    isCritical,
    isSubmittingCancel,
    isWithdrawn,
    openCancelDialog,
    priority,
    setCancelReason,
    setExpandedStage,
    setShowDetailsDrawer,
    showAIAssistant,
    showCancelDialog,
    showDetailsDrawer,
    status,
    toggleAIAssistant,
  } = useApplicantCardState({
    applicant,
    handleCancelTask,
  })

  return (
    <div
      data-app-id={applicant.applicationId}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-6">
        <div className="flex-[2] min-w-[280px] max-w-[420px]">
          <ApplicantCardHeader
            applicant={applicant}
            isCritical={isCritical}
            onIntakeIdClick={onIntakeIdClick}
            onViewApplicationDetails={handleViewApplicationDetails}
            priority={priority}
          />
          {assignedNcrc && (
            <div className="mt-1 text-xs text-gray-600">
              <span className="font-medium text-gray-500">Assigned NCRC:</span>{' '}
              <span className="font-semibold text-gray-800">{assignedNcrc}</span>
            </div>
          )}
        </div>

        <div className="flex-[4] min-w-[420px]">
          <ApplicantProgressBar
            applicant={applicant}
            onStageClick={handleStageClick}
            expandedStage={expandedStage}
            isWithdrawn={isWithdrawn}
          />
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {showAIAssistant && (
            <button
              onClick={toggleAIAssistant}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="AI Assistant - Powered by Gemini"
              aria-label="Toggle AI Assistant"
            >
              <Bot className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}
            aria-label={`Status: ${status.label}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      <ApplicationExpandedStage
        expandedStage={expandedStage}
        setExpandedStage={setExpandedStage}
        applicant={applicant}
        handleTaskAction={handleTaskAction}
      />

      {showAIAssistant && <ApplicantAIAssistantPanel applicant={applicant} />}

      {showCancelDialog && (
        <CancelApplicationDialog
          companyName={applicant.company}
          reason={cancelReason}
          saving={isSubmittingCancel}
          actionType={isWithdrawn ? 'undo_withdraw' : 'withdraw'}
          onReasonChange={setCancelReason}
          onClose={closeCancelDialog}
          onConfirm={handleConfirmCancel}
        />
      )}

      <ApplicantCardStats
        applicant={applicant}
        onOpenApplicationNotes={() =>
          applicationNotes.openDrawer({
            contextKey: applicationNotesContextKey,
            taskName: applicant.company || `Application ${String(applicant.applicationId ?? '')}`,
            tab: 'incoming',
          })
        }
        applicationNotesCount={applicationNotesCount}
        applicationNotesLoading={
          applicationNotes.isLoading(applicationNotesContextKey, 'incoming') ||
          applicationNotes.isLoading(applicationNotesContextKey, 'outgoing') ||
          applicationNotes.isLoading(applicationNotesContextKey, 'private') ||
          applicationNotes.isLoading(applicationNotesContextKey, 'mention')
        }
      />

      <ApplicantCardActions
        applicant={applicant}
        onViewTasks={handleViewTasks}
        onViewDetails={() => setShowDetailsDrawer(true)}
        onViewIntakeDetails={() => setShowIntakeDetailsDrawer(true)}
        showViewIntakeDetails={false}
        filesByType={filesByType}
        canCancelApplication={canCancelApplication}
        canUndoWithdrawApplication={canUndoWithdrawApplication}
        onCancelApplication={openCancelDialog}
      />

      <TaskNotesDrawer
        open={Boolean(applicationNotes.drawer)}
        applicantCompany={applicant.company}
        applicationId={applicant.applicationId ?? null}
        contextType="application"
        taskName={applicant.company || `Application ${String(applicant.applicationId ?? '')}`}
        activeTab={applicationNotes.drawer?.activeTab ?? 'incoming'}
        incomingNotes={applicationNotes.activeNotes.incoming}
        outgoingNotes={applicationNotes.activeNotes.outgoing}
        mentionNotes={applicationNotes.activeNotes.mention}
        privateNotes={applicationNotes.activeNotes.private}
        loadingIncoming={applicationNotes.activeLoading.incoming}
        loadingOutgoing={applicationNotes.activeLoading.outgoing}
        loadingMention={applicationNotes.activeLoading.mention}
        loadingPrivate={applicationNotes.activeLoading.private}
        composeText={applicationNotes.composeText}
        composeToUserId={applicationNotes.composeToUserId}
        composePrivate={applicationNotes.composePrivate}
        currentUsername={applicationNotes.currentUsername}
        isSubmitting={applicationNotes.isSubmitting}
        error={applicationNotes.error}
        onIncomingNoteClick={applicationNotes.markIncomingNoteRead}
        markingReadMessageId={applicationNotes.markingReadMessageId}
        reactingMessageId={applicationNotes.reactingMessageId}
        onApplicationIdClick={applicationNotes.openApplicationDetails}
        onClose={applicationNotes.closeDrawer}
        onTabChange={applicationNotes.setActiveTab}
        onComposeTextChange={applicationNotes.setComposeText}
        onComposeToUserChange={applicationNotes.setComposeToUserId}
        onComposePrivateChange={applicationNotes.setComposePrivate}
        onSubmit={applicationNotes.submitNote}
        onReplySubmit={applicationNotes.submitReply}
        onReactionTagChange={applicationNotes.updateMessageReactionTag}
      />

      <ApplicationDetailsDrawer
        open={showDetailsDrawer}
        applicationId={applicant.applicationId}
        applicant={applicant}
        onClose={() => setShowDetailsDrawer(false)}
      />
      <PrelimApplicationDetailsDrawer
        open={showIntakeDetailsDrawer}
        externalReferenceId={externalReferenceId}
        data={intakeDetailsQuery.data}
        isLoading={intakeDetailsQuery.isLoading}
        error={intakeDetailsQuery.error}
        onClose={() => setShowIntakeDetailsDrawer(false)}
      />
      <ApplicationDetailsDrawer
        open={applicationNotes.selectedApplicationId !== null}
        applicationId={applicationNotes.selectedApplicationId ?? undefined}
        onClose={applicationNotes.closeApplicationDetails}
      />
    </div>
  )
}
