import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createApplicationMessage,
  fetchApplicationMessages,
  generateContractPackage as postGenerateContractPackage,
  generateInspectionInvoice,
  updateApplicationMessage,
  uploadApplicationFile,
  type ApplicationMessagePayload,
  type GenerateContractPackagePayload,
  type GenerateContractPackageResponse,
  type GenerateInspectionInvoiceResponse,
} from '@/features/applications/api'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { assignTask, patchTaskResult } from '@/features/tasks/api'
import { useUser } from '@/context/UserContext'
import { resolveApiBaseUrl } from '@/shared/api/httpClient'
import { queryOptionDefaults } from '@/shared/api/queryOptions'
import { buildHtmlEmailFromPlainText } from '@/shared/email/htmlEmail'
import type { Applicant } from '@/types/application'

const RC_NOTIFICATION_SUBJECT = 'OU Kosher - You have been selected to be the RC'

const getWorkflowBaseUrl = () => resolveApiBaseUrl().replace(/\/api\/?$/i, '').replace(/\/$/, '')

const getAppBasePath = () => {
  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  return basePath && basePath !== '/' ? basePath : ''
}

const normalizeApplicationId = (applicationId: string | number) => {
  const value = String(applicationId).trim()
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && value !== '' ? numericValue : value
}

const normalizeNumericApplicationId = (applicationId: string | number) => {
  const value = String(applicationId).trim()
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && value !== '' ? numericValue : null
}

const buildApplicationReviewUrl = (applicationId: string | number) => {
  const params = new URLSearchParams({
    q: '',
    status: 'all',
    priority: 'all',
    page: '0',
    myOnly: 'true',
    applicationId: String(applicationId),
  })

  const appPath = `${getAppBasePath()}/ou-workflow/ncrc-dashboard?${params.toString()}`

  if (typeof window !== 'undefined') {
    return new URL(appPath, window.location.origin).toString()
  }

  return `${getWorkflowBaseUrl()}${appPath}`
}

type NotifyRcForApprovalParams = {
  applicationId?: string | number
  companyName: string
  rcUserName?: string
  taskInstanceId?: string | number
}

type AssignContractRcParams = {
  applicationId?: string | number
  assignee?: string
  taskInstanceId?: string | number
}

type GenerateContractInvoiceParams = {
  applicationId?: string | number
  applicationName?: string
  taskInstanceId?: string | number
  taskName?: string
  applicant?: Partial<Applicant>
  fee: number
  invoiceDate: string
  internalNotes?: string
  recipient?: string
}

type GenerateContractPackageParams = {
  payload: GenerateContractPackagePayload
}

type SendContractPackageEmailParams = {
  applicationId?: string | number
  attachments?: string
  body: string
  ccUser?: string
  companyName: string
  fromUser?: string
  subject: string
  taskInstanceId?: string | number
  toUser?: string
}

export type SendContractCommunicationEmailInput = SendContractPackageEmailParams

type UploadContractEmailAttachmentParams = {
  applicationId?: string | number
  file: File
  taskInstanceId?: string | number
}

type UploadedContractEmailAttachment = {
  fileName: string
  fileUrl: string
  raw: unknown
}

type SaveContractStageStateParams = {
  guiDisplayResult?: string
  savedState: unknown
  taskInstanceId?: string | number
}

const readStringFromRecord = (record: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = record[key]
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

const normalizeUploadedContractAttachment = (
  response: unknown,
  fallbackFileName: string,
): UploadedContractEmailAttachment => {
  const responseRecord =
    response && typeof response === 'object' && !Array.isArray(response)
      ? (response as Record<string, unknown>)
      : {}
  const data =
    responseRecord.data && typeof responseRecord.data === 'object' && !Array.isArray(responseRecord.data)
      ? (responseRecord.data as Record<string, unknown>)
      : responseRecord
  const attributes =
    data.attributes && typeof data.attributes === 'object' && !Array.isArray(data.attributes)
      ? (data.attributes as Record<string, unknown>)
      : {}
  const source = { ...data, ...attributes }

  return {
    fileName:
      readStringFromRecord(source, ['FileName', 'fileName', 'filename', 'name', 'originalName']) ||
      fallbackFileName,
    fileUrl: readStringFromRecord(source, [
      'FilePath',
      'filePath',
      'file_url',
      'fileUrl',
      'downloadUrl',
      'download_url',
      'url',
    ]),
    raw: response,
  }
}

const getCreatedMessageId = (response: unknown) => {
  const data = response && typeof response === 'object' && 'data' in response
    ? (response as { data?: unknown }).data
    : undefined
  const attributes = data && typeof data === 'object' && 'attributes' in data
    ? (data as { attributes?: Record<string, unknown> }).attributes
    : undefined
  const dataId = data && typeof data === 'object' && 'id' in data ? (data as { id?: unknown }).id : undefined

  return String(attributes?.MessageID ?? dataId ?? '').trim()
}

const addRefMessageIdToSubject = (subject: string, messageId: string) => {
  const cleanSubject = subject.replace(/,\s*refMessageId:\s*#?\d+/i, '').replace(/,\s*refMsgId:\s*#?\d+/i, '')
  const roundMatch = cleanSubject.match(/,\s*Round\s+\d+\)?/i)
  if (roundMatch?.index === undefined) return `${cleanSubject} (refMessageId: #${messageId})`

  return `${cleanSubject.slice(0, roundMatch.index)}, refMessageId: #${messageId}${cleanSubject.slice(roundMatch.index)}`
}

export function useContractCommunicationMessages({
  applicationId,
  taskInstanceId,
}: {
  applicationId?: string | number
  taskInstanceId?: string | number | null
}) {
  const { token } = useUser()
  const normalizedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)
  const normalizedTaskInstanceId =
    taskInstanceId === undefined || taskInstanceId === null ? undefined : String(taskInstanceId)

  return useQuery({
    queryKey: applicationsQueryKeys.contractMessages(normalizedApplicationId, normalizedTaskInstanceId),
    queryFn: () =>
      fetchApplicationMessages({
        applicationId: normalizedApplicationId,
        taskInstanceId: normalizedTaskInstanceId,
        token: token ?? undefined,
      }),
    enabled: !!token && !!normalizedApplicationId,
    ...queryOptionDefaults.applicationScheduleAIngredients,
  })
}

export function useSendContractCommunicationEmail() {
  const { token, username } = useUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      applicationId,
      attachments,
      body,
      ccUser,
      companyName,
      fromUser,
      subject,
      taskInstanceId,
      toUser,
    }: SendContractCommunicationEmailInput) => {
      if (applicationId === undefined || applicationId === null || String(applicationId).trim() === '') {
        throw new Error('Application id is required before sending the contract email.')
      }

      if (!body.trim()) {
        throw new Error('Cover letter body is required before sending the contract email.')
      }

      const email = buildHtmlEmailFromPlainText(body, {
        title: subject,
        preheader: `Contract package for ${companyName}`,
      })

      const createResponse = await createApplicationMessage({
        payload: {
          MessageID: null,
          ApplicationID: normalizeApplicationId(applicationId),
          FromUser: fromUser || username || null,
          ToUser: toUser || null,
          CCUser: ccUser || null,
          Subject: subject,
          MessageText: email.html,
          MessageTextPlain: email.text,
          PlainText: email.text,
          Text: email.text,
          MessageType: 'Email-Staging',
          Priority: 'NORMAL',
          SentDate: new Date().toISOString(),
          TemplateName: 'contract-package',
          TaskInstanceId: taskInstanceId ?? null,
          isPrivate: false,
          parentMessageId: null,
          toReply: null,
          isRead: false,
          tag: null,
          BCCUser: 'productAutomation@ou.org',
          replyTo: 'oucert@ou.org',
          Attachments: attachments || null,
        },
        token: token ?? undefined,
      })

      const messageId = getCreatedMessageId(createResponse)
      if (!messageId) {
        throw new Error('Email was staged, but the response did not include a MessageID.')
      }

      return await updateApplicationMessage({
        messageId,
        token: token ?? undefined,
        payload: {
          MessageID: messageId,
          MessageType: 'Email',
          Subject: addRefMessageIdToSubject(subject, messageId),
        },
      })
    },
    onSuccess: async (_data, variables) => {
      const normalizedApplicationId =
        variables.applicationId === undefined || variables.applicationId === null
          ? undefined
          : String(variables.applicationId).trim()
      const normalizedTaskInstanceId =
        variables.taskInstanceId === undefined || variables.taskInstanceId === null
          ? undefined
          : String(variables.taskInstanceId).trim()

      await queryClient.invalidateQueries({
        queryKey: applicationsQueryKeys.contractMessages(normalizedApplicationId, normalizedTaskInstanceId),
      })
    },
  })
}

export function useContractRcNotification({
  token,
  username,
}: {
  token?: string | null
  username?: string | null
}) {
  const [isSendingRcNotification, setIsSendingRcNotification] = useState(false)
  const [isAssigningContractRc, setIsAssigningContractRc] = useState(false)
  const [isGeneratingContractInvoice, setIsGeneratingContractInvoice] = useState(false)
  const [isGeneratingContractPackage, setIsGeneratingContractPackage] = useState(false)
  const [isSendingContractEmail, setIsSendingContractEmail] = useState(false)
  const [isUploadingContractAttachment, setIsUploadingContractAttachment] = useState(false)

  const saveContractStageState = async ({
    guiDisplayResult,
    savedState,
    taskInstanceId,
  }: SaveContractStageStateParams) => {
    if (taskInstanceId === undefined || taskInstanceId === null || String(taskInstanceId).trim() === '') {
      return
    }

    await patchTaskResult({
      taskId: String(taskInstanceId).trim(),
      result: { savedState },
      guiDisplayResult,
      token: token ?? undefined,
    })
  }

  const assignContractRcToCompany = async ({
    applicationId,
    assignee,
    taskInstanceId,
  }: AssignContractRcParams) => {
    if (applicationId === undefined || applicationId === null || String(applicationId).trim() === '') {
      throw new Error('Application id is required before assigning the RC.')
    }

    const appId = normalizeNumericApplicationId(applicationId)
    if (appId === null) {
      throw new Error('A numeric application id is required before assigning the RC.')
    }

    if (taskInstanceId === undefined || taskInstanceId === null || String(taskInstanceId).trim() === '') {
      throw new Error('Task instance id is required before assigning the RC.')
    }

    if (!assignee?.trim()) {
      throw new Error('Select an RC before assigning the role.')
    }

    setIsAssigningContractRc(true)
    try {
      await assignTask({
        appId,
        taskId: String(taskInstanceId).trim(),
        role: 'RC',
        assignee: assignee.trim(),
        capacity: 'DESIGNATED',
        token: token ?? undefined,
      })
    } finally {
      setIsAssigningContractRc(false)
    }
  }

  const notifyRcForApproval = async ({
    applicationId,
    companyName,
    rcUserName,
    taskInstanceId,
  }: NotifyRcForApprovalParams) => {
    if (applicationId === undefined || applicationId === null || String(applicationId).trim() === '') {
      throw new Error('Application id is required before notifying the RC.')
    }

    if (!rcUserName?.trim()) {
      throw new Error('Select an RC with a username before notifying for approval.')
    }

    const reviewUrl = buildApplicationReviewUrl(applicationId)
    const messageTextPlain = `Dear RC,
You have been selected to be the RC for ${companyName}

please review the following application

${reviewUrl}


thank you

NCRC
${username ?? ''}`
    const htmlEmail = buildHtmlEmailFromPlainText(messageTextPlain, {
      title: RC_NOTIFICATION_SUBJECT,
      preheader: `RC assignment for ${companyName}`,
    })
    const payload: ApplicationMessagePayload = {
      ApplicationID: normalizeApplicationId(applicationId),
      FromUser: username ?? '',
      ToUser: rcUserName.trim(),
      Subject: RC_NOTIFICATION_SUBJECT,
      MessageText: htmlEmail.text,
      MessageTextPlain: htmlEmail.text,
      MessageType: 'Text',
      Priority: 'NORMAL',
      SentDate: new Date().toISOString(),
      TemplateName: 'initial-inspection',
      TaskInstanceId: taskInstanceId ?? null,
      isPrivate: true,
      BCCUser: 'productAutomation@ou.org',
    }

    setIsSendingRcNotification(true)
    try {
      await createApplicationMessage({
        payload,
        token: token ?? undefined,
      })
    } finally {
      setIsSendingRcNotification(false)
    }
  }

  const generateContractInvoice = async ({
    applicationId,
    applicationName,
    taskInstanceId,
    taskName,
    applicant,
    fee,
    invoiceDate,
    internalNotes,
    recipient,
  }: GenerateContractInvoiceParams): Promise<GenerateInspectionInvoiceResponse> => {
    if (applicationId === undefined || applicationId === null || String(applicationId).trim() === '') {
      throw new Error('Application id is required before generating the invoice.')
    }

    if (!Number.isFinite(fee) || fee <= 0) {
      throw new Error('Enter the annual certification fee before generating the invoice.')
    }

    if (!invoiceDate.trim()) {
      throw new Error('Effective date is required before generating the invoice.')
    }

    setIsGeneratingContractInvoice(true)
    try {
      return await generateInspectionInvoice({
        payload: {
          applicationId,
          applicationName,
          TaskInstanceId: taskInstanceId ?? null,
          taskName,
          applicant,
          invoiceType: 'subscription',
          inspectionNeeded: false,
          feeRequired: true,
          awaitPayment: true,
          rfr: null,
          fee,
          expense: 0,
          invoiceDate,
          internalNotes,
          recipient,
          letterTemplate: 'contract-invoice',
        },
        token: token ?? undefined,
      })
    } finally {
      setIsGeneratingContractInvoice(false)
    }
  }

  const generateContractPackage = async ({
    payload,
  }: GenerateContractPackageParams): Promise<GenerateContractPackageResponse> => {
    if (payload.applicationId === undefined || payload.applicationId === null || String(payload.applicationId).trim() === '') {
      throw new Error('Application id is required before generating the contract package.')
    }

    setIsGeneratingContractPackage(true)
    try {
      return await postGenerateContractPackage({
        payload,
        token: token ?? undefined,
      })
    } finally {
      setIsGeneratingContractPackage(false)
    }
  }

  const sendContractPackageEmail = async ({
    applicationId,
    attachments,
    body,
    ccUser,
    companyName,
    fromUser,
    subject,
    taskInstanceId,
    toUser,
  }: SendContractPackageEmailParams) => {
    if (applicationId === undefined || applicationId === null || String(applicationId).trim() === '') {
      throw new Error('Application id is required before sending the contract email.')
    }

    if (!body.trim()) {
      throw new Error('Cover letter body is required before sending the contract email.')
    }

    const email = buildHtmlEmailFromPlainText(body, {
      title: subject,
      preheader: `Contract package for ${companyName}`,
    })

    const payload: ApplicationMessagePayload = {
      MessageID: null,
      ApplicationID: normalizeApplicationId(applicationId),
      FromUser: fromUser || username || null,
      ToUser: toUser || null,
      CCUser: ccUser || null,
      Subject: subject,
      MessageText: email.html,
      MessageTextPlain: email.text,
      PlainText: email.text,
      Text: email.text,
      MessageType: 'Email',
      Priority: 'NORMAL',
      SentDate: new Date().toISOString(),
      TemplateName: 'contract-package',
      TaskInstanceId: taskInstanceId ?? null,
      isPrivate: false,
      parentMessageId: null,
      toReply: null,
      isRead: false,
      tag: null,
      BCCUser: 'productAutomation@ou.org',
      replyTo: 'oucert@ou.org',
      Attachments: attachments || null,
    }

    setIsSendingContractEmail(true)
    try {
      await createApplicationMessage({
        payload,
        token: token ?? undefined,
      })
    } finally {
      setIsSendingContractEmail(false)
    }
  }

  const uploadContractEmailAttachment = async ({
    applicationId,
    file,
    taskInstanceId,
  }: UploadContractEmailAttachmentParams): Promise<UploadedContractEmailAttachment> => {
    if (applicationId === undefined || applicationId === null || String(applicationId).trim() === '') {
      throw new Error('Application id is required before uploading an attachment.')
    }

    setIsUploadingContractAttachment(true)
    try {
      const response = await uploadApplicationFile({
        file,
        applicationId,
        taskInstanceID: taskInstanceId ?? null,
        description: 'Contract package email attachment',
        token: token ?? undefined,
      })
      return normalizeUploadedContractAttachment(response, file.name)
    } finally {
      setIsUploadingContractAttachment(false)
    }
  }

  return {
    assignContractRcToCompany,
    generateContractPackage,
    generateContractInvoice,
    isAssigningContractRc,
    isGeneratingContractPackage,
    isGeneratingContractInvoice,
    isSendingContractEmail,
    isSendingRcNotification,
    isUploadingContractAttachment,
    notifyRcForApproval,
    saveContractStageState,
    sendContractPackageEmail,
    uploadContractEmailAttachment,
  }
}
