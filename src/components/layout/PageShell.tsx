import type { ReactNode } from 'react'

type PageShellProps = {
  children: ReactNode
  className?: string
}

/**
 * Shared outer layout for authenticated menu pages.
 * Navigation spacing is owned by the authenticated route layout, while this
 * shell keeps page width and responsive horizontal gutters consistent.
 */
export function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}
