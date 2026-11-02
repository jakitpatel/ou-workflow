import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ModalSurface, ModalFocusBoundary } from './ModalSurface'
import { ErrorDialog, type ErrorDialogRef } from '@/components/ErrorDialog'
import { createRef } from 'react'
afterEach(cleanup)
it('contains forward/backward Tab, focuses initially, dismisses Escape and restores opener', async () => {
  function Harness() {
    const [open, setOpen] = useState(false)
    return <><button onClick={() => setOpen(true)}>Open</button><button>Behind</button>{open && <ModalSurface onClose={() => setOpen(false)} label="Example"><button>First</button><input aria-label="Middle" /><button>Last</button></ModalSurface>}</>
  }
  render(<Harness />)
  const opener = screen.getByText('Open'); opener.focus(); fireEvent.click(opener)
  await waitFor(() => expect(document.activeElement).toBe(screen.getByText('First')))
  screen.getByText('Last').focus(); fireEvent.keyDown(document.activeElement!, { key: 'Tab' })
  expect(document.activeElement).toBe(screen.getByText('First'))
  fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true })
  expect(document.activeElement).toBe(screen.getByText('Last'))
  screen.getByText('Behind').focus()
  expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await waitFor(() => expect(document.activeElement).toBe(opener))
})
it('only dismisses the nested dialog and resumes its parent focus scope', async () => {
  const parentClose = vi.fn()
  function Harness() {
    const [child, setChild] = useState(false)
    return <ModalFocusBoundary><ModalSurface label="Parent" onClose={parentClose}><button onClick={() => setChild(true)}>Child</button>{child && <ModalSurface label="Nested" onClose={() => setChild(false)}><button>Nested close</button></ModalSurface>}</ModalSurface></ModalFocusBoundary>
  }
  render(<Harness />); const opener = screen.getByText('Child'); opener.focus(); fireEvent.click(opener)
  await waitFor(() => expect(document.activeElement).toBe(screen.getByText('Nested close')))
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nested' })).toBeNull())
  expect(parentClose).not.toHaveBeenCalled()
  await waitFor(() => expect(document.activeElement).toBe(opener))
})
it('keeps a pending dialog open on Escape', () => {
  const close = vi.fn(); render(<ModalSurface onClose={close} dismissible={false}><button>Saving</button></ModalSurface>)
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' }); expect(close).not.toHaveBeenCalled()
})
it('restores the actual opener for the existing ErrorDialog primitive', async () => {
  const ref = createRef<ErrorDialogRef>()
  render(<><button onClick={() => ref.current?.open('Failure')}>Show error</button><ErrorDialog ref={ref} /></>)
  const opener = screen.getByText('Show error'); opener.focus(); fireEvent.click(opener)
  await screen.findByRole('dialog'); fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await waitFor(() => expect(document.activeElement).toBe(opener))
})
