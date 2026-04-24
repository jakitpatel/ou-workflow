import { Bot } from 'lucide-react'
import { CancelApplicationDialog } from '@/components/ou-workflow/modal/CancelApplicationDialog'
import { ApplicantCardActions } from '@/features/applications/components/ApplicantCardActions'
import { ApplicantAIAssistantPanel } from '@/features/applications/components/ApplicantAIAssistantPanel'
import { ApplicantCardHeader } from '@/features/applications/components/ApplicantCardHeader'
import { ApplicantCardStats } from '@/features/applications/components/ApplicantCardStats'
import { ApplicantProgressBar } from '@/features/applications/components/ApplicantProgressBar'
import { ApplicationDetailsDrawer } from '@/features/applications/components/ApplicationDetailsDrawer'
import { ApplicationExpandedStage } from '@/features/applications/components/ApplicationExpandedStage'
import { useApplicantCardState } from '@/features/applications/hooks/useApplicantCardState'
import { TaskNotesDrawer } from '@/features/tasks/notes/TaskNotesDrawer'
import type { Applicant, Task } from '@/types/application'

type Props = {
  applicant: Applicant
  handleTaskAction: (e: React.MouseEvent, application: Applicant, action: Task) => void
  handleCancelTask: (application: Applicant, action: Task, reason: string) => Promise<void> | void
}

export function ApplicantCard({ applicant, handleTaskAction, handleCancelTask }: Props) {
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
            onViewApplicationDetails={handleViewApplicationDetails}
            priority={priority}
          />
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
        onApplicationIdClick={applicationNotes.openApplicationDetails}
        onClose={applicationNotes.closeDrawer}
        onTabChange={applicationNotes.setActiveTab}
        onComposeTextChange={applicationNotes.setComposeText}
        onComposeToUserChange={applicationNotes.setComposeToUserId}
        onComposePrivateChange={applicationNotes.setComposePrivate}
        onSubmit={applicationNotes.submitNote}
        onReplySubmit={applicationNotes.submitReply}
      />

      <ApplicationDetailsDrawer
        open={showDetailsDrawer}
        applicationId={applicant.applicationId}
        onClose={() => setShowDetailsDrawer(false)}
      />
      <ApplicationDetailsDrawer
        open={applicationNotes.selectedApplicationId !== null}
        applicationId={applicationNotes.selectedApplicationId ?? undefined}
        onClose={applicationNotes.closeApplicationDetails}
      />
    </div>
  )
}
