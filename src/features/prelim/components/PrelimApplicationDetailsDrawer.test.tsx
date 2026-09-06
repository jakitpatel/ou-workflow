import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Applicant } from '@/types/application'
import { PrelimApplicationDetailsDrawer } from './PrelimApplicationDetailsDrawer'

vi.mock('@/features/applications/components/ApplicationDetailsContent', () => ({
  ApplicationDetailsContent: ({ applicationId }: { applicationId: string }) => (
    <div data-testid="message-application-id">{applicationId}</div>
  ),
}))

describe('PrelimApplicationDetailsDrawer', () => {
  it('uses the list application ID when the detail response only has an external reference', () => {
    render(
      <PrelimApplicationDetailsDrawer
        open
        externalReferenceId={820}
        applicant={{ applicationId: 3719, externalReferenceId: 820 } as Applicant}
        data={{ externalReferenceId: 820 }}
        isLoading={false}
        error={null}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText('AppId: 3719')).toBeTruthy()
    expect(screen.getByTestId('message-application-id').textContent).toBe('3719')
  })
})
