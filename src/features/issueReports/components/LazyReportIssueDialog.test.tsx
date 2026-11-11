import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LazyReportIssueDialog } from './LazyReportIssueDialog'
import { REPORT_ISSUE_OVERLAY_CLASS } from './ReportIssueDialog'

vi.mock('./ReportIssueDialog', () => ({
  REPORT_ISSUE_OVERLAY_CLASS: 'fixed inset-0 z-[100] pointer-events-auto flex items-center justify-center bg-black/40 p-4',
  ReportIssueDialog: () => <div role="dialog" aria-label="Report an Issue" />,
}))

const zIndexOf = (className: string) => Number(/(?:^|\s)z-\[?(\d+)\]?(?:\s|$)/.exec(className)?.[1] ?? NaN)

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : []
  })
}

describe('LazyReportIssueDialog', () => {
  it('renders into <body>, outside the navigation that opened it', async () => {
    render(
      <nav data-testid="nav" className="fixed z-50 backdrop-blur">
        <LazyReportIssueDialog onClose={vi.fn()} />
      </nav>,
    )
    const dialog = await screen.findByRole('dialog', { name: 'Report an Issue' })
    expect(screen.getByTestId('nav').contains(dialog)).toBe(false)
    expect(dialog.parentElement?.closest('nav')).toBeNull()
  })

  it('sits above every drawer and stays clickable when a drawer disables pointer events on <body>', async () => {
    const actual = await vi.importActual<typeof import('./ReportIssueDialog')>('./ReportIssueDialog')
    expect(actual.REPORT_ISSUE_OVERLAY_CLASS).toBe(REPORT_ISSUE_OVERLAY_CLASS)
    expect(actual.REPORT_ISSUE_OVERLAY_CLASS).toContain('pointer-events-auto')

    const highestElsewhere = Math.max(
      ...sourceFiles(join(process.cwd(), 'src'))
        .filter((file) => !file.includes(join('features', 'issueReports')))
        .flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/\bz-\[?(\d+)\]?/g)].map((match) => Number(match[1]))),
    )
    expect(zIndexOf(actual.REPORT_ISSUE_OVERLAY_CLASS)).toBeGreaterThan(highestElsewhere)
  })
})
