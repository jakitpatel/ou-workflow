import type { ApplicationEmail } from '@/types/application'

/** A message the Communication tabs show: its MessageType contains "Email" (any case). */
export const isEmailMessage = (message: Pick<ApplicationEmail, 'MessageType'> & { messageType?: unknown }) =>
  String(message.MessageType ?? message.messageType ?? '').toLowerCase().includes('email')

/**
 * The Communication tabs (Contract, Schedule A, Schedule B) list only emails; notes and other
 * message types (e.g. "Text") stay out. Used as the query `select`, so the cached list is unchanged.
 */
export const selectEmailMessages = (messages: ApplicationEmail[]) => messages.filter(isEmailMessage)
