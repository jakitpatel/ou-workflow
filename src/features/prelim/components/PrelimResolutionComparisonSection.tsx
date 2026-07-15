import { useState } from 'react'
import type { ChangeEvent, Dispatch, ReactNode, SetStateAction } from 'react'
import { Edit } from 'lucide-react'
import { PrelimResolutionActions } from '@/features/prelim/components/PrelimResolutionActions'
import {
  formatAddressCityStateZip,
  formatAddressStreet,
  formatContactName,
  getCompanyName,
  getComparisonStatus,
  getPlantName,
  pickFirstNonEmpty,
} from '@/features/prelim/lib/prelimResolution'
import type {
  CompanyData,
  CompanyDbRecord,
  ComparisonStatus,
  Match,
  PlantData,
  PlantDbRecord,
} from '@/features/prelim/model/resolution'
import type { KashrusAddress, PlantFromApplicationContact } from '@/types/application'

type EditableSection =
  | 'company-info'
  | 'company-primary'
  | 'company-billing'
  | 'plant-info'
  | 'plant-primary'
  | 'plant-marketing'

type Props = {
  isCompany: boolean
  companyData: CompanyData
  plantData: PlantData
  companyDb?: CompanyDbRecord
  plantDb?: PlantDbRecord
  dbCompanyAddress?: KashrusAddress
  dbPlantAddress?: KashrusAddress
  dbCompanyPrimaryContact?: PlantFromApplicationContact
  dbCompanyBillingContact?: PlantFromApplicationContact
  dbPlantPrimaryContact?: PlantFromApplicationContact
  dbPlantMarketingContact?: PlantFromApplicationContact
  matches: Match[]
  selectedMatch: Match | null
  setEditableCompanyData: Dispatch<SetStateAction<CompanyData>>
  setEditablePlantData: Dispatch<SetStateAction<PlantData>>
  onMatchChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onCreateNew: () => void | Promise<void>
  onCreatePrimaryCompanyContact?: () => void | Promise<void>
  onCreateBillingCompanyContact?: () => void | Promise<void>
  onCreatePrimaryPlantContact?: () => void | Promise<void>
  onCreateMarketingPlantContact?: () => void | Promise<void>
  onConfirmEdit: () => void
  onConfirmMatch: () => void | Promise<void>
  onCancelEdit: () => void
  onSaveAndConfirm: () => void | Promise<void>
  drawerActionable: boolean
  contactSectionActionable: boolean
  isCreatedCompany: boolean
  isCreatedPlant: boolean
  isCompanyMatchConfirmed: boolean
  isPlantMatchConfirmed: boolean
  createdCompanyContacts: { primary: boolean; billing: boolean }
  createdPlantContacts: { primary: boolean; marketing: boolean }
  isCreatingNew: boolean
  isSubmitting: boolean
  isEditMode: boolean
  showSectionActions?: boolean
}

export function PrelimResolutionComparisonSection({
  isCompany,
  companyData,
  plantData,
  companyDb,
  plantDb,
  dbCompanyAddress,
  dbPlantAddress,
  dbCompanyPrimaryContact,
  dbCompanyBillingContact,
  dbPlantPrimaryContact,
  dbPlantMarketingContact,
  matches,
  selectedMatch,
  setEditableCompanyData,
  setEditablePlantData,
  onMatchChange,
  onCreateNew,
  onCreatePrimaryCompanyContact,
  onCreateBillingCompanyContact,
  onCreatePrimaryPlantContact,
  onCreateMarketingPlantContact,
  onConfirmEdit,
  onConfirmMatch,
  onCancelEdit,
  onSaveAndConfirm,
  drawerActionable,
  contactSectionActionable,
  isCreatedCompany,
  isCreatedPlant,
  isCompanyMatchConfirmed,
  isPlantMatchConfirmed,
  createdCompanyContacts,
  createdPlantContacts,
  isCreatingNew,
  isSubmitting,
  isEditMode,
  showSectionActions = true,
}: Props) {
  const [editableSection, setEditableSection] = useState<EditableSection | null>(null)
  const toggleEditableSection = (section: EditableSection) => {
    if (!drawerActionable) return
    setEditableSection((current) => (current === section ? null : section))
  }

  const selectedMatchIsListed =
    selectedMatch != null && matches.some((match) => String(match.Id) === String(selectedMatch.Id))
  const companySubmittedCityStateZip = formatSubmittedCityStateZip(
    companyData.companyCity,
    companyData.companyState,
    companyData.ZipPostalCode
  )
  const companyDbCityStateZip = formatAddressCityStateZip(dbCompanyAddress) || selectedMatch?.City

  const sectionActions = (
    isActionable: boolean,
    onCreateNewAction: () => void | Promise<void> = onCreateNew,
    canCreate?: boolean,
    canEdit?: boolean,
    canConfirm?: boolean,
    createLabel?: string
  ) => showSectionActions ? (
    <PrelimResolutionActions
      selectedMatch={selectedMatch}
      onCreateNew={onCreateNewAction}
      canCreate={canCreate}
      canEdit={canEdit}
      canConfirm={canConfirm}
      createLabel={createLabel}
      onConfirmEdit={onConfirmEdit}
      onConfirmMatch={onConfirmMatch}
      onCancelEdit={onCancelEdit}
      onSaveAndConfirm={onSaveAndConfirm}
      isActionable={isActionable}
      isCreatingNew={isCreatingNew}
      isSubmitting={isSubmitting}
      isEditMode={isEditMode}
    />
  ) : null

  return (
    <div className="flex-1 overflow-y-auto bg-white px-7 py-7">
      <div className="sticky top-0 z-10 -mt-3 mb-4 flex flex-col gap-3 border-b border-gray-100 bg-white py-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-[#1e1e2e]">Field Comparison</h3>
        <select
          value={selectedMatch ? String(selectedMatch.Id) : 'create-new'}
          onChange={onMatchChange}
          className="w-full min-w-[220px] rounded-[7px] border border-gray-200 bg-white px-[14px] py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-auto"
        >
          {matches.map((match, idx) => (
            <option key={String(match.Id)} value={String(match.Id)}>
              Match {idx + 1}: {isCompany ? match.companyName : match.plantName} - #
              {match.Id} ({match.matchRating}%)
              {match.status ? ` - ${match.status}` : ''}
            </option>
          ))}
          {selectedMatch && !selectedMatchIsListed && (
            <option value={String(selectedMatch.Id)}>
              Created: {isCompany ? selectedMatch.companyName : selectedMatch.plantName} - #
              {selectedMatch.Id}
            </option>
          )}
          <option value="create-new">
            + No Match - Create New {isCompany ? 'Company' : 'Plant'}
          </option>
        </select>
      </div>

      <div className="grid grid-cols-12 gap-4 mb-2 border-b border-gray-200 bg-gray-50 px-4 py-[14px] text-xs font-semibold uppercase tracking-wide text-gray-500">
        <div className="col-span-3">Field</div>
        <div className="col-span-4">Submitted (Application)</div>
        <div className="col-span-4">Database (Kashrus)</div>
        <div className="col-span-1 text-center">Status</div>
      </div>

      {isCompany ? (
        <>
          <ComparisonCard
            title="Company Information"
            editable={drawerActionable}
            isEditing={editableSection === 'company-info'}
            onToggleEdit={() => toggleEditableSection('company-info')}
          >
            <ComparisonRow
              field="Company Name"
              appValue={companyData.companyName}
              dbValue={getCompanyName(companyDb) || selectedMatch?.companyName || 'Not on file'}
              status={getComparisonStatus(
                companyData.companyName,
                getCompanyName(companyDb) || selectedMatch?.companyName
              )}
              editable={isEditMode || editableSection === 'company-info'}
              onAppValueChange={(value) =>
                setEditableCompanyData((prev) => ({ ...prev, companyName: value }))
              }
            />
            <ComparisonRow
              field="DBA / Trade Name"
              appValue={companyData.companyName}
              dbValue="Not on file"
              status="not-on-file"
              editable={isEditMode || editableSection === 'company-info'}
              onAppValueChange={(value) =>
                setEditableCompanyData((prev) => ({ ...prev, companyName: value }))
              }
            />
            <ComparisonRow
              field="Street Address"
              appValue={companyData.companyAddress || ''}
              dbValue={
                formatAddressStreet(dbCompanyAddress) || selectedMatch?.Address || 'Not on file'
              }
              status={getComparisonStatus(
                companyData.companyAddress,
                formatAddressStreet(dbCompanyAddress) || selectedMatch?.Address
              )}
              editable={isEditMode || editableSection === 'company-info'}
              onAppValueChange={(value) =>
                setEditableCompanyData((prev) => ({ ...prev, companyAddress: value }))
              }
            />
            <ComparisonRow
              field="City / State / ZIP"
              appValue={companySubmittedCityStateZip}
              dbValue={companyDbCityStateZip || 'Not on file'}
              status={getComparisonStatus(companySubmittedCityStateZip, companyDbCityStateZip)}
              editable={isEditMode || editableSection === 'company-info'}
              onAppValueChange={(value) =>
                setEditableCompanyData((prev) => ({ ...prev, companyCity: value }))
              }
            />
            <ComparisonRow
              field="Country"
              appValue={companyData.companyCountry || ''}
              dbValue={dbCompanyAddress?.country || selectedMatch?.Country || 'Not on file'}
              status={getComparisonStatus(
                companyData.companyCountry,
                dbCompanyAddress?.country || selectedMatch?.Country
              )}
              editable={isEditMode || editableSection === 'company-info'}
              onAppValueChange={(value) =>
                setEditableCompanyData((prev) => ({ ...prev, companyCountry: value }))
              }
            />
            <ComparisonRow
              field="Website"
              appValue={companyData.companyWebsite || ''}
              dbValue={companyDb?.companyWebsite || 'Not on file'}
              status={getComparisonStatus(companyData.companyWebsite, companyDb?.companyWebsite)}
              editable={isEditMode || editableSection === 'company-info'}
              onAppValueChange={(value) =>
                setEditableCompanyData((prev) => ({ ...prev, companyWebsite: value }))
              }
            />
            {sectionActions(
              drawerActionable,
              onCreateNew,
              drawerActionable && !selectedMatch && !isCreatedCompany,
              false,
              drawerActionable && !!selectedMatch && !isCreatedCompany && !isCompanyMatchConfirmed
            )}
          </ComparisonCard>

          <ComparisonCard
            title="Company Contact"
            badge="PRIMARY"
            badgeClass="bg-blue-100 text-blue-800"
            editable={drawerActionable}
            isEditing={editableSection === 'company-primary'}
            onToggleEdit={() => toggleEditableSection('company-primary')}
          >
            <ContactRows
              contact={companyData.primaryContact}
              dbContact={dbCompanyPrimaryContact}
              editable={isEditMode || editableSection === 'company-primary'}
              onChange={(key, value) =>
                setEditableCompanyData((prev) => ({
                  ...prev,
                  primaryContact: { ...prev.primaryContact, [key]: value },
                }))
              }
            />
            {sectionActions(
              false,
              onCreatePrimaryCompanyContact ?? onCreateNew,
              contactSectionActionable && !!selectedMatch && !createdCompanyContacts.primary,
              false,
              false,
              selectedMatch && !isCreatedCompany ? 'Create as Other' : undefined
            )}
          </ComparisonCard>

          <ComparisonCard
            title="Contact"
            badge="BILLING"
            badgeClass="bg-amber-100 text-amber-800"
            editable={drawerActionable}
            isEditing={editableSection === 'company-billing'}
            onToggleEdit={() => toggleEditableSection('company-billing')}
          >
            <ContactRows
              contact={companyData.billingContact}
              dbContact={dbCompanyBillingContact}
              editable={isEditMode || editableSection === 'company-billing'}
              onChange={(key, value) =>
                setEditableCompanyData((prev) => ({
                  ...prev,
                  billingContact: { ...prev.billingContact, [key]: value },
                }))
              }
            />
            {sectionActions(
              false,
              onCreateBillingCompanyContact ?? onCreateNew,
              contactSectionActionable && !!selectedMatch && !createdCompanyContacts.billing,
              false,
              false,
              selectedMatch && !isCreatedCompany ? 'Create as Other' : undefined
            )}
          </ComparisonCard>
        </>
      ) : (
        <>
          <ComparisonCard
            title="Plant Information"
            editable={drawerActionable}
            isEditing={editableSection === 'plant-info'}
            onToggleEdit={() => toggleEditableSection('plant-info')}
          >
            <ComparisonRow
              field="Plant Name"
              appValue={plantData.plantName}
              dbValue={getPlantName(plantDb) || selectedMatch?.plantName || 'Not on file'}
              status={getComparisonStatus(
                plantData.plantName,
                getPlantName(plantDb) || selectedMatch?.plantName
              )}
              editable={isEditMode || editableSection === 'plant-info'}
              onAppValueChange={(value) =>
                setEditablePlantData((prev) => ({ ...prev, plantName: value }))
              }
            />
            <ComparisonRow
              field="Street Address"
              appValue={plantData.plantAddress}
              dbValue={
                plantDb?.Address ||
                formatAddressStreet(dbPlantAddress) ||
                selectedMatch?.Address ||
                'Not on file'
              }
              status={getComparisonStatus(
                plantData.plantAddress,
                plantDb?.Address || formatAddressStreet(dbPlantAddress) || selectedMatch?.Address
              )}
              editable={isEditMode || editableSection === 'plant-info'}
              onAppValueChange={(value) =>
                setEditablePlantData((prev) => ({ ...prev, plantAddress: value }))
              }
            />
            <ComparisonRow
              field="City / State / ZIP"
              appValue={plantData.plantCity || ''}
              dbValue={
                formatAddressCityStateZip(dbPlantAddress) ||
                selectedMatch?.City ||
                'Not on file'
              }
              status={getComparisonStatus(
                plantData.plantCity,
                dbPlantAddress?.city || selectedMatch?.City
              )}
              editable={isEditMode || editableSection === 'plant-info'}
              onAppValueChange={(value) =>
                setEditablePlantData((prev) => ({ ...prev, plantCity: value }))
              }
            />
            <ComparisonRow
              field="Process Description"
              appValue={plantData.processDescription || ''}
              dbValue={plantDb?.brieflySummarize || 'Not on file'}
              status={getComparisonStatus(plantData.processDescription, plantDb?.brieflySummarize)}
              editable={isEditMode || editableSection === 'plant-info'}
              onAppValueChange={(value) =>
                setEditablePlantData((prev) => ({ ...prev, processDescription: value }))
              }
            />
            {sectionActions(
              drawerActionable,
              onCreateNew,
              drawerActionable && !selectedMatch && !isCreatedPlant,
              false,
              drawerActionable && !!selectedMatch && !isCreatedPlant && !isPlantMatchConfirmed
            )}
          </ComparisonCard>

          <ComparisonCard
            title="Plant Contact"
            badge="PRIMARY"
            badgeClass="bg-blue-100 text-blue-800"
            editable={drawerActionable}
            isEditing={editableSection === 'plant-primary'}
            onToggleEdit={() => toggleEditableSection('plant-primary')}
          >
            <ContactRows
              contact={plantData.primaryContact}
              dbContact={dbPlantPrimaryContact}
              editable={isEditMode || editableSection === 'plant-primary'}
              onChange={(key, value) =>
                setEditablePlantData((prev) => ({
                  ...prev,
                  primaryContact: { ...prev.primaryContact, [key]: value },
                }))
              }
            />
            {sectionActions(
              false,
              onCreatePrimaryPlantContact ?? onCreateNew,
              contactSectionActionable && !!selectedMatch && !createdPlantContacts.primary,
              false,
              false,
              selectedMatch && !isCreatedPlant ? 'Create as Other' : undefined
            )}
          </ComparisonCard>

          <ComparisonCard
            title="Contact"
            badge="MARKETING"
            badgeClass="bg-violet-100 text-violet-700"
            note="- Not currently in Kashrus"
            isLast
            editable={drawerActionable}
            isEditing={editableSection === 'plant-marketing'}
            onToggleEdit={() => toggleEditableSection('plant-marketing')}
          >
            <ContactRows
              contact={plantData.marketingContact}
              dbContact={dbPlantMarketingContact}
              editable={isEditMode || editableSection === 'plant-marketing'}
              onChange={(key, value) =>
                setEditablePlantData((prev) => ({
                  ...prev,
                  marketingContact: { ...prev.marketingContact, [key]: value },
                }))
              }
            />
            {sectionActions(
              false,
              onCreateMarketingPlantContact ?? onCreateNew,
              contactSectionActionable && !!selectedMatch && !createdPlantContacts.marketing,
              false,
              false,
              selectedMatch && !isCreatedPlant ? 'Create as Other' : undefined
            )}
          </ComparisonCard>
        </>
      )}
    </div>
  )
}

function formatSubmittedCityStateZip(
  city?: string,
  state?: string,
  zip?: string
) {
  return [city, state, zip].filter((value) => (value ?? '').trim() !== '').join(', ')
}

type ContactData = {
  name?: string
  title?: string
  phone?: string
  email?: string
}

function ContactRows({
  contact,
  dbContact,
  editable,
  onChange,
}: {
  contact?: ContactData
  dbContact?: PlantFromApplicationContact
  editable: boolean
  onChange: (key: keyof ContactData, value: string) => void
}) {
  const title = pickFirstNonEmpty(dbContact?.companytitle, dbContact?.Title)
  const phone = pickFirstNonEmpty(dbContact?.Cell, dbContact?.Voice)
  const email = pickFirstNonEmpty(dbContact?.EMail)

  return (
    <>
      <ComparisonRow
        field="Name"
        appValue={contact?.name || ''}
        dbValue={formatContactName(dbContact) || 'Not on file'}
        status={getComparisonStatus(contact?.name, formatContactName(dbContact))}
        editable={editable}
        onAppValueChange={(value) => onChange('name', value)}
      />
      <ComparisonRow
        field="Title"
        appValue={contact?.title || ''}
        dbValue={title || 'Not on file'}
        status={getComparisonStatus(contact?.title, title)}
        editable={editable}
        onAppValueChange={(value) => onChange('title', value)}
      />
      <ComparisonRow
        field="Phone"
        appValue={contact?.phone || ''}
        dbValue={phone || 'Not on file'}
        status={getComparisonStatus(contact?.phone, phone)}
        editable={editable}
        onAppValueChange={(value) => onChange('phone', value)}
      />
      <ComparisonRow
        field="Email"
        appValue={contact?.email || ''}
        dbValue={email || 'Not on file'}
        status={getComparisonStatus(contact?.email, email)}
        editable={editable}
        onAppValueChange={(value) => onChange('email', value)}
      />
    </>
  )
}

function ComparisonCard({
  title,
  badge,
  badgeClass,
  note,
  isLast = false,
  editable = false,
  isEditing = false,
  onToggleEdit,
  children,
}: {
  title: string
  badge?: string
  badgeClass?: string
  note?: string
  isLast?: boolean
  editable?: boolean
  isEditing?: boolean
  onToggleEdit?: () => void
  children: ReactNode
}) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${isLast ? '' : 'mb-4'}`}>
      <div className="border-y border-slate-200 bg-slate-100 px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {badge && (
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-wide ${badgeClass}`}
            >
              {badge}
            </span>
          )}
          <h4 className="text-[13.5px] font-semibold tracking-wide text-slate-600">{title}</h4>
          {note && <span className="text-xs italic text-gray-500">{note}</span>}
        </div>
        {onToggleEdit && (
          <button
            type="button"
            onClick={onToggleEdit}
            disabled={!editable}
            title={isEditing ? 'Stop editing submitted values' : 'Edit submitted values'}
            aria-label={isEditing ? 'Stop editing submitted values' : 'Edit submitted values'}
            className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border transition-colors ${
              editable
                ? isEditing
                  ? 'border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300'
            }`}
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function ComparisonRow({
  field,
  appValue,
  dbValue,
  status,
  editable = false,
  onAppValueChange,
}: {
  field: string
  appValue: string
  dbValue: string
  status: ComparisonStatus
  editable?: boolean
  onAppValueChange?: (value: string) => void
}) {
  const getStatusStyles = () => {
    if (status === 'match') {
      return {
        textClass: 'text-green-700',
        badgeClass: 'bg-green-100 text-green-600',
        icon: 'v',
      }
    }
    if (status === 'mismatch') {
      return {
        textClass: 'text-red-700',
        badgeClass: 'bg-red-100 text-red-500',
        icon: 'x',
      }
    }
    if (status === 'not-on-file') {
      return {
        textClass: 'text-blue-700',
        badgeClass: 'bg-blue-100 text-blue-500',
        icon: '+',
      }
    }
    return {
      textClass: 'text-gray-500',
      badgeClass: 'bg-gray-100 text-gray-400',
      icon: '.',
    }
  }

  const statusStyles = getStatusStyles()

  return (
    <div className="grid grid-cols-12 gap-4 border-b border-gray-100 px-4 py-[14px] transition-colors hover:bg-gray-50">
      <div className="col-span-3 bg-[#fafbfc] text-sm font-medium text-gray-700">
        {field}
      </div>
      <div className="col-span-4 min-w-0 break-words text-[15px] text-gray-900 [overflow-wrap:anywhere]">
        {editable && onAppValueChange ? (
          <input
            value={appValue}
            onChange={(e) => onAppValueChange(e.target.value)}
            className="w-full min-w-0 rounded border-[1.5px] border-[#fbbf24] bg-amber-50 px-2.5 py-1.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        ) : (
          appValue || <span className="text-gray-400 italic">Empty</span>
        )}
      </div>
      <div className="col-span-4 min-w-0 break-words text-[15px] text-gray-600 [overflow-wrap:anywhere]">
        {dbValue === 'Not on file' ? (
          <span className="italic text-gray-400">{dbValue}</span>
        ) : (
          dbValue || <span className="text-gray-400 italic">Empty</span>
        )}
      </div>
      <div className={`col-span-1 flex items-center justify-center ${statusStyles.textClass}`}>
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${statusStyles.badgeClass}`}
        >
          {statusStyles.icon}
        </span>
      </div>
    </div>
  )
}
