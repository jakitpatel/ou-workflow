import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createApplicationMessage,
  createScheduleAIngredient,
  fetchApplicationMessages,
  fetchScheduleAIngredients,
  updateApplicationMessage,
  type CreateScheduleAIngredientPayload,
} from '@/features/applications/api'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { useUser } from '@/context/UserContext'
import { queryOptionDefaults } from '@/shared/api/queryOptions'
import { buildHtmlEmailFromPlainText } from '@/shared/email/htmlEmail'
import type { ApplicationEmail, KashIngredient, ScheduleAIngredient } from '@/types/application'

export type ScheduleAIngredientRow = {
  id: string
  ingredientId?: string
  name: string
  source: string
  brand: string
  rmc: string
  ukd: string
  fn: string
  group: string
  certifier: string
  attachment: string
  status: string
  origin: 'Application' | 'Kashrus'
  raw?: ScheduleAIngredient | KashIngredient
}

export type ScheduleAIngredientFilter = 'all' | 'flagged' | 'resolved' | 'halacha'
export type ScheduleAIngredientSortKey = 'rmc' | 'name' | 'source' | 'brand' | 'group' | 'certifier' | 'plantStatus'
export type ScheduleAIngredientView = 'application' | 'kashrus'

export const UNASSIGNED_RFR_LABEL = 'Not yet Assigned'

export type ScheduleAIngredientDraft = {
  rmc: string
  name: string
  source: string
  brand: string
  group: string
  certifier: string
  plantStatus: string
}

export const CANNED_NOTES = [
  'Provide updated LOC - Letter of Certification.',
  'Specify Ingredient Name/UKDID on LOC provided.',
  'Ingredient/Source is not Approved. Provide alternate approved Ingredient/Source.',
] as const

export type ScheduleACommunicationItem = {
  ingId: string
  name: string
  question: string
  response?: string
  resolved?: boolean
  needsFollowup?: boolean
}

export type ScheduleACommunicationRound = {
  id: string
  roundNumber: number
  generatedDate: string
  items: ScheduleACommunicationItem[]
  status: 'generated' | 'awaiting' | 'responded' | 'reviewed'
  email: {
    to: string
    subject: string
    body: string
  }
  responseDate?: string
}

export type SendScheduleACommunicationEmailInput = {
  applicationId?: string | number | null
  taskInstanceId?: string | number | null
  recipientEmail: string
  subject: string
  body: string
}

export type ScheduleAScratchpad = {
  flags: Record<string, { flagged: boolean; note: string }>
  rounds: ScheduleACommunicationRound[]
  halacha: Record<string, { open: boolean; note: string; resolvedAt?: string }>
  resolved: Record<string, boolean>
  attachments: Record<string, string>
  eirReceived: boolean
  eirReviewComplete: boolean
  eirNeedsEntry: boolean
  eirNotRequired: boolean
  scheduleAReady: boolean
  scheduleAReadyBy?: string
  scheduleAReadyDate?: string
}

const EMPTY_SCRATCHPAD: ScheduleAScratchpad = {
  flags: {},
  rounds: [],
  halacha: {},
  resolved: {},
  attachments: {},
  eirReceived: false,
  eirReviewComplete: false,
  eirNeedsEntry: false,
  eirNotRequired: false,
  scheduleAReady: false,
}

const todayLabel = () =>
  new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const valueText = (value: unknown) => String(value ?? '').trim()

const buildS3HttpUrl = (value: string) => {
  const match = value.match(/^s3:\/\/([^/]+)\/(.+)$/i)
  if (!match) return ''

  const [, bucket, key] = match
  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return `https://${bucket}.s3.amazonaws.com/${encodedKey}`
}

export const resolveScheduleADocumentUrl = (value?: string | null) => {
  const trimmed = valueText(value)
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^s3:\/\//i.test(trimmed)) return buildS3HttpUrl(trimmed)

  const publicPath = trimmed.replace(/^\/+/, '')
  return `/${publicPath}`
}

const normalizeEmailBodyText = (value: unknown) =>
  String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim()

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")

const extractPrimaryEmailHtmlContent = (value: string) => {
  const mainCellMatch = value.match(
    /<td[^>]*padding:26px 28px[^>]*>([\s\S]*?)<\/td>/i,
  )
  if (mainCellMatch?.[1]) return mainCellMatch[1]

  const bodyMatch = value.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch?.[1]) return bodyMatch[1]

  return value
}

const htmlToPlainTextWithSpacing = (value: string) =>
  decodeHtmlEntities(extractPrimaryEmailHtmlContent(value))
    .replace(/<div[^>]*display\s*:\s*none[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n\n')
    .replace(/<\/div\s*>/gi, '\n')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<\/tr\s*>/gi, '\n')
    .replace(/<\/td\s*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

export const getScheduleACommunicationMessageBody = (email: ApplicationEmail) => {
  const plainTextBody =
    normalizeEmailBodyText(email.MessageTextPlain) ||
    normalizeEmailBodyText(email.PlainText) ||
    normalizeEmailBodyText(email.Text)

  if (plainTextBody) {
    return plainTextBody
  }

  const htmlBody = String(email.MessageText ?? '')
  if (!htmlBody) return ''

  return htmlToPlainTextWithSpacing(htmlBody)
}

const getRecordValue = (record: Record<string, unknown>, fieldNames: string[]) =>
  fieldNames.map((fieldName) => valueText(record[fieldName])).find(Boolean) ?? ''

const getCreatedMessageId = (response: unknown) => {
  const data = response && typeof response === 'object' && 'data' in response
    ? (response as { data?: unknown }).data
    : undefined
  const attributes = data && typeof data === 'object' && 'attributes' in data
    ? (data as { attributes?: Record<string, unknown> }).attributes
    : undefined
  const dataId = data && typeof data === 'object' && 'id' in data ? (data as { id?: unknown }).id : undefined

  return valueText(attributes?.MessageID ?? dataId)
}

const addRefMessageIdToSubject = (subject: string, messageId: string) => {
  const cleanSubject = subject.replace(/,\s*refMessageId:\s*#?\d+/i, '').replace(/,\s*refMsgId:\s*#?\d+/i, '')
  const roundMatch = cleanSubject.match(/,\s*Round\s+\d+\)/i)
  if (roundMatch?.index === undefined) return `${cleanSubject} (refMessageId: #${messageId})`

  return `${cleanSubject.slice(0, roundMatch.index)}, refMessageId: #${messageId}${cleanSubject.slice(roundMatch.index)}`
}

export const getAssignedRoleValue = (
  assignedRoles: Array<Record<string, unknown>> | undefined,
  roleName: string,
  fallback = UNASSIGNED_RFR_LABEL,
) => {
  const normalizedRoleName = roleName.trim().toLowerCase()
  const assignedRole = assignedRoles?.find((role) =>
    Object.keys(role).some((key) => key.trim().toLowerCase() === normalizedRoleName),
  )

  if (!assignedRole) return fallback

  const roleKey = Object.keys(assignedRole).find((key) => key.trim().toLowerCase() === normalizedRoleName)
  const roleValue = roleKey ? valueText(assignedRole[roleKey]) : ''

  return roleValue || fallback
}

const makeScratchpadKey = (applicationId?: string | number) =>
  `schedule-a-ingredients-v32:${applicationId ?? 'unknown'}`

const normalizeScratchpad = (value: Partial<ScheduleAScratchpad> | null | undefined): ScheduleAScratchpad => ({
  ...EMPTY_SCRATCHPAD,
  ...value,
  flags: value?.flags ?? {},
  rounds: value?.rounds ?? [],
  halacha: value?.halacha ?? {},
  resolved: value?.resolved ?? {},
  attachments: value?.attachments ?? {},
})

const csvEscape = (value: unknown) => {
  const text = String(value ?? '').replace(/"/g, '""')
  return /[,"\n\r]/.test(text) ? `"${text}"` : text
}

export const getApplicationIngredientRowId = (ingredient: ScheduleAIngredient, index: number) =>
  `application-${valueText(ingredient.ApplicationID)}-${valueText(ingredient.IngredientId) || index}-${valueText(
    ingredient.rawMaterialCode,
  ) || valueText(ingredient.ingredientLabelName) || 'ingredient'}`

export const getKashIngredientRowId = (ingredient: KashIngredient, index: number) =>
  `kash-${valueText(ingredient.LABEL_ID ?? ingredient.LabelID ?? ingredient.USED_IN1_ID ?? ingredient.MERCHANDISE_ID) || index}-${valueText(
    ingredient.INGREDIENT_NAME,
  ) || 'ingredient'}`

export function mapApplicationIngredientRow(
  ingredient: ScheduleAIngredient,
  index: number,
): ScheduleAIngredientRow {
  const record = ingredient as Record<string, unknown>

  return {
    id: getApplicationIngredientRowId(ingredient, index),
    ingredientId: valueText(ingredient.IngredientId),
    name: valueText(ingredient.ingredientLabelName),
    source: getRecordValue(record, ['source', 'Source', 'SOURCE', 'manufacturer']),
    brand: valueText(ingredient.brandName),
    rmc: valueText(ingredient.rawMaterialCode),
    ukd: valueText(ingredient.UKDID),
    fn: getRecordValue(record, ['function', 'Function', 'ingredientFunction']),
    group: valueText(ingredient.group),
    certifier: valueText(ingredient.certifyingAgency) || valueText(ingredient.UKDID),
    attachment: getRecordValue(record, ['attachment', 'Attachment', 'FilePath', 'filePath']),
    status: valueText(ingredient.plantStatus) || 'submitted',
    origin: 'Application',
    raw: ingredient,
  }
}

export function mapKashIngredientRow(ingredient: KashIngredient, index: number): ScheduleAIngredientRow {
  const plantStatus = valueText(ingredient.IngredientInPlantStatus)
  const dpm = valueText(ingredient.DPM)

  return {
    id: getKashIngredientRowId(ingredient, index),
    ingredientId: '',
    name: valueText(ingredient.INGREDIENT_NAME),
    source: valueText(ingredient.LABEL_COMPANY),
    brand: valueText(ingredient.BRAND_NAME),
    rmc: getRecordValue(ingredient as Record<string, unknown>, ['rawMaterialCode', 'RawMaterialCode', 'RMC', 'rmc']),
    ukd: valueText(ingredient.UKDID),
    fn: valueText(ingredient.CTA || ingredient.PlantCTA),
    group: valueText(ingredient.GRP),
    certifier: valueText(ingredient.SYMBOL) || valueText(ingredient.LOC) || valueText(ingredient.UKDID),
    attachment: '',
    status: plantStatus && dpm ? `${plantStatus}-${dpm}` : plantStatus || dpm || valueText(ingredient.PlantStatus),
    origin: 'Kashrus',
    raw: ingredient,
  }
}

export function useScheduleAIngredients(applicationId?: string | number) {
  const { token } = useUser()
  const normalizedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)

  return useQuery({
    queryKey: applicationsQueryKeys.scheduleAIngredients(normalizedApplicationId),
    queryFn: () =>
      fetchScheduleAIngredients({
        applicationId: normalizedApplicationId,
        token: token ?? undefined,
      }),
    enabled: !!token && !!normalizedApplicationId,
    ...queryOptionDefaults.applicationScheduleAIngredients,
  })
}

export function useCreateScheduleAIngredient(applicationId?: string | number) {
  const { token } = useUser()
  const queryClient = useQueryClient()
  const normalizedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)

  return useMutation({
    mutationFn: (draft: ScheduleAIngredientDraft) => {
      if (!normalizedApplicationId) {
        throw new Error('Application ID is required before adding an ingredient.')
      }

      const payload: CreateScheduleAIngredientPayload = {
        ApplicationID: normalizedApplicationId,
        rawMaterialCode: valueText(draft.rmc) || undefined,
        ingredientLabelName: valueText(draft.name) || undefined,
        manufacturer: valueText(draft.source) || undefined,
        source: valueText(draft.source) || undefined,
        brandName: valueText(draft.brand) || undefined,
        group: valueText(draft.group) || undefined,
        certifyingAgency: valueText(draft.certifier) || undefined,
        plantStatus: valueText(draft.plantStatus) || undefined,
      }

      return createScheduleAIngredient({
        payload,
        token: token ?? undefined,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: applicationsQueryKeys.scheduleAIngredients(normalizedApplicationId),
      })
    },
  })
}

export function useScheduleACommunicationMessages({
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
    queryKey: applicationsQueryKeys.scheduleAMessages(normalizedApplicationId, normalizedTaskInstanceId),
    queryFn: () =>
      fetchApplicationMessages({
        applicationId: normalizedApplicationId,
        taskInstanceId: normalizedTaskInstanceId,
        //messageType: 'Email',
        token: token ?? undefined,
      }),
    enabled: !!token && !!normalizedApplicationId,
    ...queryOptionDefaults.applicationScheduleAIngredients,
  })
}

export function useSendScheduleACommunicationEmail() {
  const { token, username } = useUser()
  const queryClient = useQueryClient()
  const fromUser = (() => {
    const normalizedUsername = valueText(username)
    if (!normalizedUsername) return 'projectflow@ou.org'
    const localPart = normalizedUsername.includes('@')
      ? normalizedUsername.split('@')[0]
      : normalizedUsername
    return `${localPart}@ou.org`
  })()

  return useMutation({
    mutationFn: async ({
      applicationId,
      taskInstanceId,
      recipientEmail,
      subject,
      body,
    }: SendScheduleACommunicationEmailInput) => {
      const normalizedApplicationId =
        applicationId === undefined || applicationId === null ? '' : String(applicationId).trim()
      const normalizedRecipientEmail = valueText(recipientEmail)

      if (!normalizedApplicationId) {
        throw new Error('Application ID is required before sending email.')
      }

      if (!normalizedRecipientEmail) {
        throw new Error('Recipient email is required before sending email.')
      }

      const htmlEmail = buildHtmlEmailFromPlainText(body, {
        title: 'OU Kosher Schedule A',
      })

      const createResponse = await createApplicationMessage({
        token: token ?? undefined,
        payload: {
          MessageID: null,
          ApplicationID: normalizedApplicationId,
          FromUser: fromUser,
          ToUser: normalizedRecipientEmail,
          Subject: subject,
          MessageText: htmlEmail.html,
          MessageTextPlain: htmlEmail.text,
          PlainText: htmlEmail.text,
          Text: htmlEmail.text,
          MessageType: 'Email-Staging',
          Priority: 'NORMAL',
          SentDate: new Date().toISOString(),
          TemplateName: 'schedule-a-ingredients',
          TaskInstanceId: taskInstanceId ?? null,
          isPrivate: false,
          parentMessageId: null,
          toReply: null,
          isRead: false,
          tag: null,
          CCUser: null,
          BCCUser: 'productAutomation@ou.org',
          replyTo: 'oucert@ou.org',
          Attachments: null,
        },
      })

      const messageId = getCreatedMessageId(createResponse)
      if (!messageId) {
        throw new Error('Email was staged, but the response did not include a MessageID.')
      }

      const finalizedSubject = addRefMessageIdToSubject(subject, messageId)

      return await updateApplicationMessage({
        messageId,
        token: token ?? undefined,
        payload: {
          MessageID: messageId,
          MessageType: 'Email',
          Subject: finalizedSubject,
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
        queryKey: applicationsQueryKeys.scheduleAMessages(normalizedApplicationId, normalizedTaskInstanceId),
      })
    },
  })
}

export function useScheduleAScratchpad(applicationId?: string | number) {
  const normalizedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)
  const storageKey = useMemo(() => makeScratchpadKey(normalizedApplicationId), [normalizedApplicationId])
  const [scratchpad, setScratchpad] = useState<ScheduleAScratchpad>(EMPTY_SCRATCHPAD)

  useEffect(() => {
    if (!normalizedApplicationId) {
      setScratchpad(EMPTY_SCRATCHPAD)
      return
    }

    try {
      const saved = window.localStorage.getItem(storageKey)
      setScratchpad(saved ? normalizeScratchpad(JSON.parse(saved) as Partial<ScheduleAScratchpad>) : EMPTY_SCRATCHPAD)
    } catch {
      setScratchpad(EMPTY_SCRATCHPAD)
    }
  }, [normalizedApplicationId, storageKey])

  const updateScratchpad = useCallback(
    (updater: (current: ScheduleAScratchpad) => ScheduleAScratchpad) => {
      setScratchpad((current) => {
        const next = normalizeScratchpad(updater(normalizeScratchpad(current)))
        if (normalizedApplicationId) {
          window.localStorage.setItem(storageKey, JSON.stringify(next))
        }
        return next
      })
    },
    [normalizedApplicationId, storageKey],
  )

  const toggleFlag = useCallback(
    (rowId: string) => {
      updateScratchpad((current) => {
        const existing = current.flags[rowId] ?? { flagged: false, note: '' }
        return {
          ...current,
          flags: { ...current.flags, [rowId]: { ...existing, flagged: !existing.flagged } },
        }
      })
    },
    [updateScratchpad],
  )

  const updateFlagNote = useCallback(
    (rowId: string, note: string) => {
      updateScratchpad((current) => ({
        ...current,
        flags: { ...current.flags, [rowId]: { flagged: true, note } },
      }))
    },
    [updateScratchpad],
  )

  const toggleResolved = useCallback(
    (rowId: string) => {
      updateScratchpad((current) => {
        const resolved = { ...current.resolved }
        if (resolved[rowId]) {
          delete resolved[rowId]
        } else {
          resolved[rowId] = true
        }

        const flags = { ...current.flags }
        const halacha = { ...current.halacha }

        if (resolved[rowId]) {
          if (flags[rowId]) flags[rowId] = { ...flags[rowId], flagged: false }
          if (halacha[rowId]?.open) {
            halacha[rowId] = {
              ...halacha[rowId],
              open: false,
              resolvedAt: new Date().toISOString().slice(0, 10),
            }
          }
        }

        return { ...current, flags, halacha, resolved }
      })
    },
    [updateScratchpad],
  )

  const toggleHalacha = useCallback(
    (rowId: string) => {
      updateScratchpad((current) => {
        const existing = current.halacha[rowId]
        const nextEntry =
          existing?.open
            ? { ...existing, open: false, resolvedAt: new Date().toISOString().slice(0, 10) }
            : { open: true, note: existing?.note ?? '' }

        return {
          ...current,
          eirNeedsEntry: nextEntry.open ? true : current.eirNeedsEntry,
          halacha: { ...current.halacha, [rowId]: nextEntry },
        }
      })
    },
    [updateScratchpad],
  )

  const updateHalachaNote = useCallback(
    (rowId: string, note: string) => {
      updateScratchpad((current) => ({
        ...current,
        halacha: { ...current.halacha, [rowId]: { ...current.halacha[rowId], open: true, note } },
      }))
    },
    [updateScratchpad],
  )

  const generateRound = useCallback(
    ({
      applicationName,
      recipientEmail,
      recipientName,
      roundNumber: requestedRoundNumber,
      rows,
      taskInstanceId,
    }: {
      applicationName?: string
      recipientEmail?: string
      recipientName?: string
      roundNumber?: number
      rows: ScheduleAIngredientRow[]
      taskInstanceId?: string | number | null
    }) => {
      const alreadyResolved = new Set(
        scratchpad.rounds.flatMap((round) => round.items.filter((item) => item.resolved).map((item) => item.ingId)),
      )
      Object.keys(scratchpad.resolved).forEach((id) => alreadyResolved.add(id))

      const items = rows
        .filter((row) => scratchpad.flags[row.id]?.flagged && !alreadyResolved.has(row.id))
        .map((row) => ({
          ingId: row.id,
          name: row.name || row.rmc || 'Ingredient',
          question: scratchpad.flags[row.id]?.note || 'Please provide additional information.',
        }))

      if (!items.length) return null

      const roundNumber = requestedRoundNumber && requestedRoundNumber > 0 ? requestedRoundNumber : scratchpad.rounds.length + 1
      const normalizedTaskInstanceId =
        taskInstanceId === undefined || taskInstanceId === null ? '' : String(taskInstanceId).trim()
      const taskSubjectPart = normalizedTaskInstanceId ? `, Task: #${normalizedTaskInstanceId}` : ''
      const companyName = applicationName || 'this application'
      const subject = `OU Schedule A - Additional Information Needed (App #${
        normalizedApplicationId ?? ''
      }${taskSubjectPart}, Round ${roundNumber})`
      const body = [
        `Dear ${recipientName || 'Company Contact'},`,
        '',
        `As part of the OU kosher certification review for ${companyName}, we need additional information on the following ingredient${items.length > 1 ? 's' : ''}:`,
        '',
        ...items.flatMap((item, index) => [`${index + 1}. ${item.name}`, `   ${item.question}`, '']),
        'Please reply to this email with the requested details. Keep the subject line unchanged so we can match your response to this request.',
        '',
        'Thank you,',
        'Ingredients Approval - Orthodox Union',
      ].join('\n')

      const round: ScheduleACommunicationRound = {
        id: `round-${Date.now()}`,
        roundNumber,
        generatedDate: todayLabel(),
        items,
        status: 'generated',
        email: {
          to: recipientEmail ?? '',
          subject,
          body,
        },
      }

      updateScratchpad((current) => ({ ...current, rounds: [...current.rounds, round] }))
      return round
    },
    [normalizedApplicationId, scratchpad, updateScratchpad],
  )

  const updateRoundStatus = useCallback(
    (roundId: string, status: ScheduleACommunicationRound['status']) => {
      updateScratchpad((current) => ({
        ...current,
        rounds: current.rounds.map((round) => (round.id === roundId ? { ...round, status } : round)),
      }))
    },
    [updateScratchpad],
  )

  const updateRoundEmailBody = useCallback(
    (roundId: string, body: string) => {
      updateScratchpad((current) => ({
        ...current,
        rounds: current.rounds.map((round) =>
          round.id === roundId ? { ...round, email: { ...round.email, body } } : round,
        ),
      }))
    },
    [updateScratchpad],
  )

  const updateRoundEmailTo = useCallback(
    (roundId: string, to: string) => {
      updateScratchpad((current) => ({
        ...current,
        rounds: current.rounds.map((round) =>
          round.id === roundId ? { ...round, email: { ...round.email, to } } : round,
        ),
      }))
    },
    [updateScratchpad],
  )

  const removeRound = useCallback(
    (roundId: string) => {
      updateScratchpad((current) => ({
        ...current,
        rounds: current.rounds.filter((round) => round.id !== roundId),
      }))
    },
    [updateScratchpad],
  )

  const simulateRoundResponse = useCallback(
    (roundId: string) => {
      updateScratchpad((current) => ({
        ...current,
        rounds: current.rounds.map((round) =>
          round.id === roundId
            ? {
                ...round,
                status: 'responded',
                responseDate: todayLabel(),
                items: round.items.map((item) => ({
                  ...item,
                  response: item.response || `Response received for ${item.name}.`,
                })),
              }
            : round,
        ),
      }))
    },
    [updateScratchpad],
  )

  const resolveRoundItem = useCallback(
    (roundId: string, rowId: string) => {
      updateScratchpad((current) => {
        const flags = { ...current.flags }
        if (flags[rowId]) flags[rowId] = { ...flags[rowId], flagged: false }
        const resolved = { ...current.resolved, [rowId]: true }

        return {
          ...current,
          flags,
          resolved,
          rounds: current.rounds.map((round) => {
            if (round.id !== roundId) return round
            const items = round.items.map((item) => (item.ingId === rowId ? { ...item, resolved: true } : item))
            return { ...round, items, status: items.every((item) => item.resolved) ? 'reviewed' : round.status }
          }),
        }
      })
    },
    [updateScratchpad],
  )

  const requestRoundFollowup = useCallback(
    (roundId: string, rowId: string) => {
      updateScratchpad((current) => ({
        ...current,
        rounds: current.rounds.map((round) =>
          round.id === roundId
            ? {
                ...round,
                items: round.items.map((item) =>
                  item.ingId === rowId ? { ...item, needsFollowup: true, resolved: false } : item,
                ),
              }
            : round,
        ),
      }))
    },
    [updateScratchpad],
  )

  const markEirReceived = useCallback(() => {
    updateScratchpad((current) => ({ ...current, eirReceived: true, eirNotRequired: false }))
  }, [updateScratchpad])

  const markEirNotRequired = useCallback(() => {
    updateScratchpad((current) => ({ ...current, eirNotRequired: true, eirReceived: false, eirReviewComplete: false }))
  }, [updateScratchpad])

  const clearEirNotRequired = useCallback(() => {
    updateScratchpad((current) => ({ ...current, eirNotRequired: false }))
  }, [updateScratchpad])

  const markEirReviewComplete = useCallback(() => {
    updateScratchpad((current) => ({ ...current, eirReceived: true, eirReviewComplete: true, eirNeedsEntry: false }))
  }, [updateScratchpad])

  const requestEirIngredientEntry = useCallback(() => {
    updateScratchpad((current) => ({ ...current, eirReceived: true, eirReviewComplete: false, eirNeedsEntry: true }))
  }, [updateScratchpad])

  const markScheduleAReady = useCallback(
    (by = 'IAR') => {
      updateScratchpad((current) => ({
        ...current,
        scheduleAReady: true,
        scheduleAReadyBy: by,
        scheduleAReadyDate: todayLabel(),
      }))
    },
    [updateScratchpad],
  )

  const reopenScheduleA = useCallback(() => {
    updateScratchpad((current) => ({
      ...current,
      scheduleAReady: false,
      scheduleAReadyBy: undefined,
      scheduleAReadyDate: undefined,
    }))
  }, [updateScratchpad])

  const buildScratchpadCsv = useCallback(
    (rows: ScheduleAIngredientRow[]) => {
      const csvRows = [
        ['#', 'RMC', 'Name', 'Source', 'Brand', 'Group', 'Certifier', 'Plant Status', 'Origin', 'Flagged', 'Question', 'Halacha', 'Resolved'],
        ...rows.map((row, index) => [
          index + 1,
          row.rmc,
          row.name,
          row.source,
          row.brand,
          row.group,
          row.certifier,
          row.status,
          row.origin,
          scratchpad.flags[row.id]?.flagged ? 'Yes' : 'No',
          scratchpad.flags[row.id]?.note ?? '',
          scratchpad.halacha[row.id]?.open ? 'Open' : scratchpad.halacha[row.id]?.resolvedAt ? 'Resolved' : '',
          scratchpad.resolved[row.id] ? 'Yes' : 'No',
        ]),
      ]

      return csvRows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
    },
    [scratchpad],
  )

  return {
    scratchpad,
    toggleFlag,
    updateFlagNote,
    toggleResolved,
    toggleHalacha,
    updateHalachaNote,
    generateRound,
    updateRoundStatus,
    updateRoundEmailBody,
    updateRoundEmailTo,
    removeRound,
    simulateRoundResponse,
    resolveRoundItem,
    requestRoundFollowup,
    markEirReceived,
    markEirNotRequired,
    clearEirNotRequired,
    markEirReviewComplete,
    requestEirIngredientEntry,
    markScheduleAReady,
    reopenScheduleA,
    buildScratchpadCsv,
  }
}
