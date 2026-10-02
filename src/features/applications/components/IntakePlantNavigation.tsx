import { useState } from 'react'
import { Beaker, ChevronRight, Factory, FileText, Package } from 'lucide-react'
import type { ApplicationDetail } from '@/types/application'
import { getIntakePlantApplication } from '../model/intakePlantDetails'

export type IntakePlantSection = 'plants' | 'products' | 'ingredients'

export function IntakePlantNavigation({
  application,
  selectedIndex,
  activeSection,
  onSelect,
}: {
  application: ApplicationDetail
  selectedIndex: number
  activeSection?: string
  onSelect: (index: number, section: IntakePlantSection) => void
}) {
  const [collapsed, setCollapsed] = useState<number[]>([])
  return (
    <div className="py-2">
      <div className="mb-2 flex items-center justify-between px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Plants</span>
        <span>{application.plants.length}</span>
      </div>
      {application.plants.length === 0 && (
        <p className="px-3 py-2 text-sm text-slate-500">No plants submitted</p>
      )}
      <ul className="space-y-2">
        {application.plants.map((plant, index) => {
          const expanded = !collapsed.includes(index)
          const selected =
            index === selectedIndex &&
            ['plants', 'products', 'ingredients'].includes(activeSection ?? '')
          const scoped = getIntakePlantApplication(application, index)
          const label = plant.name.trim() || `Plant ${plant.id || index + 1}`
          return (
            <li key={`${plant.plantId}-${index}`}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label}`}
                onClick={() =>
                  setCollapsed(
                    expanded ? [...collapsed, index] : collapsed.filter((item) => item !== index),
                  )
                }
                className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-600 ${selected ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <ChevronRight
                  aria-hidden="true"
                  className={`mt-0.5 h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
                <Factory aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">
                  <span className="mb-0.5 block text-xs font-normal text-slate-500">
                    Plant {plant.id || index + 1}
                  </span>
                  {label}
                </span>
              </button>
              {expanded && (
                <ul
                  aria-label={`${label} sections`}
                  className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-3"
                >
                  {(
                    [
                      { section: 'plants', label: 'Details', icon: FileText, count: undefined },
                      {
                        section: 'products',
                        label: 'Products',
                        icon: Package,
                        count: scoped.products.length,
                      },
                      {
                        section: 'ingredients',
                        label: 'Ingredients',
                        icon: Beaker,
                        count: scoped.ingredients?.length ?? 0,
                      },
                    ] as const
                  ).map((item) => (
                    <li key={item.section}>
                      <button
                        type="button"
                        aria-label={item.count === undefined ? item.label : `${item.label} ${item.count}`}
                        aria-current={
                          selected && activeSection === item.section ? 'page' : undefined
                        }
                        onClick={() => onSelect(index, item.section)}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-blue-600 ${selected && activeSection === item.section ? 'bg-blue-100 font-semibold text-blue-800' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        <item.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                        {item.count !== undefined && (
                          <span className="ml-auto rounded bg-white/70 px-1.5 text-xs tabular-nums">
                            {item.count}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
