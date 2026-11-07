import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageShell } from './PageShell'

const container = () => screen.getByText('content').parentElement as HTMLElement

describe('PageShell width', () => {
  it('caps menu pages at the standard width by default', () => {
    render(<PageShell><p>content</p></PageShell>)
    expect(container().className).toContain('max-w-7xl')
    expect(container().className).not.toContain('max-w-none')
  })

  it('uses the full window width (keeping the gutters) when wide', () => {
    render(<PageShell wide><p>content</p></PageShell>)
    expect(container().className).toContain('max-w-none')
    expect(container().className).not.toContain('max-w-7xl')
    expect(container().className).toContain('px-4')
  })
})

describe('PageShell fixed height', () => {
  it('uses the given height instead of min-h-screen and lays children out as a flex column', () => {
    render(<PageShell fixedHeightClassName="h-dvh"><p>content</p></PageShell>)
    const outer = container().parentElement as HTMLElement
    expect(outer.classList.contains('h-dvh')).toBe(true)
    expect(outer.classList.contains('min-h-screen')).toBe(false)
    expect(container().className).toContain('flex h-full flex-col')
  })
})
