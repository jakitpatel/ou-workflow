import { useMemo, useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import { ActionModal } from '@/features/tasks/modals/ActionModal'
import { ConditionalModal } from '@/features/tasks/modals/ConditionalModal'
import { PrelimApplicationDetailsDrawer } from '@/features/prelim/components/PrelimApplicationDetailsDrawer'
import { PrelimDashboardFilters } from '@/features/prelim/components/PrelimDashboardFilters'
import { PrelimDashboardList } from '@/features/prelim/components/PrelimDashboardList'
import { usePrelimDashboardState } from '@/features/prelim/hooks/usePrelimDashboardState'
import { TaskNotesDrawer } from '@/features/tasks/notes/TaskNotesDrawer'
import { useTaskNotesDrawerState } from '@/features/tasks/notes/useTaskNotesDrawerState'
import { useUser } from '@/context/UserContext'
import type { NoteTab, TaskNotesDrawerTabConfig } from '@/features/tasks/notes/TaskNotesDrawer'

const normalizeApplicationId = (value: unknown): number | undefined => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function PrelimDashboardContent() {
  const { username } = useUser()
  const [myMessagesActiveTab, setMyMessagesActiveTab] = useState<NoteTab>('incoming')
  const {
    q,
    status,
    applicationId,
    applications,
    isLoading,
    expandedTaskPanel,
    setExpandedTaskPanel,
    selectedId,
    setSelectedId,
    applicationDetails,
    isDetailsLoading,
    applicationDetailsError,
    updateSearch,
    handleTaskAction,
    handleCancelTask,
    showActionModal,
    setShowActionModal,
    showConditionModal,
    setShowConditionModal,
    selectedAction,
    executeAction,
  } = usePrelimDashboardState()
  const myMessages = useTaskNotesDrawerState({
    includeApplicationLists: true,
    includePrelimLists: true,
  })
  const myMessagesTabs = useMemo<TaskNotesDrawerTabConfig[]>(
    () => [
      {
        id: 'incoming',
        label: 'Direct',
        notes: myMessages.activeNotes.incoming.map((note) => ({
          ...note,
          ApplicationID: normalizeApplicationId(
            (note as any)?.ApplicationID ??
              (note as any)?.applicationId ??
              (note as any)?.ApplicationId,
          ),
        })),
        loading: myMessages.activeLoading.incoming,
        mode: 'public',
        threaded: true,
        tabClassName: 'border-sky-600 text-sky-700',
        badgeClassName: 'bg-sky-100 text-sky-700',
      },
      {
        id: 'mention',
        label: 'Mention',
        notes: myMessages.activeNotes.mention.map((note) => ({
          ...note,
          ApplicationID: normalizeApplicationId(
            (note as any)?.ApplicationID ??
              (note as any)?.applicationId ??
              (note as any)?.ApplicationId,
          ),
        })),
        loading: myMessages.activeLoading.mention,
        mode: 'public',
        threaded: true,
        tabClassName: 'border-amber-600 text-amber-700',
        badgeClassName: 'bg-amber-100 text-amber-700',
      },
      {
        id: 'private',
        label: 'Private',
        notes: myMessages.activeNotes.private.map((note) => ({
          ...note,
          ApplicationID: normalizeApplicationId(
            (note as any)?.ApplicationID ??
              (note as any)?.applicationId ??
              (note as any)?.ApplicationId,
          ),
        })),
        loading: myMessages.activeLoading.private,
        mode: 'public',
        threaded: true,
        tabClassName: 'border-blue-600 text-blue-700',
        badgeClassName: 'bg-blue-100 text-blue-700',
      },
    ],
    [myMessages.activeLoading, myMessages.activeNotes],
  )

  const handleOpenMyMessages = () => {
    setMyMessagesActiveTab('incoming')
    void myMessages.openDrawer({
      contextKey: 'prelim-dashboard-my-messages',
      taskName: username?.trim() || 'Current User',
      tab: 'incoming',
    })
  }

  const handleViewApplicationFromMyMessages = (nextApplicationId: number) => {
    myMessages.closeDrawer()
    setSelectedId(nextApplicationId)
  }

  if (isLoading) return <p>Loading...</p>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">Application Intake</h1>
        <button
          type="button"
          onClick={handleOpenMyMessages}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          title={username ? `View messages for ${username}` : 'View my messages'}
          aria-label={username ? `View messages for ${username}` : 'View my messages'}
        >
          <MessageSquareText className="h-4 w-4" />
          My Messages
        </button>
      </div>

      <PrelimDashboardFilters
        q={q}
        status={status}
        applicationId={applicationId}
        onChange={updateSearch}
      />

      <PrelimDashboardList
        applications={applications}
        expandedTaskPanel={expandedTaskPanel}
        setExpandedTaskPanel={setExpandedTaskPanel}
        onViewApplication={(externalReferenceId) =>
          setSelectedId(externalReferenceId == null ? null : Number(externalReferenceId))
        }
        handleCancelTask={handleCancelTask}
        handleTaskAction={handleTaskAction}
      />

      <PrelimApplicationDetailsDrawer
        open={selectedId !== null}
        externalReferenceId={selectedId}
        data={applicationDetails}
        isLoading={isDetailsLoading}
        error={applicationDetailsError}
        onClose={() => setSelectedId(null)}
      />

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
      <TaskNotesDrawer
        open={Boolean(myMessages.drawer)}
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
        currentUsername={myMessages.currentUsername}
        isSubmitting={myMessages.isSubmitting}
        error={myMessages.error}
        notesTitleOverride="My Messages"
        currentLabelOverride="Logged In User"
        customTabs={myMessagesTabs}
        showMyNotesThreadType
        hideComposer
        hidePrivacyToggle
        showPerNoteApplicationId
        showViewApplicationAction
        enableMessageFilters
        onApplicationIdClick={handleViewApplicationFromMyMessages}
        onViewApplicationClick={handleViewApplicationFromMyMessages}
        onIncomingNoteClick={myMessages.markIncomingNoteRead}
        markingReadMessageId={myMessages.markingReadMessageId}
        reactingMessageId={myMessages.reactingMessageId}
        onClose={myMessages.closeDrawer}
        onTabChange={setMyMessagesActiveTab}
        onComposeTextChange={() => {}}
        onComposeToUserChange={() => {}}
        onComposePrivateChange={() => {}}
        onSubmit={() => {}}
        onReplySubmit={myMessages.submitReply}
        onReactionTagChange={myMessages.updateMessageReactionTag}
      />
    </div>
  )
}
