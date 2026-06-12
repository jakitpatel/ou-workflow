import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createApplicationMessage,
  createScheduleBProduct,
  fetchApplicationMessages,
  fetchScheduleBProducts,
  updateApplicationMessage,
  type CreateScheduleBProductPayload,
} from '@/features/applications/api'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { useUser } from '@/context/UserContext'
import { queryOptionDefaults } from '@/shared/api/queryOptions'
import { buildHtmlEmailFromPlainText } from '@/shared/email/htmlEmail'
import type { KashProduct, ScheduleBProduct } from '@/types/application'

export type ScheduleBProductRow = {
  id: string
  labelNo: string
  productId?: string
  labelName: string
  name: string
  labelCo: string
  source: string
  brand: string
  rmc: string
  upc: string
  ukd: string
  symbol: string
  fn: string
  use: string
  bulk: string
  excl: string
  list: string
  internal: string
  passover: string
  artwork: string
  typeLabel: string
  productDisplayId: string
  group: string
  certifier: string
  attachment: string
  status: string
  origin: 'Application' | 'Kashrus'
  raw?: ScheduleBProduct | KashProduct
}

export type ScheduleBProductFilter = 'all' | 'flagged' | 'resolved' | 'halacha'
export type ScheduleBProductSortKey =
  | 'labelNo'
  | 'labelName'
  | 'brand'
  | 'labelCo'
  | 'excl'
  | 'use'
  | 'bulk'
  | 'list'
  | 'symbol'
  | 'internal'
  | 'passover'
  | 'upc'
  | 'artwork'
  | 'typeLabel'
  | 'productDisplayId'
  | 'status'
export type ScheduleBProductView = 'application' | 'kashrus'

export const UNASSIGNED_RFR_LABEL = 'Not yet Assigned'

export type ScheduleBProductDraft = {
  labelNo: string
  labelName: string
  brand: string
  labelCo: string
  excl: string
  use: string
  bulk: string
  list: string
  symbol: string
  internal: string
  passover: string
  upc: string
  artwork: string
}

export const CANNED_NOTES = [
  'Please provide a copy of the label artwork.',
  'Please confirm the UPC code.',
  'Please confirm the brand and label company.',
  'Is this product Consumer or Industrial?',
  'Please confirm Passover status (Yes / No).',
] as const

export type ScheduleBCommunicationItem = {
  ingId: string
  name: string
  question: string
  response?: string
  resolved?: boolean
  needsFollowup?: boolean
}

export type ScheduleBCommunicationRound = {
  id: string
  roundNumber: number
  generatedDate: string
  items: ScheduleBCommunicationItem[]
  status: 'generated' | 'awaiting' | 'responded' | 'reviewed'
  email: {
    to: string
    subject: string
    body: string
  }
  responseDate?: string
}

export type ScheduleBExportRowsResult = {
  header: string[]
  data: string[][]
}

export type SendScheduleBCommunicationEmailInput = {
  applicationId?: string | number | null
  taskInstanceId?: string | number | null
  recipientEmail: string
  subject: string
  body: string
}

export type ScheduleBScratchpad = {
  flags: Record<string, { flagged: boolean; note: string }>
  rounds: ScheduleBCommunicationRound[]
  halacha: Record<string, { open: boolean; note: string; resolvedAt?: string }>
  resolved: Record<string, boolean>
  attachments: Record<string, string>
  eirReceived: boolean
  eirReviewComplete: boolean
  eirNeedsEntry: boolean
  eirNotRequired: boolean
  scheduleBReady: boolean
  scheduleBReadyBy?: string
  scheduleBReadyDate?: string
}

const EMPTY_SCRATCHPAD: ScheduleBScratchpad = {
  flags: {},
  rounds: [],
  halacha: {},
  resolved: {},
  attachments: {},
  eirReceived: false,
  eirReviewComplete: false,
  eirNeedsEntry: false,
  eirNotRequired: false,
  scheduleBReady: false,
}

const todayLabel = () =>
  new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const valueText = (value: unknown) => String(value ?? '').trim()

const toYn = (value: unknown) => {
  const normalized = valueText(value).toLowerCase()
  if (['true', 'yes', '1', 'y'].includes(normalized)) return 'Y'
  if (['false', 'no', '0', 'n'].includes(normalized)) return 'N'
  return valueText(value)
}

const toBoolean = (value: unknown): boolean | undefined => {
  const normalized = valueText(value).toLowerCase()
  if (['true', 'yes', '1', 'y'].includes(normalized)) return true
  if (['false', 'no', '0', 'n'].includes(normalized)) return false
  return undefined
}

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
  `schedule-b-products-v32:${applicationId ?? 'unknown'}`

const scheduleBMessagesQueryKey = (applicationId?: string, taskInstanceId?: string) =>
  [...applicationsQueryKeys.all, 'schedule-b-messages', applicationId ?? 'unknown', taskInstanceId ?? 'unknown'] as const

const normalizeScratchpad = (value: Partial<ScheduleBScratchpad> | null | undefined): ScheduleBScratchpad => ({
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

export const getApplicationProductRowId = (product: ScheduleBProduct, index: number) =>
  `application-${valueText(product.ApplicationID)}-${valueText(product.ScheduleProductId) || index}-${valueText(
    product.UPC,
  ) || valueText(product.productName) || valueText(product.BrandName) || 'product'}`

export const getKashProductRowId = (product: KashProduct, index: number) =>
  `kash-${valueText(product.LABEL_ID ?? product.PRODUCED_IN1_ID ?? product.MERCHANDISE_ID) || index}-${valueText(
    product.PRODUCT_NAME ?? product.MerchProductName ?? product.BRAND_NAME,
  ) || 'product'}`

export function mapApplicationProductRow(
  product: ScheduleBProduct,
  index: number,
): ScheduleBProductRow {
  const productId = valueText(product.ScheduleProductId)
  const labelName = valueText(product.productName) || valueText(product.BrandName)
  const brand = valueText(product.BrandName)
  const labelCo = valueText(product.privateLabelCo)
  const use = [
    ['Industrial', product.Industrial],
    ['Consumer', product.Retail],
  ]
    .filter(([, value]) => ['true', 'yes', '1', 'y'].includes(valueText(value).toLowerCase()))
    .map(([label]) => label)
    .join(' / ')
  const list = valueText(product.list).toUpperCase()
  const upc = valueText(product.UPC)
  const symbol = valueText(product.symbol)
  const bulk = toYn(product.bulkShipped)
  const internal = toYn(product.internal_use_only)
  const excl = toYn(product.privateLabel)
  const passover = toYn(product.passover)

  return {
    id: getApplicationProductRowId(product, index),
    labelNo: productId,
    productId,
    labelName,
    name: labelName,
    labelCo,
    source: labelCo,
    brand,
    rmc: upc,
    upc,
    ukd: valueText(product.symbol),
    symbol,
    fn: use,
    use,
    bulk,
    excl,
    list,
    internal,
    passover,
    artwork: '',
    typeLabel: valueText(product.privateLabel).toLowerCase() === 'true' ? 'Private label' : 'In-house',
    productDisplayId: '',
    group: '',
    certifier: symbol,
    attachment: '',
    status: list || passover || 'submitted',
    origin: 'Application',
    raw: product,
  }
}

export function mapKashProductRow(product: KashProduct, index: number): ScheduleBProductRow {
  const plantStatus = valueText(product.PLANT_STATUS)
  const dpm = valueText(product.DPM)
  const labelName = valueText(product.PRODUCT_NAME) || valueText(product.MerchProductName) || valueText(product.BRAND_NAME)
  const labelCo = valueText(product.COMPANY_NAME) || valueText(product.LABEL_COMPANY)
  const brand = valueText(product.BRAND_NAME)
  const symbol = valueText(product.SYMBOL)
  const merchId = valueText(product.MERCHANDISE_ID)
  const labelId = valueText(product.LABEL_ID)
  const productDisplayId = merchId ? `PRD-${merchId}` : labelId ? `PRD-${labelId}` : ''

  return {
    id: getKashProductRowId(product, index),
    labelNo: labelId,
    productId: '',
    labelName,
    name: labelName,
    labelCo,
    source: labelCo,
    brand,
    rmc: valueText(product.MerchProductNumber),
    upc: valueText(product.MerchProductNumber),
    ukd: labelId,
    symbol,
    fn: [product.INDUSTRIAL, product.Consumer].filter(Boolean).map(valueText).join(' / '),
    use: [product.INDUSTRIAL, product.Consumer].filter(Boolean).map(valueText).join(' / '),
    bulk: toYn(product.BLK),
    excl: '',
    list: valueText(product.IN_USE).toUpperCase(),
    internal: toYn(product.OUP_REQUIRED),
    passover: toYn(product.PESACH),
    artwork: '',
    typeLabel: valueText(product.LABEL_TYPE) || (valueText(product.LABEL_COMPANY) ? 'Private label' : 'In-house'),
    productDisplayId,
    group: valueText(product.GRP),
    certifier: symbol,
    attachment: '',
    status: plantStatus && dpm ? `${plantStatus}-${dpm}` : plantStatus || dpm || valueText(product.STATUS),
    origin: 'Kashrus',
    raw: product,
  }
}

export function useScheduleBProducts(applicationId?: string | number) {
  const { token } = useUser()
  const normalizedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)

  return useQuery({
    queryKey: applicationsQueryKeys.scheduleBProducts(normalizedApplicationId),
    queryFn: () =>
      fetchScheduleBProducts({
        applicationId: normalizedApplicationId,
        token: token ?? undefined,
      }),
    enabled: !!token && !!normalizedApplicationId,
    ...queryOptionDefaults.applicationScheduleBProducts,
  })
}

export function useCreateScheduleBProduct(applicationId?: string | number) {
  const { token } = useUser()
  const queryClient = useQueryClient()
  const normalizedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)

  return useMutation({
    mutationFn: (draft: ScheduleBProductDraft) => {
      if (!normalizedApplicationId) {
        throw new Error('Application ID is required before adding a product.')
      }

      const normalizedUse = valueText(draft.use).toLowerCase()
      const explicitPrivateLabel = toBoolean(draft.excl)
      const payload: CreateScheduleBProductPayload = {
        ApplicationID: normalizedApplicationId,
        UKDID: valueText(draft.labelNo) || undefined,
        productName: valueText(draft.labelName) || undefined,
        Retail:
          normalizedUse.includes('retail') || normalizedUse.includes('consumer')
            ? true
            : normalizedUse
                  .split(/[\/,&]/)
                  .map((part) => part.trim())
                  .some((part) => ['r', 'ret', 'cons', 'consumer'].includes(part))
              ? true
              : undefined,
        Industrial:
          normalizedUse.includes('industrial')
            ? true
            : normalizedUse
                  .split(/[\/,&]/)
                  .map((part) => part.trim())
                  .some((part) => ['i', 'ind', 'industrial'].includes(part))
              ? true
              : undefined,
        BrandName: valueText(draft.brand) || undefined,
        inHouse: explicitPrivateLabel === undefined ? undefined : !explicitPrivateLabel,
        privateLabel: explicitPrivateLabel,
        privateLabelCo: valueText(draft.labelCo) || undefined,
        bulkShipped: valueText(draft.bulk) || undefined,
        symbol: valueText(draft.symbol) || undefined,
        passover: valueText(draft.passover) || undefined,
        status: valueText(draft.list) || undefined,
        UPC: valueText(draft.upc) || undefined,
        internal_use_only: valueText(draft.internal) || undefined,
        list: valueText(draft.list) || undefined,
      }

      return createScheduleBProduct({
        payload,
        token: token ?? undefined,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: applicationsQueryKeys.scheduleBProducts(normalizedApplicationId),
      })
    },
  })
}

export function useScheduleBCommunicationMessages({
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
    queryKey: scheduleBMessagesQueryKey(normalizedApplicationId, normalizedTaskInstanceId),
    queryFn: () =>
      fetchApplicationMessages({
        applicationId: normalizedApplicationId,
        taskInstanceId: normalizedTaskInstanceId,
        //messageType: 'Email',
        token: token ?? undefined,
      }),
    enabled: !!token && !!normalizedApplicationId,
    ...queryOptionDefaults.applicationScheduleBProducts,
  })
}

export function useSendScheduleBCommunicationEmail() {
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
    }: SendScheduleBCommunicationEmailInput) => {
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
        preheader: subject,
        title: 'OU Kosher Schedule B',
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
          TemplateName: 'schedule-b-products',
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
        queryKey: scheduleBMessagesQueryKey(normalizedApplicationId, normalizedTaskInstanceId),
      })
    },
  })
}

export function useScheduleBScratchpad(applicationId?: string | number) {
  const normalizedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)
  const storageKey = useMemo(() => makeScratchpadKey(normalizedApplicationId), [normalizedApplicationId])
  const [scratchpad, setScratchpad] = useState<ScheduleBScratchpad>(EMPTY_SCRATCHPAD)

  useEffect(() => {
    if (!normalizedApplicationId) {
      setScratchpad(EMPTY_SCRATCHPAD)
      return
    }

    try {
      const saved = window.localStorage.getItem(storageKey)
      setScratchpad(saved ? normalizeScratchpad(JSON.parse(saved) as Partial<ScheduleBScratchpad>) : EMPTY_SCRATCHPAD)
    } catch {
      setScratchpad(EMPTY_SCRATCHPAD)
    }
  }, [normalizedApplicationId, storageKey])

  const updateScratchpad = useCallback(
    (updater: (current: ScheduleBScratchpad) => ScheduleBScratchpad) => {
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
      rows: ScheduleBProductRow[]
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
          name: row.name || row.rmc || 'Product',
          question: scratchpad.flags[row.id]?.note || 'Please provide additional information.',
        }))

      if (!items.length) return null

      const roundNumber = requestedRoundNumber && requestedRoundNumber > 0 ? requestedRoundNumber : scratchpad.rounds.length + 1
      const normalizedTaskInstanceId =
        taskInstanceId === undefined || taskInstanceId === null ? '' : String(taskInstanceId).trim()
      const taskSubjectPart = normalizedTaskInstanceId ? `, Task: #${normalizedTaskInstanceId}` : ''
      const companyName = applicationName || 'this application'
      const subject = `OU Schedule B - Additional Information Needed (App #${
        normalizedApplicationId ?? ''
      }${taskSubjectPart}, Round ${roundNumber})`
      const body = [
        `Dear ${recipientName || 'Company Contact'},`,
        '',
        `As part of the OU kosher certification review for ${companyName}, we need additional information on the following product${items.length > 1 ? 's' : ''}:`,
        '',
        ...items.flatMap((item, index) => [`${index + 1}. ${item.name}`, `   ${item.question}`, '']),
        'Please reply to this email with the requested details. Keep the subject line unchanged so we can match your response to this request.',
        '',
        'Thank you,',
        'Products Approval - Orthodox Union',
      ].join('\n')

      const round: ScheduleBCommunicationRound = {
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
    (roundId: string, status: ScheduleBCommunicationRound['status']) => {
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

  const requestEirProductEntry = useCallback(() => {
    updateScratchpad((current) => ({ ...current, eirReceived: true, eirReviewComplete: false, eirNeedsEntry: true }))
  }, [updateScratchpad])

  const markScheduleBReady = useCallback(
    (by = 'IAR') => {
      updateScratchpad((current) => ({
        ...current,
        scheduleBReady: true,
        scheduleBReadyBy: by,
        scheduleBReadyDate: todayLabel(),
      }))
    },
    [updateScratchpad],
  )

  const reopenScheduleB = useCallback(() => {
    updateScratchpad((current) => ({
      ...current,
      scheduleBReady: false,
      scheduleBReadyBy: undefined,
      scheduleBReadyDate: undefined,
    }))
  }, [updateScratchpad])

  const buildScratchpadCsv = useCallback(
    (rows: ScheduleBProductRow[]) => {
      const csvRows = [
        ['#', 'UPC', 'Name', 'Source', 'Brand', 'Group', 'Symbol', 'Plant Status', 'Origin', 'Flagged', 'Question', 'Halacha', 'Resolved'],
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

  const buildScheduleBExportRows = useCallback(
    (rows: ScheduleBProductRow[]): ScheduleBExportRowsResult => ({
      header: [
        'Label Number',
        'Label Name',
        'Brand',
        'Label Company',
        'Exclusive (Y/N)',
        'Consumer/Industrial',
        'Bulk Shipped',
        'List (Y/U/N)',
        'Symbol',
        'Internal Use',
        'Passover',
        'UPC',
        'Artwork',
        'Note',
      ],
      data: rows.map((row) => [
        row.labelNo,
        row.labelName,
        row.brand,
        row.labelCo,
        row.excl,
        row.use,
        row.bulk,
        row.list,
        row.symbol,
        row.internal,
        row.passover,
        row.upc,
        row.artwork ? 'attached' : '',
        scratchpad.flags[row.id]?.note ?? '',
      ]),
    }),
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
    requestEirProductEntry,
    markScheduleBReady,
    reopenScheduleB,
    buildScratchpadCsv,
    buildScheduleBExportRows,
  }
}
