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
import { PageShell } from '@/components/layout/PageShell'

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
    paginationMode,
    page,
    totalCount,
    totalPages,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    sentinelRef,
    handleFirst,
    handlePrev,
    handleNext,
    handleLast,
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
  const selectedApplicant = useMemo(
    () =>
      applications.find(
        (application) => String(application.externalReferenceId ?? '') === String(selectedId ?? ''),
      ),
    [applications, selectedId],
  )
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

  if (isLoading) {
    return (
      <PageShell>
        <p className="py-6">Loading...</p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="space-y-4 py-6">
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

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
            Error loading applications: {(error as Error).message}
          </div>
        )}

        {paginationMode === 'paged' && !isError && (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <span className="text-sm text-gray-600">
              Showing {totalCount === 0 ? 0 : page + 1}-{Math.min(page + 5, totalCount)} of{' '}
              {totalCount} applications
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleFirst}
                disabled={page === 0}
                className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                First
              </button>
              <button
                onClick={handlePrev}
                disabled={page === 0}
                className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-2 text-sm">
                Page {totalPages === 0 ? 0 : Math.floor(page / 5) + 1} of {totalPages}
              </span>
              <button
                onClick={handleNext}
                disabled={page + 5 >= totalCount}
                className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
              <button
                onClick={handleLast}
                disabled={page + 5 >= totalCount}
                className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Last
              </button>
            </div>
          </div>
        )}

        <PrelimDashboardList
          applications={applications}
          expandedTaskPanel={expandedTaskPanel}
          setExpandedTaskPanel={setExpandedTaskPanel}
          onViewApplication={(externalReferenceId) =>
            setSelectedId(externalReferenceId == null ? null : Number(externalReferenceId))
          }
          handleCancelTask={handleCancelTask}
          handleTaskAction={handleTaskAction}
          paginationMode={paginationMode}
          hasNextPage={Boolean(hasNextPage)}
          isFetchingNextPage={isFetchingNextPage}
          sentinelRef={sentinelRef}
        />

        <PrelimApplicationDetailsDrawer
          open={selectedId !== null}
          externalReferenceId={selectedId}
          applicant={selectedApplicant}
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
    </PageShell>
  )
}
