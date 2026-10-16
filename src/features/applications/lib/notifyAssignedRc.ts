import { createApplicationMessage } from '../api'
import { buildHtmlEmailFromPlainText } from '@/shared/email/htmlEmail'
import { withImpliedBcc } from '@/shared/email/impliedBcc'

export async function notifyAssignedRc({
  applicationId, fromUser, toUser, token,
}: {
  applicationId: number
  fromUser?: string | null
  toUser?: string | null
  token?: string | null
}) {
  if (!toUser?.trim()) throw new Error('The selected RC has no email address.')
  if (!fromUser?.trim()) throw new Error('The logged-in user has no sender address.')
  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  const url = new URL(`${basePath}/ou-workflow/ncrc-dashboard/${applicationId}`, window.location.origin).toString()
  const subject = 'OU Kosher - Selected As RC'
  const email = buildHtmlEmailFromPlainText(`You are selected as RC. Application Link : ${url}`, { title: subject })
  return createApplicationMessage({
    token: token ?? undefined,
    payload: {
      MessageID: null,
      ApplicationID: applicationId,
      FromUser: fromUser.trim(),
      ToUser: toUser.trim(),
      Subject: subject,
      MessageText: email.html,
      MessageTextPlain: email.text,
      PlainText: email.text,
      Text: email.text,
      MessageType: 'Email',
      Priority: 'NORMAL',
      SentDate: new Date().toISOString(),
      TemplateName: 'rc-assignment',
      TaskInstanceId: null,
      isPrivate: false,
      parentMessageId: null,
      toReply: null,
      isRead: false,
      tag: null,
      CCUser: null,
      BCCUser: withImpliedBcc('KashrusITTestBox@ou.org'),
      Attachments: '',
    },
  })
}
