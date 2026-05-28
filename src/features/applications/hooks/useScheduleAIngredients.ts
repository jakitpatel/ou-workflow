import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchScheduleAIngredients } from '@/features/applications/api'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { useUser } from '@/context/UserContext'
import { queryOptionDefaults } from '@/shared/api/queryOptions'
import type { KashIngredient, ScheduleAIngredient } from '@/types/application'

export type ScheduleAIngredientRow = {
  id: string
  name: string
  source: string
  brand: string
  rmc: string
  ukd: string
  fn: string
  group: string
  attachment: string
  status: string
  origin: 'Application' | 'Kashrus' | 'IAR-added'
  raw?: ScheduleAIngredient | KashIngredient
}

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

export type ScheduleAScratchpad = {
  flags: Record<string, { flagged: boolean; note: string }>
  additions: ScheduleAIngredientRow[]
  rounds: ScheduleACommunicationRound[]
  halacha: Record<string, { open: boolean; note: string; resolvedAt?: string }>
  deleted: Record<string, boolean>
  attachments: Record<string, string>
  eirReceived: boolean
  eirReviewComplete: boolean
  eirNeedsEntry: boolean
  scheduleAReady: boolean
  scheduleAReadyBy?: string
  scheduleAReadyDate?: string
  signedOff: boolean
  signedOffDate?: string
}

const EMPTY_SCRATCHPAD: ScheduleAScratchpad = {
  flags: {},
  additions: [],
  rounds: [],
  halacha: {},
  deleted: {},
  attachments: {},
  eirReceived: false,
  eirReviewComplete: false,
  eirNeedsEntry: false,
  scheduleAReady: false,
  signedOff: false,
}

const makeScratchpadKey = (applicationId?: string | number) =>
  `schedule-a-ingredients-scratchpad:${applicationId ?? 'unknown'}`

const todayLabel = () =>
  new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const valueText = (value: unknown) => String(value ?? '').trim()

const getRecordValue = (record: Record<string, unknown>, fieldNames: string[]) =>
  fieldNames.map((fieldName) => valueText(record[fieldName])).find(Boolean) ?? ''

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
    name: valueText(ingredient.ingredientLabelName),
    source: getRecordValue(record, ['source', 'Source', 'SOURCE', 'manufacturer']),
    brand: valueText(ingredient.brandName),
    rmc: valueText(ingredient.rawMaterialCode),
    ukd: valueText(ingredient.UKDID),
    fn: getRecordValue(record, ['function', 'Function', 'ingredientFunction']),
    group: valueText(ingredient.group),
    attachment: getRecordValue(record, [
      'attachment',
      'Attachment',
      'attachmentUrl',
      'AttachmentUrl',
      'attachmentURL',
      'AttachmentURL',
      'FilePath',
      'filePath',
    ]),
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
    name: valueText(ingredient.INGREDIENT_NAME),
    source: valueText(ingredient.LABEL_COMPANY),
    brand: valueText(ingredient.BRAND_NAME),
    rmc: getRecordValue(ingredient as Record<string, unknown>, ['rawMaterialCode', 'RawMaterialCode', 'RMC', 'rmc']),
    ukd: valueText(ingredient.UKDID),
    fn: valueText(ingredient.CTA || ingredient.PlantCTA),
    group: valueText(ingredient.GRP),
    attachment: '',
    status: plantStatus && dpm ? `${plantStatus}-${dpm}` : plantStatus || dpm || valueText(ingredient.PlantStatus),
    origin: 'Kashrus',
    raw: ingredient,
  }
}

const normalizeScratchpad = (value: Partial<ScheduleAScratchpad> | null | undefined): ScheduleAScratchpad => ({
  ...EMPTY_SCRATCHPAD,
  ...value,
  flags: value?.flags ?? {},
  additions: value?.additions ?? [],
  rounds: value?.rounds ?? [],
  halacha: value?.halacha ?? {},
  deleted: value?.deleted ?? {},
  attachments: value?.attachments ?? {},
})

const csvEscape = (value: unknown) => {
  const text = String(value ?? '').replace(/"/g, '""')
  return /[,"\n\r]/.test(text) ? `"${text}"` : text
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

export function useScheduleAIngredientsScratchpad(applicationId?: string | number) {
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

  const toggleDeleted = useCallback(
    (rowId: string) => {
      updateScratchpad((current) => {
        const deleted = { ...current.deleted }
        if (deleted[rowId]) {
          delete deleted[rowId]
        } else {
          deleted[rowId] = true
        }
        return { ...current, deleted }
      })
    },
    [updateScratchpad],
  )

  const setAttachment = useCallback(
    (rowId: string, filename: string) => {
      updateScratchpad((current) => ({
        ...current,
        attachments: { ...current.attachments, [rowId]: filename },
      }))
    },
    [updateScratchpad],
  )

  const removeAttachment = useCallback(
    (rowId: string) => {
      updateScratchpad((current) => {
        const attachments = { ...current.attachments }
        delete attachments[rowId]
        return { ...current, attachments }
      })
    },
    [updateScratchpad],
  )

  const addLocalRow = useCallback(
    (draft: Omit<ScheduleAIngredientRow, 'id' | 'origin' | 'raw' | 'status'>) => {
      updateScratchpad((current) => ({
        ...current,
        additions: [
          ...current.additions,
          {
            ...draft,
            id: `added-${Date.now()}`,
            status: 'added',
            origin: 'IAR-added',
          },
        ],
      }))
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
      rows,
    }: {
      applicationName?: string
      recipientEmail?: string
      rows: ScheduleAIngredientRow[]
    }) => {
      const resolved = new Set(
        scratchpad.rounds.flatMap((round) => round.items.filter((item) => item.resolved).map((item) => item.ingId)),
      )
      const items = rows
        .filter((row) => scratchpad.flags[row.id]?.flagged && !scratchpad.deleted[row.id] && !resolved.has(row.id))
        .map((row) => ({
          ingId: row.id,
          name: row.name || row.rmc || 'Ingredient',
          question: scratchpad.flags[row.id]?.note || 'Please provide additional information.',
        }))

      if (!items.length) return null

      const roundNumber = scratchpad.rounds.length + 1
      const companyName = applicationName || 'this application'
      const subject = `OU Schedule A - Additional Information Needed (App #${normalizedApplicationId ?? ''}, Round ${roundNumber})`
      const body = [
        'Dear Company Contact,',
        '',
        `As part of the OU kosher certification review for ${companyName}, we need additional information on the following ingredient${items.length === 1 ? '' : 's'}:`,
        '',
        ...items.flatMap((item, index) => [`${index + 1}. ${item.name}`, `   ${item.question}`, '']),
        'Please reply with the requested details and keep the subject line unchanged.',
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

        return {
          ...current,
          flags,
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
                  item.ingId === rowId ? { ...item, needsFollowup: true } : item,
                ),
              }
            : round,
        ),
      }))
    },
    [updateScratchpad],
  )

  const markEirReceived = useCallback(() => {
    updateScratchpad((current) => ({ ...current, eirReceived: true }))
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
      signedOff: false,
      signedOffDate: undefined,
    }))
  }, [updateScratchpad])

  const performSignoff = useCallback(() => {
    updateScratchpad((current) => ({ ...current, signedOff: true, signedOffDate: todayLabel() }))
  }, [updateScratchpad])

  const buildScratchpadCsv = useCallback(
    (rows: ScheduleAIngredientRow[]) => {
      const resolved = new Set(
        scratchpad.rounds.flatMap((round) => round.items.filter((item) => item.resolved).map((item) => item.ingId)),
      )
      const csvRows = [
        [
          '#',
          'Name',
          'Source',
          'Brand',
          'RMC',
          'UKDID',
          'Function',
          'Group',
          'Status',
          'Origin',
          'Flagged',
          'Flag Note / Question',
          'Halachic Review',
          'Halacha Note',
          'Attachment',
          'Resolved',
          'Deleted',
        ],
        ...rows.map((row, index) => {
          const halacha = scratchpad.halacha[row.id]
          return [
            index + 1,
            row.name,
            row.source,
            row.brand,
            row.rmc,
            row.ukd,
            row.fn,
            row.group,
            row.status,
            row.origin,
            scratchpad.flags[row.id]?.flagged ? 'Yes' : 'No',
            scratchpad.flags[row.id]?.note ?? '',
            halacha?.open ? 'Open' : halacha?.resolvedAt ? `Resolved ${halacha.resolvedAt}` : '',
            halacha?.note ?? '',
            scratchpad.attachments[row.id] || row.attachment,
            resolved.has(row.id) ? 'Yes' : 'No',
            scratchpad.deleted[row.id] ? 'Yes' : 'No',
          ]
        }),
      ]

      return csvRows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
    },
    [scratchpad],
  )

  return {
    scratchpad,
    toggleFlag,
    updateFlagNote,
    toggleDeleted,
    setAttachment,
    removeAttachment,
    addLocalRow,
    toggleHalacha,
    updateHalachaNote,
    generateRound,
    updateRoundStatus,
    simulateRoundResponse,
    resolveRoundItem,
    requestRoundFollowup,
    markEirReceived,
    markEirReviewComplete,
    requestEirIngredientEntry,
    markScheduleAReady,
    reopenScheduleA,
    performSignoff,
    buildScratchpadCsv,
  }
}
