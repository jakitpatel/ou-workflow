import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useUser } from '@/context/UserContext'
import { useApplicationDetail } from '@/features/applications/hooks/useApplicationDetail'
import { ApplicationDetailsDrawer } from '@/features/applications/components/ApplicationDetailsDrawer'
import { uploadApplicationFile } from '@/features/applications/api'
import { useConfirmTaskMutation } from '@/features/tasks/hooks/useTaskMutations'
import { resolveApiBaseUrl } from '@/shared/api/httpClient'
import { getNdaGlobalData, saveApprovedNda } from '../lib/legalReview'

type Props = {
  applicationId: string | number
  companyName: string
  taskInstanceId: string | number
  application?: unknown
  capacity?: string
  onClose: () => void
}

export function LegalReviewModal({ applicationId, companyName, taskInstanceId, application, capacity, onClose }: Props) {
  const { token, username } = useUser()
  const detail = useApplicationDetail(String(applicationId))
  const completion = useConfirmTaskMutation()
  const [file, setFile] = useState<File | null>(null)
  const [approved, setApproved] = useState<{ name: string; link: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [viewApplication, setViewApplication] = useState(false)
  const data = { ...getNdaGlobalData(application), ...getNdaGlobalData(detail.data) }
  const customerLink = typeof data.customerNDALink === 'string' ? data.customerNDALink : ''
  const customerPath = typeof data.customerNDAURL === 'string' ? data.customerNDAURL : ''
  const documentUrl = (link: string) => {
    if (/^https?:\/\//i.test(link)) return link
    if (!link.startsWith('/') || link.startsWith('//')) return ''
    return `${resolveApiBaseUrl().replace(/\/api\/?$/, '')}${link}`
  }
  const customerUrl = documentUrl(customerLink) || documentUrl(customerPath)
  const upload = async () => {
    if (!file) return
    setBusy(true); setError(''); setApproved(null)
    try {
      const uploaded: unknown = await uploadApplicationFile({ file, applicationId, taskInstanceID: taskInstanceId,
        description: 'Legal approved NDA', token })
      await saveApprovedNda({ applicationId: Number(applicationId), taskInstanceId: Number(taskInstanceId),
        fileName: file.name, uploaded, token })
      setApproved({ name: file.name, link: (uploaded as { link: string }).link })
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save the signed NDA.') }
    finally { setBusy(false) }
  }
  
  const approve = async () => {
    if (!approved || busy) return
    setBusy(true); setError('')
    try {
      await completion.mutateAsync({ taskId: String(taskInstanceId), applicationId, token: token ?? undefined,
        username: username ?? undefined, capacity, result: 'yes', completionNotes: 'NDA signed off by Legal' })
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to approve the NDA.') }
    finally { setBusy(false) }
  }
  return <>
    <Dialog open={!viewApplication} onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-xl font-semibold">{companyName} · App #{applicationId}</DialogTitle>
        <DialogDescription>Legal Review · Review and sign off on the NDA.</DialogDescription>
        <div className="flex justify-end"><button className="text-blue-700 underline" onClick={() => setViewApplication(true)}>View Application</button></div>
        <section className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold">Customer NDA uploaded by NCRC</h3>
          {detail.isLoading ? <p role="status">Loading NDA...</p> : detail.isError ?
            <p role="alert">Unable to load the NDA. <button className="underline" onClick={() => void detail.refetch()}>Retry</button></p> :
            customerUrl ? <a className="text-blue-700 underline" href={customerUrl} target="_blank" rel="noreferrer">View or download customer NDA</a> :
              <p>No customer NDA is available.</p>}
        </section>
        <section className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold">Upload a signed or updated NDA</h3>
          <p className="text-sm text-gray-600">Upload the countersigned NDA or a version with text updates before signing off.</p>
          <label className="block">Signed NDA file<input className="mt-2 block w-full" type="file" disabled={busy}
            onChange={(event) => { setFile(event.target.files?.[0] ?? null); setApproved(null); setError('') }} /></label>
          <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" disabled={!file || busy} onClick={() => void upload()}>{busy ? 'Saving...' : 'Upload NDA'}</button>
          {approved && <p role="status">Saved: <a className="text-blue-700 underline" href={documentUrl(approved.link)} target="_blank" rel="noreferrer">{approved.name}</a></p>}
        </section>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <div className="flex justify-end gap-3">
          <button disabled={busy} onClick={onClose}>Cancel</button>
          <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" disabled={!approved || busy} onClick={() => void approve()}>Approve &amp; Sign off NDA</button>
        </div>
      </DialogContent>
    </Dialog>
    <ApplicationDetailsDrawer open={viewApplication} applicationId={String(applicationId)} onClose={() => setViewApplication(false)} />
  </>
}
