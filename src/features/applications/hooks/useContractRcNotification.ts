import { useState } from 'react'
import {
  createApplicationMessage,
  type ApplicationMessagePayload,
} from '@/features/applications/api'
import { resolveApiBaseUrl } from '@/shared/api/httpClient'
import { buildHtmlEmailFromPlainText } from '@/shared/email/htmlEmail'

const RC_NOTIFICATION_SUBJECT = 'OU Kosher - You have been selected to be the RC'

const getWorkflowBaseUrl = () => resolveApiBaseUrl().replace(/\/api\/?$/i, '').replace(/\/$/, '')

const normalizeApplicationId = (applicationId: string | number) => {
  const value = String(applicationId).trim()
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && value !== '' ? numericValue : value
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

  return `${getWorkflowBaseUrl()}/ou-workflow/ncrc-dashboard?${params.toString()}`
}

type NotifyRcForApprovalParams = {
  applicationId?: string | number
  companyName: string
  rcUserName?: string
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
      MessageText: htmlEmail.html,
      MessageTextPlain: htmlEmail.text,
      MessageType: 'Text',
      Priority: 'NORMAL',
      SentDate: new Date().toISOString(),
      TemplateName: 'initial-inspection',
      TaskInstanceId: taskInstanceId ?? null,
      isPrivate: false,
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

  return {
    isSendingRcNotification,
    notifyRcForApproval,
  }
}
