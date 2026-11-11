import { useMutation } from '@tanstack/react-query'
import { useUser } from '@/context/UserContext'
import { submitIssueReport } from '../api/issueReports'
import type { IssueReportPayload } from '../model/issueReport'

export function useSubmitIssueReport() {
  const { token } = useUser()
  return useMutation({
    mutationFn: ({ payload, attachments }: { payload: IssueReportPayload; attachments: File[] }) =>
      submitIssueReport({ payload, attachments, token: token ?? undefined }),
  })
}
