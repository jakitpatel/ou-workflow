import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { useUser } from '@/context/UserContext'
import { assignApplicationRc } from '@/features/applications/api/assignApplicationRc'
import { notifyAssignedRc } from '@/features/applications/lib/notifyAssignedRc'
import { refreshApplicationInListCaches } from '@/features/applications/cache/applicationListCache'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { useUserListByRole } from '@/features/tasks/hooks/useTaskQueries'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'
import { COMPLETED_STATUSES, normalizeStatus } from '@/lib/utils/taskHelpers'
import type { Applicant } from '@/types/application'

export function ApplicantAssignedRc({ applicant }: { applicant: Applicant }) {
  const { token, username, email, role, roles, delegated } = useUser()
  const queryClient = useQueryClient()
  const [pendingAssignee, setPendingAssignee] = useState<string | null>(null)
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const selectRef = useRef<HTMLSelectElement>(null)
  const isNcrc = role?.toUpperCase() === 'NCRC' ||
    (role?.toUpperCase() === 'ALL' && roles?.some((item) => item.name.toUpperCase() === 'NCRC'))
  const isAssignedNcrc = Boolean(username?.trim()) && (applicant.assignedRoles ?? []).some(
    (assigned) => Object.entries(assigned).some(([key, value]) =>
      key.toUpperCase() === 'NCRC' && typeof value === 'string' &&
      value.trim().toLowerCase() === username?.trim().toLowerCase(),
    ),
  )
  const delegatedNames = (delegated ?? []).map((item) => item.name.trim().toLowerCase())
  const isAssistantToAssignedNcrc = (applicant.assignedRoles ?? []).some(
    (assigned) => Object.entries(assigned).some(([key, value]) =>
      key.toUpperCase() === 'NCRC' && typeof value === 'string' &&
      Boolean(value.trim()) && delegatedNames.includes(value.trim().toLowerCase()),
    ),
  )
  const isApplicationClosed = COMPLETED_STATUSES.includes(normalizeStatus(applicant.status))
  const appId = Number(applicant.applicationId)
  const canEdit = Boolean(token && isNcrc && (isAssignedNcrc || isAssistantToAssignedNcrc) &&
    !isApplicationClosed &&
    applicant.isNewCompany === true && Number.isFinite(appId) && appId > 0)
  const lookup = useUserListByRole('api/vSelectRC', { enabled: canEdit })
  const options = (lookup.data ?? []).filter((item) => item.isActive !== false && item.assigneeValue)
  const companyRc = applicant.companyRC?.trim() || 'Unassigned'
  const currentOption = options.find((item) =>
    [item.assigneeValue, item.name].some((value) => value.toLowerCase() === companyRc.toLowerCase()),
  )
  const mutation = useMutation({
    mutationFn: (assignee: string) => {
      setNotificationError(null)
      if (!canEdit || !options.some((item) => item.assigneeValue === assignee)) {
        throw new Error('You cannot assign this RC.')
      }
      return assignApplicationRc({ appId, assignee, token })
    },
    onSuccess: async (_response, assignee) => {
      try {
        await notifyAssignedRc({
          applicationId: appId,
          fromUser: email || username,
          toUser: options.find((item) => item.assigneeValue === assignee)?.email,
          token,
        })
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unable to send notification.'
        setNotificationError(`RC assigned, but the notification failed: ${detail}`)
      }
      try {
        const refreshed = await refreshApplicationInListCaches({
          applicationId: applicant.applicationId, queryClient, token,
        })
        if (!refreshed) await queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() })
      } catch {
        await queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() })
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.detail(String(applicant.applicationId)) }),
        queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() }),
      ])
    },
  })

  return (
    <div className="mt-1 text-xs text-gray-600">
      <span className="font-medium text-gray-500">Company RC:</span>{' '}
      {notificationError && <p role="alert" className="mt-1 text-red-600">{notificationError}</p>}
      {canEdit ? (
        <>
          <select
            ref={selectRef}
            aria-label={`Company RC for ${applicant.company || applicant.applicationId}`}
            value={currentOption?.assigneeValue ?? ''}
            disabled={lookup.isLoading || lookup.isError || mutation.isPending}
            onChange={(event) => {
              if (event.target.value && event.target.value !== currentOption?.assigneeValue) {
                setPendingAssignee(event.target.value)
              }
            }}
            className="max-w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-800 disabled:bg-gray-50"
          >
            {!currentOption && <option value="">{companyRc}</option>}
            {options.map((item) => (
              <option key={item.lookupKey} value={item.assigneeValue}>{item.name}</option>
            ))}
          </select>
          <Dialog
            open={pendingAssignee !== null}
            onOpenChange={(open) => { if (!open) setPendingAssignee(null) }}
          >
            <DialogContent onCloseAutoFocus={(event) => {
              event.preventDefault()
              selectRef.current?.focus()
            }}>
              <DialogTitle className="text-lg font-semibold">Assign Company RC</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Are you sure you want to assign RC{' '}
                <span className="font-semibold">{options.find((item) => item.assigneeValue === pendingAssignee)?.name}</span>
                {' '}to {applicant.company || `application ${applicant.applicationId}`}?
              </DialogDescription>
              <DialogFooter>
                <button type="button" className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                  onClick={() => setPendingAssignee(null)}>No</button>
                <button type="button" className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  disabled={mutation.isPending || !canEdit}
                  onClick={() => {
                    if (!pendingAssignee || mutation.isPending) return
                    mutation.mutate(pendingAssignee)
                    setPendingAssignee(null)
                  }}>Yes</button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {mutation.isPending && <span role="status" className="ml-2">Saving...</span>}
          {lookup.isError && (
            <span role="alert" className="ml-2 text-red-600">
              Unable to load RCs. <button type="button" className="underline" onClick={() => void lookup.refetch()}>Retry</button>
            </span>
          )}
          {mutation.isError && <p role="alert" className="mt-1 text-red-600">Unable to save RC. Please try again.</p>}
        </>
      ) : <span className="font-semibold text-gray-800">{companyRc}</span>}
    </div>
  )
}
