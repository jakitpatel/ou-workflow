import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUser } from '@/context/UserContext'
import {
  createCompanyAddressFromApplication,
  createCompanyContactLinkFromApplication,
  createContactFromApplication,
  createOrUpdateCompanyFromApplication,
  createPlantAddressFromApplication,
  createPlantContactLinkFromApplication,
  createOrUpdatePlantFromApplication,
  extractCreatedRecordId,
} from '@/features/prelim/api'
import { getCompanyDetailsFromKASH, getPlantDetailsFromKASH } from '@/features/applications/api'
import { PrelimResolutionComparisonSection } from '@/features/prelim/components/PrelimResolutionComparisonSection'
import { PrelimResolutionDrawerHeader } from '@/features/prelim/components/PrelimResolutionDrawerHeader'
import {
  cloneCompanyData,
  clonePlantData,
  countUpdatedCompanyFields,
  countUpdatedPlantFields,
  createDefaultCompanyData,
  createDefaultPlantData,
  getBillingContact,
  getCompanyDbRecord,
  getPhysicalAddress,
  getPlantDbRecord,
  getPrimaryContact,
} from '@/features/prelim/lib/prelimResolution'
import { prelimQueryKeys } from '@/features/prelim/model/queryKeys'
import type {
  CompanyData,
  CompanyDbRecord,
  Match,
  PlantData,
  PlantDbRecord,
  PrelimResolutionDrawerProps,
} from '@/features/prelim/model/resolution'
import { queryOptionDefaults } from '@/shared/api/queryOptions'

export function PrelimResolutionDrawer({
  isOpen,
  onClose,
  type,
  data,
  matches,
  onAssign,
  onRefresh,
  selectedId,
  isActionable = true,
  taskStatus,
  readOnly = false,
}: PrelimResolutionDrawerProps) {
  const { token, username } = useUser()
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [createdMatch, setCreatedMatch] = useState<Match | null>(null)
  const [confirmedCompanyMatch, setConfirmedCompanyMatch] = useState<Match | null>(null)
  const [createdCompanyContacts, setCreatedCompanyContacts] = useState({
    primary: false,
    billing: false,
  })
  const [editableCompanyData, setEditableCompanyData] = useState<CompanyData>(() =>
    createDefaultCompanyData()
  )
  const [editablePlantData, setEditablePlantData] = useState<PlantData>(() =>
    createDefaultPlantData()
  )
  const selectedIdNormalized =
    selectedId != null && String(selectedId).trim() !== '' ? String(selectedId) : undefined
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(
    matches.find((m) => String(m.Id) === selectedIdNormalized) ||
      (matches.length > 0 ? matches[0] : null)
  )

  useEffect(() => {
    if (createdMatch) {
      setSelectedMatch(createdMatch)
      return
    }

    const nextMatch =
      matches.find((m) => String(m.Id) === selectedIdNormalized) ??
      (matches.length > 0 ? matches[0] : null)
    setSelectedMatch(nextMatch)
  }, [createdMatch, matches, selectedIdNormalized])

  useEffect(() => {
    if (!isOpen) return
    if (type === 'company') {
      setEditableCompanyData(cloneCompanyData(data as CompanyData))
    } else {
      setEditablePlantData(clonePlantData(data as PlantData))
    }
    setIsEditMode(false)
  }, [data, isOpen, type])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const isCompany = type === 'company'
  const selectedMatchId = selectedMatch?.Id

  const { data: companyDbResponse, refetch: refetchCompanyDetails } = useQuery({
    queryKey: prelimQueryKeys.kashrusCompanyDetails(selectedMatchId),
    queryFn: () =>
      getCompanyDetailsFromKASH({
        companyID: selectedMatchId as string | number,
        token: token ?? undefined,
      }),
    enabled: isOpen && isCompany && selectedMatchId != null,
    ...queryOptionDefaults.prelimKashrusDetails,
  })

  const { data: plantDbResponse, refetch: refetchPlantDetails } = useQuery({
    queryKey: prelimQueryKeys.kashrusPlantDetails(selectedMatchId),
    queryFn: () =>
      getPlantDetailsFromKASH({
        PlantId: selectedMatchId as string | number,
        token: token ?? undefined,
      }),
    enabled: isOpen && !isCompany && selectedMatchId != null,
    ...queryOptionDefaults.prelimKashrusDetails,
  })

  if (!isOpen) return null

  const isTaskCompleted = (taskStatus ?? '').trim().toLowerCase() === 'completed'
  const drawerActionable = !readOnly && isActionable
  const contactSectionActionable = !readOnly && (isActionable || isTaskCompleted)
  const companyData = editableCompanyData
  const plantData = editablePlantData
  const companyDb: CompanyDbRecord | undefined = getCompanyDbRecord(companyDbResponse)
  const plantDb: PlantDbRecord | undefined = getPlantDbRecord(plantDbResponse)
  const dbCompanyAddress = getPhysicalAddress(companyDb?.companyAddresses)
  const dbPlantAddress = getPhysicalAddress(plantDb?.plantAddresses)
  const dbCompanyPrimaryContact = getPrimaryContact(companyDb?.companyContacts)
  const dbCompanyBillingContact = getBillingContact(companyDb?.companyContacts, {
    fallbackToSecondary: false,
  })
  const dbPlantPrimaryContact = getPrimaryContact(plantDb?.plantContacts)
  const dbPlantMarketingContact = getBillingContact(plantDb?.plantContacts)

  const handleCreateCompanyContact = async (contactType: 'primary' | 'billing') => {
    if (!contactSectionActionable || isSubmitting || !isCompany || !selectedMatch?.Id) return

    const contactData =
      contactType === 'primary' ? companyData.primaryContact : companyData.billingContact

    if (!contactData) {
      toast.error('No submitted contact data found to create')
      return
    }

    setIsCreatingNew(true)
    try {
      const createdContact = await createContactFromApplication({
        appValue: contactData,
        username: username ?? undefined,
        token: token ?? undefined,
      })
      const createdContactId = extractCreatedRecordId(createdContact)
      if (createdContactId == null) {
        throw new Error('Contact created but contact id was missing from response')
      }

      await createCompanyContactLinkFromApplication({
        companyId: selectedMatch.Id,
        companyTitle: contactData.title ?? '',
        contactId: createdContactId,
        isPrimary: createdMatch != null && contactType === 'primary',
        isBilling: createdMatch != null && contactType === 'billing',
        isOther: createdMatch == null,
        token: token ?? undefined,
      })

      setCreatedCompanyContacts((current) => ({ ...current, [contactType]: true }))
      await Promise.allSettled([refetchCompanyDetails()])
      toast.success(
        contactType === 'primary'
          ? 'Primary company contact created from application data'
          : 'Billing contact created from application data'
      )
    } catch (error: any) {
      const message =
        error?.details?.message || error?.message || 'Failed to create contact from application data'
      toast.error(message)
    } finally {
      setIsCreatingNew(false)
    }
  }

  const handleCreatePlantContact = async (contactType: 'primary' | 'marketing') => {
    if (!contactSectionActionable || isSubmitting || isCompany || !selectedMatch) return

    const ownsId = selectedMatch.OWNSID ?? selectedMatch.Id
    const contactData =
      contactType === 'primary' ? plantData.primaryContact : plantData.marketingContact

    if (!contactData) {
      toast.error('No submitted contact data found to create')
      return
    }

    setIsCreatingNew(true)
    try {
      const createdContact = await createContactFromApplication({
        appValue: contactData,
        username: username ?? undefined,
        token: token ?? undefined,
      })
      const createdContactId = extractCreatedRecordId(createdContact)
      if (createdContactId == null) {
        throw new Error('Contact created but contact id was missing from response')
      }

      await createPlantContactLinkFromApplication({
        ownsId,
        companyTitle: contactData.title ?? '',
        contactId: createdContactId,
        isPrimary: contactType === 'primary',
        isBilling: false,
        isWeb: false,
        isOther: contactType === 'marketing',
        token: token ?? undefined,
      })

      await Promise.allSettled([refetchPlantDetails()])
      toast.success(
        contactType === 'primary'
          ? 'Primary plant contact created from application data'
          : 'Marketing contact created from application data'
      )
    } catch (error: any) {
      const message =
        error?.details?.message || error?.message || 'Failed to create contact from application data'
      toast.error(message)
    } finally {
      setIsCreatingNew(false)
    }
  }

  const handleMatchChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const matchId = event.target.value
    if (matchId === 'create-new') {
      setCreatedMatch(null)
      setConfirmedCompanyMatch(null)
      setCreatedCompanyContacts({ primary: false, billing: false })
      setSelectedMatch(null)
      return
    }

    const match = matches.find((m) => String(m.Id) === matchId)
    setCreatedMatch(null)
    setConfirmedCompanyMatch(null)
    setCreatedCompanyContacts({ primary: false, billing: false })
    setSelectedMatch(match || null)
  }

  const saveMatchSelection = async () => {
    if (!drawerActionable || !selectedMatch) return false
    setIsSubmitting(true)
    try {
      await onAssign(selectedMatch)
      return true
    } catch (error: any) {
      const message =
        error?.details?.message || error?.message || 'Failed to assign selected match'
      toast.error(message)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmMatch = async () => {
    if (isCompany) {
      if (!drawerActionable || !selectedMatch || isSubmitting || isCreatingNew) return
      setConfirmedCompanyMatch(selectedMatch)
      toast.success('Company match selected')
      return
    }

    const saved = await saveMatchSelection()
    if (saved) {
      toast.success('Section confirmed - DB record matched')
      onClose()
    }
  }

  const handleCreateNew = async () => {
    if (!drawerActionable || isSubmitting) return
    setSelectedMatch(null)
    setIsCreatingNew(true)
    try {
      if (isCompany) {
        const result = await createOrUpdateCompanyFromApplication({
          appValue: companyData,
          token: token ?? undefined,
        })
        const createdCompanyId = extractCreatedRecordId(result, 'companyId')
        if (createdCompanyId == null) {
          throw new Error('Company created but companyId was missing from response')
        }
        await createCompanyAddressFromApplication({
          appValue: companyData,
          companyId: createdCompanyId,
          token: token ?? undefined,
        })
        const nextMatch = {
          Id: createdCompanyId,
          Address: '',
          companyName: companyData.companyName,
        }
        setCreatedMatch(nextMatch)
        setSelectedMatch(nextMatch)
        setConfirmedCompanyMatch(null)
        setCreatedCompanyContacts({ primary: false, billing: false })
      } else {
        const result = await createOrUpdatePlantFromApplication({
          appValue: plantData,
          token: token ?? undefined,
        })
        const createdPlantId = extractCreatedRecordId(result, 'plantId')
        if (createdPlantId == null) {
          throw new Error('Plant created but plantId was missing from response')
        }
        await createPlantAddressFromApplication({
          appValue: plantData,
          plantId: createdPlantId,
          token: token ?? undefined,
        })
        const nextMatch = {
          Id: createdPlantId,
          Address: '',
          plantName: plantData.plantName,
          PlantID: createdPlantId,
        }
        setCreatedMatch(nextMatch)
        setSelectedMatch(nextMatch)
      }
      await onRefresh?.()
      toast.success(`New ${isCompany ? 'company' : 'plant'} created from application data`)
    } catch (error: any) {
      const message =
        error?.details?.message || error?.message || 'Failed to create record from application data'
      toast.error(message)
    } finally {
      setIsCreatingNew(false)
    }
  }

  const handleCompleteTask = async () => {
    if (!drawerActionable || isSubmitting || isCreatingNew || !selectedMatch) return

    setIsSubmitting(true)
    try {
      await onAssign(selectedMatch)
      toast.success('Task completed')
      onClose()
    } catch (error: any) {
      const message = error?.details?.message || error?.message || 'Failed to complete task'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmEdit = () => {
    if (!drawerActionable) return
    if (selectedMatch) {
      setIsEditMode(true)
    }
  }

  const handleCancelEdit = () => {
    if (isCompany) {
      setEditableCompanyData(cloneCompanyData(data as CompanyData))
    } else {
      setEditablePlantData(clonePlantData(data as PlantData))
    }
    setIsEditMode(false)
  }

  const handleSaveAndConfirm = async () => {
    const updatedFieldsCount = isCompany
      ? countUpdatedCompanyFields(cloneCompanyData(data as CompanyData), companyData)
      : countUpdatedPlantFields(clonePlantData(data as PlantData), plantData)

    const saved = await saveMatchSelection()
    if (saved) {
      toast.success(`${updatedFieldsCount} field(s) updated and confirmed`)
      setIsEditMode(false)
      onClose()
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-[780px] bg-white shadow-2xl z-50 translate-x-0 transition-transform duration-300 ease-in-out overflow-hidden flex flex-col">
        <PrelimResolutionDrawerHeader
          isCompany={isCompany}
          type={type}
          companyData={companyData}
          plantData={plantData}
          selectedMatch={selectedMatch}
          isCreatedMatch={createdMatch != null}
          bestMatch={matches[0] ?? null}
          confirmedMatch={confirmedCompanyMatch}
          onClose={onClose}
        />

        <PrelimResolutionComparisonSection
          isCompany={isCompany}
          companyData={companyData}
          plantData={plantData}
          companyDb={companyDb}
          plantDb={plantDb}
          dbCompanyAddress={dbCompanyAddress}
          dbPlantAddress={dbPlantAddress}
          dbCompanyPrimaryContact={dbCompanyPrimaryContact}
          dbCompanyBillingContact={dbCompanyBillingContact}
          dbPlantPrimaryContact={dbPlantPrimaryContact}
          dbPlantMarketingContact={dbPlantMarketingContact}
          matches={matches}
          selectedMatch={selectedMatch}
          setEditableCompanyData={setEditableCompanyData}
          setEditablePlantData={setEditablePlantData}
          onMatchChange={handleMatchChange}
          onCreateNew={handleCreateNew}
          onCreatePrimaryCompanyContact={() => handleCreateCompanyContact('primary')}
          onCreateBillingCompanyContact={() => handleCreateCompanyContact('billing')}
          onCreatePrimaryPlantContact={() => handleCreatePlantContact('primary')}
          onCreateMarketingPlantContact={() => handleCreatePlantContact('marketing')}
          onConfirmEdit={handleConfirmEdit}
          onConfirmMatch={handleConfirmMatch}
          onCancelEdit={handleCancelEdit}
          onSaveAndConfirm={handleSaveAndConfirm}
          drawerActionable={drawerActionable}
          contactSectionActionable={contactSectionActionable}
          isCreatedCompany={isCompany && createdMatch != null}
          isCompanyMatchConfirmed={confirmedCompanyMatch != null}
          createdCompanyContacts={createdCompanyContacts}
          isCreatingNew={isCreatingNew}
          isSubmitting={isSubmitting}
          isEditMode={isEditMode}
        />

        <div className="border-t border-gray-200 bg-[#fafbfc] px-6 py-3.5">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleCompleteTask}
              disabled={!drawerActionable || isSubmitting || isCreatingNew || !selectedMatch}
              className={`rounded-[7px] border px-4 py-2 text-[14px] font-medium ${
                drawerActionable && !isSubmitting && !isCreatingNew && selectedMatch
                  ? 'border-green-600 bg-green-600 text-white hover:bg-green-700'
                  : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
              }`}
            >
              {isSubmitting ? 'Completing...' : 'Complete Task'}
            </button>
            <button
              onClick={onClose}
              className="rounded-[7px] border border-gray-300 bg-[#f8fafc] px-4 py-2 text-[14px] font-medium text-gray-700 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
