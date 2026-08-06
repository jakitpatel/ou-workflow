import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createApplicationMessage, fetchApplicationDetail } from '@/features/applications/api'
import { refreshApplicationInListCaches } from '@/features/applications/cache/applicationListCache'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { useUser } from '@/context/UserContext'
import { confirmTask, patchTaskResult } from '@/features/tasks/api'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'
import { buildHtmlEmailFromPlainText } from '@/shared/email/htmlEmail'
import type { Applicant, CompanyContact, CompanyContactGroups, Task } from '@/types/application'

export type CertificationStage = 'waiting' | 'welcome-email' | 'certified'
export type CertificationTemplate = 'new' | 'existing'

type CertificationSavedState = {
  version: 1
  stage: CertificationStage
  bichel?: { receivedAt?: string; from?: string; to?: string }
  welcomeEmail?: {
    template: CertificationTemplate
    to: string
    cc: string
    subject: string
    body: string
    attachments: string[]
    sentAt?: string
  }
}

const normalizeText = (value: unknown) => String(value ?? '').trim()

const normalizeContacts = (
  contacts?: CompanyContact[] | CompanyContactGroups,
): CompanyContact[] => {
  if (!contacts) return []
  if (Array.isArray(contacts)) return contacts
  return [
    ...(contacts.primaryContact ?? contacts.PrimaryContact ?? []),
    ...(contacts.billingContact ?? contacts.BillingContact ?? []),
    ...(contacts.otherContact ?? contacts.OtherContact ?? []),
  ]
}

const parseSavedState = (task?: Task): CertificationSavedState | null => {
  let value: unknown =
    (task as any)?.StatusDetails ??
    (task as any)?.statusDetails ??
    (task as any)?.Result ??
    (task as any)?.result
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const savedState = (record.savedState ?? record) as Partial<CertificationSavedState>
  return savedState.version === 1 && savedState.stage
    ? (savedState as CertificationSavedState)
    : null
}

const buildMessage = (
  template: CertificationTemplate,
  company: string,
  plant: string,
  contactName: string,
) => {
  if (template === 'existing') {
    return {
      subject: `OU Kosher Certification - ${plant}`,
      body: `Dear ${contactName},\n\nYour new plant ${plant} has been added to ${company}'s existing OU certification and is now certified. The updated Letter of Certification (LOC) is attached and is also available in the OUDirect portal under your existing account.\n\nA few reminders:\n• The new plant now appears alongside your other certified plants in OUDirect.\n• Any new products or ingredients at this plant must be approved before being produced under the OU.\n• Your Rabbinic Coordinator is your point of contact for any questions.\n\nThank you for continuing to work with OU Kosher.`,
    }
  }
  return {
    subject: `Welcome to OU Kosher - ${company}`,
    body: `Dear ${contactName},\n\nCongratulations - ${company} and its plant ${plant} are now certified by OU Kosher. Welcome to OU Kosher. Your Letter of Certification (LOC) is attached and is also available in the OUDirect portal.\n\nA few things to know as you get started:\n• Your certification and kosher documentation are available anytime at https://oudirect.org.\n• Any new products or ingredients must be approved before being produced under the OU.\n• Your Rabbinic Coordinator is your point of contact for any questions.\n\nWe look forward to working with you.`,
  }
}

export function useCertificationStageDrawerState({
  applicant,
  task,
  enabled,
}: {
  applicant?: Applicant
  task?: Task
  enabled: boolean
}) {
  const { token, username } = useUser()
  const queryClient = useQueryClient()
  const applicationId = String(applicant?.applicationId ?? '').trim()
  const taskId = String((task as any)?.TaskInstanceId ?? (task as any)?.taskInstanceId ?? '').trim()
  const savedState = useMemo(() => parseSavedState(task), [task])
  const detailQuery = useQuery({
    queryKey: applicationsQueryKeys.detail(applicationId),
    queryFn: () => fetchApplicationDetail({ applicationId, token }),
    enabled: enabled && Boolean(applicationId) && Boolean(token),
  })
  const contacts = useMemo(
    () => normalizeContacts(detailQuery.data?.companyContacts),
    [detailQuery.data?.companyContacts],
  )
  const preferredContact =
    contacts.find((contact) => /billing/i.test(`${contact.type} ${contact.role ?? ''}`)) ??
    contacts.find((contact) => /primary/i.test(`${contact.type} ${contact.role ?? ''}`)) ??
    contacts[0]
  const company = applicant?.company || 'Company'
  const plant = applicant?.plant || 'Plant'
  const contactName = normalizeText(preferredContact?.name) || 'Customer'
  const defaultTemplate = savedState?.welcomeEmail?.template ?? 'new'
  const defaultMessage = buildMessage(defaultTemplate, company, plant, contactName)

  const [stage, setStage] = useState<CertificationStage>(savedState?.stage ?? 'waiting')
  const [bichelReceivedAt, setBichelReceivedAt] = useState(savedState?.bichel?.receivedAt ?? '')
  const [template, setTemplate] = useState<CertificationTemplate>(defaultTemplate)
  const [to, setTo] = useState(
    savedState?.welcomeEmail?.to ?? normalizeText(preferredContact?.email),
  )
  const [cc, setCc] = useState(savedState?.welcomeEmail?.cc ?? '')
  const [subject, setSubject] = useState(
    savedState?.welcomeEmail?.subject ?? defaultMessage.subject,
  )
  const [body, setBody] = useState(savedState?.welcomeEmail?.body ?? defaultMessage.body)
  const [attachments, setAttachments] = useState<string[]>(
    savedState?.welcomeEmail?.attachments ?? ['Letter of Certification.pdf'],
  )
  const [sentAt, setSentAt] = useState(savedState?.welcomeEmail?.sentAt ?? '')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (savedState?.welcomeEmail || !preferredContact) return
    const nextContactName = normalizeText(preferredContact.name) || 'Customer'
    const nextMessage = buildMessage(template, company, plant, nextContactName)
    setTo((current) => current || normalizeText(preferredContact.email))
    setSubject(nextMessage.subject)
    setBody(nextMessage.body)
  }, [company, plant, preferredContact, savedState?.welcomeEmail, template])

  const buildSavedState = (
    next: Partial<CertificationSavedState> = {},
  ): CertificationSavedState => ({
    version: 1,
    stage: next.stage ?? stage,
    bichel: next.bichel ?? {
      receivedAt: bichelReceivedAt || undefined,
      from: 'Kashrus',
      to: 'productAutomation@ou.org',
    },
    welcomeEmail: next.welcomeEmail ?? {
      template,
      to,
      cc,
      subject,
      body,
      attachments,
      sentAt: sentAt || undefined,
    },
  })

  const persist = async (next: CertificationSavedState) => {
    if (!taskId) throw new Error('Certificate task instance id not found')
    await patchTaskResult({
      taskId,
      result: { savedState: next },
      guiDisplayResult:
        next.stage === 'certified'
          ? '{Certified}'
          : next.stage === 'welcome-email'
            ? '{Bichel Email Received}'
            : '{Waiting for Bichel}',
      token,
    })
  }

  const recordBichelReceived = async () => {
    setIsSaving(true)
    try {
      const receivedAt = new Date().toLocaleString()
      const next = buildSavedState({
        stage: 'welcome-email',
        bichel: { receivedAt, from: 'Kashrus', to: 'productAutomation@ou.org' },
      })
      await persist(next)
      setBichelReceivedAt(receivedAt)
      setStage('welcome-email')
    } finally {
      setIsSaving(false)
    }
  }

  const selectTemplate = (value: CertificationTemplate) => {
    const message = buildMessage(value, company, plant, contactName)
    setTemplate(value)
    setSubject(message.subject)
    setBody(message.body)
  }

  const sendWelcomeEmail = async () => {
    if (!to.trim()) throw new Error('A welcome email recipient is required')
    if (!taskId) throw new Error('Certificate task instance id not found')
    setIsSaving(true)
    try {
      const email = buildHtmlEmailFromPlainText(body, {
        title: 'Welcome to OU Kosher',
        preheader: subject,
      })
      const recipientList = [
        to.trim(),
        ...cc
          .split(/[,;\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
      ]
      await createApplicationMessage({
        payload: {
          MessageID: null,
          ApplicationID: applicant?.applicationId ?? null,
          FromUser: username ?? null,
          ToUser: recipientList.join(', '),
          Subject: subject,
          MessageText: email.html,
          MessageTextPlain: email.text,
          PlainText: email.text,
          Text: email.text,
          MessageType: 'Email',
          Priority: 'NORMAL',
          SentDate: new Date().toISOString(),
          TemplateName:
            template === 'new' ? 'certification-new-company' : 'certification-existing-company',
          TaskInstanceId: taskId,
          isPrivate: false,
          parentMessageId: null,
          toReply: null,
          isRead: false,
          tag: 'Welcome',
          CCUser: cc || null,
          BCCUser: 'productAutomation@ou.org',
          Attachments: attachments.join(', ') || null,
        },
        token,
      })
      const nextSentAt = new Date().toLocaleString()
      const next = buildSavedState({
        stage: 'certified',
        welcomeEmail: { template, to, cc, subject, body, attachments, sentAt: nextSentAt },
      })
      await persist(next)
      await confirmTask({
        taskId,
        applicationId: applicant?.applicationId,
        result: 'Certified',
        capacity: task?.capacity ?? 'DESIGNATED',
        token,
        username: username ?? undefined,
      })
      setSentAt(nextSentAt)
      setStage('certified')
      await Promise.all([
        refreshApplicationInListCaches({ applicationId, queryClient, token }).then((refreshed) =>
          refreshed
            ? undefined
            : queryClient.invalidateQueries({ queryKey: applicationsQueryKeys.lists() }),
        ),
        queryClient.invalidateQueries({ queryKey: tasksQueryKeys.lists() }),
      ])
    } finally {
      setIsSaving(false)
    }
  }

  return {
    applicationId,
    attachments,
    bichelReceivedAt,
    body,
    cc,
    contactName,
    detailError: detailQuery.isError,
    detailLoading: detailQuery.isLoading,
    isSaving,
    sentAt,
    stage,
    subject,
    template,
    to,
    recordBichelReceived,
    selectTemplate,
    sendWelcomeEmail,
    setAttachments,
    setBody,
    setCc,
    setSubject,
    setTo,
  }
}
