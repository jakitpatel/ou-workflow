import type { ChangeEvent, Dispatch, ReactNode, SetStateAction } from 'react'
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
  onConfirmEdit: () => void
  onConfirmMatch: () => void | Promise<void>
  onCancelEdit: () => void
  onSaveAndConfirm: () => void | Promise<void>
  drawerActionable: boolean
  contactSectionActionable: boolean
  isCreatingNew: boolean
  isSubmitting: boolean
  isEditMode: boolean
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
  onConfirmEdit,
  onConfirmMatch,
  onCancelEdit,
  onSaveAndConfirm,
  drawerActionable,
  contactSectionActionable,
  isCreatingNew,
  isSubmitting,
  isEditMode,
}: Props) {
  const sectionActions = (
    isActionable: boolean,
    onCreateNewAction: () => void | Promise<void> = onCreateNew,
    canCreate?: boolean
  ) => (
    <PrelimResolutionActions
      selectedMatch={selectedMatch}
      onCreateNew={onCreateNewAction}
      canCreate={canCreate}
      onConfirmEdit={onConfirmEdit}
      onConfirmMatch={onConfirmMatch}
      onCancelEdit={onCancelEdit}
      onSaveAndConfirm={onSaveAndConfirm}
      isActionable={isActionable}
      isCreatingNew={isCreatingNew}
      isSubmitting={isSubmitting}
      isEditMode={isEditMode}
    />
  )

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
            </option>
          ))}
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
          <ComparisonCard title="Company Information">
            <ComparisonRow
              field="Company Name"
              appValue={companyData.companyName}
              dbValue={getCompanyName(companyDb) || selectedMatch?.companyName || 'Not on file'}
              status={getComparisonStatus(
                companyData.companyName,
                getCompanyName(companyDb) || selectedMatch?.companyName
              )}
              editable={isEditMode}
              onAppValueChange={(value) =>
                setEditableCompanyData((prev) => ({ ...prev, companyName: value }))
              }
            />
            <ComparisonRow
              field="DBA / Trade Name"
              appValue={companyData.companyName}
              dbValue="Not on file"
              status="not-on-file"
              editable={isEditMode}
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
              editable={isEditMode}
              onAppValueChange={(value) =>
                setEditableCompanyData((prev) => ({ ...prev, companyAddress: value }))
              }
            />
            <ComparisonRow
              field="City / State / ZIP"
              appValue={companyData.companyCity || ''}
              dbValue={
                formatAddressCityStateZip(dbCompanyAddress) ||
                selectedMatch?.City ||
                'Not on file'
              }
              status={getComparisonStatus(
                companyData.companyCity,
                dbCompanyAddress?.city || selectedMatch?.City
              )}
              editable={isEditMode}
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
              editable={isEditMode}
              onAppValueChange={(value) =>
                setEditableCompanyData((prev) => ({ ...prev, companyCountry: value }))
              }
            />
            <ComparisonRow
              field="Website"
              appValue={companyData.companyWebsite || ''}
              dbValue={companyDb?.companyWebsite || 'Not on file'}
              status={getComparisonStatus(companyData.companyWebsite, companyDb?.companyWebsite)}
              editable={isEditMode}
              onAppValueChange={(value) =>
                setEditableCompanyData((prev) => ({ ...prev, companyWebsite: value }))
              }
            />
            {sectionActions(drawerActionable)}
          </ComparisonCard>

          <ComparisonCard title="Company Contact" badge="PRIMARY" badgeClass="bg-blue-100 text-blue-800">
            <ContactRows
              contact={companyData.primaryContact}
              dbContact={dbCompanyPrimaryContact}
              editable={isEditMode}
              onChange={(key, value) =>
                setEditableCompanyData((prev) => ({
                  ...prev,
                  primaryContact: { ...prev.primaryContact, [key]: value },
                }))
              }
            />
            {sectionActions(
              contactSectionActionable,
              onCreatePrimaryCompanyContact ?? onCreateNew,
              contactSectionActionable && !!selectedMatch
            )}
          </ComparisonCard>

          <ComparisonCard title="Contact" badge="BILLING" badgeClass="bg-amber-100 text-amber-800">
            <ContactRows
              contact={companyData.billingContact}
              dbContact={dbCompanyBillingContact}
              editable={isEditMode}
              onChange={(key, value) =>
                setEditableCompanyData((prev) => ({
                  ...prev,
                  billingContact: { ...prev.billingContact, [key]: value },
                }))
              }
            />
            {sectionActions(
              contactSectionActionable,
              onCreateBillingCompanyContact ?? onCreateNew,
              contactSectionActionable && !!selectedMatch
            )}
          </ComparisonCard>
        </>
      ) : (
        <>
          <ComparisonCard title="Plant Information">
            <ComparisonRow
              field="Plant Name"
              appValue={plantData.plantName}
              dbValue={getPlantName(plantDb) || selectedMatch?.plantName || 'Not on file'}
              status={getComparisonStatus(
                plantData.plantName,
                getPlantName(plantDb) || selectedMatch?.plantName
              )}
              editable={isEditMode}
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
              editable={isEditMode}
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
              editable={isEditMode}
              onAppValueChange={(value) =>
                setEditablePlantData((prev) => ({ ...prev, plantCity: value }))
              }
            />
            <ComparisonRow
              field="Process Description"
              appValue={plantData.processDescription || ''}
              dbValue={plantDb?.brieflySummarize || 'Not on file'}
              status={getComparisonStatus(plantData.processDescription, plantDb?.brieflySummarize)}
              editable={isEditMode}
              onAppValueChange={(value) =>
                setEditablePlantData((prev) => ({ ...prev, processDescription: value }))
              }
            />
            {sectionActions(drawerActionable)}
          </ComparisonCard>

          <ComparisonCard title="Plant Contact" badge="PRIMARY" badgeClass="bg-blue-100 text-blue-800">
            <ContactRows
              contact={plantData.primaryContact}
              dbContact={dbPlantPrimaryContact}
              editable={isEditMode}
              onChange={(key, value) =>
                setEditablePlantData((prev) => ({
                  ...prev,
                  primaryContact: { ...prev.primaryContact, [key]: value },
                }))
              }
            />
            {sectionActions(contactSectionActionable)}
          </ComparisonCard>

          <ComparisonCard
            title="Contact"
            badge="MARKETING"
            badgeClass="bg-violet-100 text-violet-700"
            note="- Not currently in Kashrus"
            isLast
          >
            <ContactRows
              contact={plantData.marketingContact}
              dbContact={dbPlantMarketingContact}
              editable={isEditMode}
              onChange={(key, value) =>
                setEditablePlantData((prev) => ({
                  ...prev,
                  marketingContact: { ...prev.marketingContact, [key]: value },
                }))
              }
            />
            {sectionActions(contactSectionActionable)}
          </ComparisonCard>
        </>
      )}
    </div>
  )
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
  children,
}: {
  title: string
  badge?: string
  badgeClass?: string
  note?: string
  isLast?: boolean
  children: ReactNode
}) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${isLast ? '' : 'mb-4'}`}>
      <div className="border-y border-slate-200 bg-slate-100 px-4 py-2 flex items-center gap-2">
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
      <div className="col-span-4 text-[15px] text-gray-900">
        {editable && onAppValueChange ? (
          <input
            value={appValue}
            onChange={(e) => onAppValueChange(e.target.value)}
            className="w-full rounded border-[1.5px] border-[#fbbf24] bg-amber-50 px-2.5 py-1.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        ) : (
          appValue || <span className="text-gray-400 italic">Empty</span>
        )}
      </div>
      <div className="col-span-4 text-[15px] text-gray-600">
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
