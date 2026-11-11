import { fetchWithAuth } from '@/shared/api/httpClient'
import type { IssueReportPayload, IssueReportResult } from '../model/issueReport'

export const ISSUE_REPORT_PATH = '/report_issue'
/** Uploads can be slow; allow longer than the default request deadline. */
const ISSUE_REPORT_TIMEOUT_MS = 120_000

/** Reads `reportId` / `id` (string or number) from the server's confirmation, at the top level or in `data`. */
export function readIssueReportId(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const record = body as Record<string, unknown>
  for (const source of [record, record.data]) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue
    const candidate = (source as Record<string, unknown>).reportId ?? (source as Record<string, unknown>).id
    if ((typeof candidate === 'string' && candidate.trim()) || (typeof candidate === 'number' && Number.isFinite(candidate))) {
      return String(candidate).trim()
    }
  }
  return null
}

export function buildIssueReportFormData(payload: IssueReportPayload, attachments: File[]): FormData {
  const formData = new FormData()
  formData.append('report', JSON.stringify(payload))
  for (const file of attachments) formData.append('attachments', file, file.name)
  return formData
}

/**
 * POST /report_issue (multipart): `report` is the JSON payload, `attachments` repeats once per file.
 * The server must answer with the stored report's id; anything else is treated as not saved.
 */
export async function submitIssueReport({
  payload,
  attachments,
  token,
}: {
  payload: IssueReportPayload
  attachments: File[]
  token?: string | null
}): Promise<IssueReportResult> {
  const body = await fetchWithAuth<unknown>({
    path: ISSUE_REPORT_PATH,
    method: 'POST',
    body: buildIssueReportFormData(payload, attachments),
    token,
    timeoutMs: ISSUE_REPORT_TIMEOUT_MS,
    expectBody: (response) => readIssueReportId(response) !== null,
  })
  return { reportId: readIssueReportId(body) as string }
}
