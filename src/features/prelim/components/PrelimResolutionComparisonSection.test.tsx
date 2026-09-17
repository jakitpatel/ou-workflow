import { useState } from 'react'
import type { CompanyData, PlantData } from '../model/resolution'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PrelimResolutionComparisonSection } from './PrelimResolutionComparisonSection'
import { createDefaultCompanyData, createDefaultPlantData } from '../lib/prelimResolution'

const noop = () => {}

function Harness({ isCompany }: { isCompany: boolean }) {
  const [companyData, setEditableCompanyData] = useState<CompanyData>({
    ...createDefaultCompanyData(),
    companyCity: 'New York',
    companyState: 'NY',
    ZipPostalCode: '00123',
  })
  const [plantData, setEditablePlantData] = useState<PlantData>({
    ...createDefaultPlantData(),
    plantCity: 'New York',
    plantState: 'NY',
    plantZip: '00123',
  })
  return (
    <>
      <output data-testid="saved-address">
        {JSON.stringify(
          isCompany
            ? [companyData.companyCity, companyData.companyState, companyData.ZipPostalCode]
            : [plantData.plantCity, plantData.plantState, plantData.plantZip],
        )}
      </output>
      <PrelimResolutionComparisonSection
        isCompany={isCompany}
        companyData={companyData}
        plantData={plantData}
        setEditableCompanyData={setEditableCompanyData}
        setEditablePlantData={setEditablePlantData}
        ignoredContacts={{}}
        onToggleIgnoreContact={noop}
        matches={[]}
        selectedMatch={null}
        isManualCompanyIdEntry={false}
        manualCompanyId=""
        onManualCompanyIdChange={noop}
        onLoadManualCompanyId={noop}
        isFetchingManualCompany={false}
        isManualCompanyError={false}
        isManualPlantIdEntry={false}
        manualPlantId=""
        onManualPlantIdChange={noop}
        onLoadManualPlantId={noop}
        isFetchingManualPlant={false}
        isManualPlantError={false}
        onMatchChange={noop}
        onCreateNew={noop}
        onConfirmEdit={noop}
        onConfirmMatch={noop}
        onCancelEdit={noop}
        onSaveAndConfirm={noop}
        drawerActionable
        contactSectionActionable
        isCreatedCompany={false}
        isCreatedPlant={false}
        isCompanyMatchConfirmed={false}
        isPlantMatchConfirmed={false}
        createdCompanyContacts={{ primary: false, billing: false }}
        createdPlantContacts={{ primary: false, marketing: false }}
        isCreatingNew={false}
        isSubmitting={false}
        isEditMode={false}
        showSectionActions={false}
      />
    </>
  )
}

describe.each([true, false])('Resolution address editing (company=%s)', (isCompany) => {
  it('edits each address part independently without repeating state or ZIP', () => {
    render(<Harness isCompany={isCompany} />)
    expect(screen.getByText('New York, NY, 00123')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit submitted values' })[0])
    for (const value of ['New York C', 'New York Ci', 'New York City']) {
      fireEvent.change(screen.getByLabelText('City'), { target: { value } })
      expect((screen.getByLabelText('City') as HTMLInputElement).value).toBe(value)
      expect(screen.getByTestId('saved-address').textContent).toBe(
        JSON.stringify([value, 'NY', '00123']),
      )
    }
    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'New York State' } })
    fireEvent.change(screen.getByLabelText('ZIP'), { target: { value: '00123-4567' } })
    expect(screen.getByTestId('saved-address').textContent).toBe(
      JSON.stringify(['New York City', 'New York State', '00123-4567']),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Stop editing submitted values' }))
    expect(screen.getByText('New York City, New York State, 00123-4567')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit submitted values' })[0])
    for (const label of ['City', 'State', 'ZIP']) {
      fireEvent.change(screen.getByLabelText(label), { target: { value: '' } })
    }
    expect(screen.getByTestId('saved-address').textContent).toBe('["","",""]')
  })
})
