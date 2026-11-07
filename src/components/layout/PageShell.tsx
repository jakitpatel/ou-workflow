import type { ReactNode } from 'react'

type PageShellProps = {
  children: ReactNode
  className?: string
  /** Use the full window width (keeping the gutters) instead of the 80rem cap, for wide tables. */
  wide?: boolean
  /**
   * A fixed height (e.g. the visible area below the navigation) instead of min-h-screen. The page
   * then doesn't scroll; children are a flex column, so one of them can fill and scroll itself.
   */
  fixedHeightClassName?: string
}

/**
 * Shared outer layout for authenticated menu pages.
 * Navigation spacing is owned by the authenticated route layout, while this
 * shell keeps page width and responsive horizontal gutters consistent.
 */
export function PageShell({
  children,
  className = '',
  wide = false,
  fixedHeightClassName,
}: PageShellProps) {
  const heightClass = fixedHeightClassName ?? 'min-h-screen'
  const columnClass = fixedHeightClassName ? 'flex h-full flex-col' : ''
  return (
    <div className={`${heightClass} bg-gray-50 ${className}`}>
      <div
        className={`mx-auto w-full ${wide ? 'max-w-none' : 'max-w-7xl'} px-4 sm:px-6 lg:px-8 ${columnClass}`}
      >
        {children}
      </div>
    </div>
  )
}
