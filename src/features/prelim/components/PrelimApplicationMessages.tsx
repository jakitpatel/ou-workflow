import { MessageSquare } from 'lucide-react'
import { TaskNotesDrawer } from '@/features/tasks/notes/TaskNotesDrawer'
import { useTaskNotesDrawerState } from '@/features/tasks/notes/useTaskNotesDrawerState'
import type { Applicant } from '@/types/application'

export function PrelimApplicationMessages({ application }: { application: Applicant }) {
  const messages = useTaskNotesDrawerState({
    applicationId: application.applicationId,
    includeApplicationLists: true,
    includePrelimLists: true,
  })
  const contextKey = `application:${application.applicationId}`
  const taskName = application.company || `Application ${application.applicationId}`
  const counts = messages.getCounts(contextKey)
  const fetchedCount = counts.incoming + counts.outgoing + counts.mention + counts.private
  const listCount = [
    'IsPrivateNotes' in application ? application.IsPrivateNotes : 0,
    'IsGlobalNotes' in application ? application.IsGlobalNotes : 0,
  ].reduce<number>(
    (total, value) => {
      const parsed = Number(value)
      return total + (Number.isFinite(parsed) && parsed > 0 ? parsed : 0)
    },
    0,
  )
  const count = fetchedCount > 0 ? fetchedCount : listCount
  const loading = Object.values(messages.activeLoading).some(Boolean)

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          void messages.openDrawer({ contextKey, taskName, tab: 'incoming' })
        }}
        disabled={application.applicationId == null}
        className="group relative inline-flex items-center gap-1 rounded p-1 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
        aria-label={`Notes for ${taskName}`}
        title={loading ? 'Loading notes...' : `Notes (${count})`}
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        {loading && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-indigo-600" />
        )}
        {count > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-indigo-600 px-1 text-[10px] text-white">
            {count}
          </span>
        )}
      </button>
      <TaskNotesDrawer
        open={Boolean(messages.drawer)}
        applicantCompany={application.company}
        applicationId={application.applicationId}
        contextType="application"
        taskName={taskName}
        notesTitleOverride="Application Notes"
        activeTab={messages.drawer?.activeTab ?? 'incoming'}
        incomingNotes={messages.activeNotes.incoming}
        outgoingNotes={messages.activeNotes.outgoing}
        mentionNotes={messages.activeNotes.mention}
        privateNotes={messages.activeNotes.private}
        loadingIncoming={messages.activeLoading.incoming}
        loadingOutgoing={messages.activeLoading.outgoing}
        loadingMention={messages.activeLoading.mention}
        loadingPrivate={messages.activeLoading.private}
        composeText={messages.composeText}
        composeToUserId={messages.composeToUserId}
        composePrivate={messages.composePrivate}
        currentUsername={messages.currentUsername}
        isSubmitting={messages.isSubmitting}
        error={messages.error}
        onIncomingNoteClick={messages.markIncomingNoteRead}
        markingReadMessageId={messages.markingReadMessageId}
        reactingMessageId={messages.reactingMessageId}
        onClose={messages.closeDrawer}
        onTabChange={messages.setActiveTab}
        onComposeTextChange={messages.setComposeText}
        onComposeToUserChange={messages.setComposeToUserId}
        onComposePrivateChange={messages.setComposePrivate}
        onSubmit={messages.submitNote}
        onReplySubmit={messages.submitReply}
        onReactionTagChange={messages.updateMessageReactionTag}
      />
    </>
  )
}
