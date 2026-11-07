import type { ApplicationEmail } from '@/types/application'

/** A message the Communication tabs show: its MessageType contains "Email" (any case). */
export const isEmailMessage = (message: Pick<ApplicationEmail, 'MessageType'> & { messageType?: unknown }) =>
  String(message.MessageType ?? message.messageType ?? '').toLowerCase().includes('email')

/**
 * The Communication tabs (Contract, Schedule A, Schedule B) list only emails; notes and other
 * message types (e.g. "Text") stay out. Used as the query `select`, so the cached list is unchanged.
 */
export const selectEmailMessages = (messages: ApplicationEmail[]) => messages.filter(isEmailMessage)

/*
 * Round emails and their replies have subjects such as
 *   OU Schedule A - Additional Information Needed (App #1715, Task: #28140, refMessageId: #845, Round 2)
 *   RE: OU Kosher - Contract Package for Acme (App #1715, Task: #28141, refMessageId: #900, Round 1)
 * The title ("Schedule A", "Kosher - Contract Package for ...") and every number vary. refMessageId
 * is added once the round email is sent, so it is optional here.
 *
 * The task number is not compared with the drawer's task: a round is sent with the task the drawer
 * was opened from, which can differ from the task it is opened from later. Each tab already keeps
 * its own rounds by title, and replies attach to their round by message id.
 */
const ROUND_SUBJECT =
  /\bOU\s+.+?\s+-\s+.+?\(\s*App\s*#\s*\d+\s*,\s*Task:\s*#\s*\d+\s*(?:,\s*refMessageId:\s*#\s*\d+\s*)?,\s*Round\s+\d+\s*\)/i

/** Whether a subject has the round-email format above (any title, application, task or round). */
export const isRoundEmailSubject = (subject: unknown) =>
  typeof subject === 'string' && ROUND_SUBJECT.test(subject)

/** An email whose subject has the round format. */
export const isRoundEmail = (
  message: Pick<ApplicationEmail, 'MessageType' | 'Subject'> & { messageType?: unknown },
) => isEmailMessage(message) && isRoundEmailSubject(message.Subject)

/**
 * The Communication tabs fetch every message of the application (no TaskInstanceId filter, which
 * left out replies) and keep, as the query `select`, the round emails and their replies.
 */
export const selectRoundEmails = (messages: ApplicationEmail[]) => messages.filter(isRoundEmail)

const REPLY_SUBJECT_PREFIX = /^\s*(?:(?:re|fwd?)\s*:\s*)+/i
const REF_MESSAGE_ID = /ref(?:Message|Msg)Id:\s*#?\s*(\d+)/i

/** "RE: ..." / "FW: ..." / "Fwd: ..." subjects are replies to a round email, not new rounds. */
export const isReplySubject = (subject: unknown) =>
  typeof subject === 'string' && REPLY_SUBJECT_PREFIX.test(subject)

/** The round email's id written in a subject as "refMessageId: #845" (or the older "refMsgId"). */
export const getSubjectRefMessageId = (subject: unknown) =>
  typeof subject === 'string' ? (subject.match(REF_MESSAGE_ID)?.[1] ?? '') : ''

/**
 * The message a reply belongs to: its parentMessageId when the server set one, otherwise, for a
 * reply subject, the refMessageId in that subject (replies can be stored without a parent).
 * Empty for a round email.
 */
export const getReplyParentMessageId = (
  message: Pick<ApplicationEmail, 'Subject' | 'parentMessageId'>,
) => {
  const parent = String(message.parentMessageId ?? '').trim()
  if (parent && parent !== '0') return parent
  return isReplySubject(message.Subject) ? getSubjectRefMessageId(message.Subject) : ''
}
