import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CommunicationReplyCard, CommunicationRoundCard } from './CommunicationRoundCard'

const renderCard = (defaultOpen?: boolean) =>
  render(
    <CommunicationRoundCard
      header={<span>Round 2</span>}
      summary={<div>To: company@example.test</div>}
      defaultOpen={defaultOpen}
    >
      <p>Message body</p>
    </CommunicationRoundCard>,
  )

describe('CommunicationRoundCard', () => {
  it('is collapsed by default, showing the header and summary only', () => {
    renderCard()
    const toggle = screen.getByRole('button', { name: /Round 2/ })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.hasAttribute('aria-controls')).toBe(false)
    expect(screen.getByText('To: company@example.test')).toBeTruthy()
    expect(screen.queryByText('Message body')).toBeNull()
  })

  it('expands and collapses when the header is clicked', () => {
    renderCard()
    const toggle = screen.getByRole('button', { name: /Round 2/ })

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const details = screen.getByText('Message body').parentElement!
    expect(toggle.getAttribute('aria-controls')).toBe(details.id)

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Message body')).toBeNull()
    expect(screen.getByText('To: company@example.test')).toBeTruthy()
  })

  it('can start open', () => {
    renderCard(true)
    expect(screen.getByText('Message body')).toBeTruthy()
  })
})

describe('CommunicationReplyCard', () => {
  const renderReply = () =>
    render(
      <CommunicationReplyCard header={<span>Reply From company@example.test</span>} summary={<div>Subject: RE: Round 1</div>}>
        <p>Reply body</p>
      </CommunicationReplyCard>,
    )

  it('is collapsed by default and toggles its text from the header', () => {
    renderReply()
    const toggle = screen.getByRole('button', { name: /Reply From company/ })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByText('Subject: RE: Round 1')).toBeTruthy()
    expect(screen.queryByText('Reply body')).toBeNull()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.getAttribute('aria-controls')).toBe(screen.getByText('Reply body').parentElement!.id)

    fireEvent.click(toggle)
    expect(screen.queryByText('Reply body')).toBeNull()
  })
})
