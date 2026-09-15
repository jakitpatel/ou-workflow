import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ScheduleRoundEmailCopies } from './ScheduleRoundEmailCopies'

it('starts hidden, retains recipients when toggled, and reports invalid addresses', () => {
  function Draft() {
    const [copies, setCopies] = useState({ cc: '', bcc: '' })
    return <ScheduleRoundEmailCopies {...copies}
      onChange={(field, value) => setCopies((current) => ({ ...current, [field]: value }))} />
  }
  render(<Draft />)
  expect(screen.queryByRole('textbox', { name: 'Email Cc' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Show Cc/Bcc' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Email Cc' }), { target: { value: 'copy@example.com' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Email Bcc' }), { target: { value: 'invalid' } })
  expect(screen.getByText('Invalid email: invalid')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Hide Cc/Bcc' }))
  expect(screen.queryByRole('textbox', { name: 'Email Cc' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Show Cc/Bcc' }))
  expect((screen.getByRole('textbox', { name: 'Email Cc' }) as HTMLInputElement).value).toBe('copy@example.com')
  expect((screen.getByRole('textbox', { name: 'Email Bcc' }) as HTMLInputElement).value).toBe('invalid')
})
