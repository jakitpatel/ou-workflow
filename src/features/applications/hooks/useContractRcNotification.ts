import { useState } from 'react'
import {
  createApplicationMessage,
  generateContractPackage as postGenerateContractPackage,
  generateInspectionInvoice,
  type ApplicationMessagePayload,
  type GenerateContractPackagePayload,
  type GenerateContractPackageResponse,
  type GenerateInspectionInvoiceResponse,
} from '@/features/applications/api'
import { assignTask, patchTaskResult } from '@/features/tasks/api'
import { resolveApiBaseUrl } from '@/shared/api/httpClient'
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

type SaveContractStageStateParams = {
  guiDisplayResult?: string
  savedState: unknown
  taskInstanceId?: string | number
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

  return {
    assignContractRcToCompany,
    generateContractPackage,
    generateContractInvoice,
    isAssigningContractRc,
    isGeneratingContractPackage,
    isGeneratingContractInvoice,
    isSendingContractEmail,
    isSendingRcNotification,
    notifyRcForApproval,
    saveContractStageState,
    sendContractPackageEmail,
  }
}
