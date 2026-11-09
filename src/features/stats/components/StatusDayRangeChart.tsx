import { useState } from 'react'

import type { StatusSeriesView } from '../model/statusSeries'

const HEIGHT = 300
const PLOT_TOP = 24
const BASELINE = 244
const PLOT_LEFT = 52
const PLOT_RIGHT = 16
const BAR_GAP = 2 // surface gap between adjacent bars
const MAX_BAR_WIDTH = 32

type Hovered = { status: string; label: string; dayRange: string; value: number; x: number; y: number }

/** A bar with 4px rounded top corners, anchored square on the baseline. */
const barPath = (x: number, top: number, width: number) => {
  const r = Math.min(4, width / 2, BASELINE - top)
  return `M${x},${BASELINE} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${BASELINE} Z`
}

/**
 * Grouped columns: one group per day range, one bar per status, so each status can be compared
 * across ranges and the statuses within a range. Exact counts are in the table below; hovering a
 * bar shows its status, range and count.
 */
export function StatusDayRangeChart({
  dayRanges,
  series,
}: {
  dayRanges: string[]
  series: StatusSeriesView[]
}) {
  const [hovered, setHovered] = useState<Hovered | null>(null)
  const plotted = series.filter((status) => status.total > 0)
  const max = Math.max(1, ...plotted.flatMap((status) => [...status.byRange.values()]))
  const step = Math.max(1, Math.ceil(max / 5))
  const ceiling = step * Math.ceil(max / step)
  const groupWidth = Math.max(140, plotted.length * (MAX_BAR_WIDTH + BAR_GAP) + 48)
  // Drawn near the card's real width so text and marks stay close to 1:1 instead of scaling up.
  const width = Math.max(1000, PLOT_LEFT + PLOT_RIGHT + dayRanges.length * groupWidth)
  const plotWidth = width - PLOT_LEFT - PLOT_RIGHT
  const slot = plotWidth / Math.max(1, dayRanges.length)
  const barWidth = Math.min(MAX_BAR_WIDTH, (slot * 0.7) / Math.max(1, plotted.length) - BAR_GAP)
  const clusterWidth = plotted.length * (barWidth + BAR_GAP) - BAR_GAP
  const yFor = (value: number) => BASELINE - (value / ceiling) * (BASELINE - PLOT_TOP)

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-700" aria-label="Statuses">
        {series.map((status) => (
          <li key={status.status} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: status.color }}
              aria-hidden="true"
            />
            {status.label}
            {status.total === 0 ? <span className="text-gray-400">(none)</span> : null}
          </li>
        ))}
      </ul>
      <div className="relative overflow-x-auto">
        <svg
          role="img"
          aria-label="Applications by status and day range"
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="w-full min-w-[600px]"
          onMouseLeave={() => setHovered(null)}
        >
          <desc>
            Grouped columns: for each day range, one column per status. Exact counts appear in the
            table below.
          </desc>
          {Array.from({ length: ceiling / step + 1 }, (_, index) => index * step).map((tick) => (
            <g key={tick}>
              <line
                x1={PLOT_LEFT}
                x2={width - PLOT_RIGHT}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke={tick === 0 ? '#94a3b8' : '#e2e8f0'}
              />
              <text x={PLOT_LEFT - 8} y={yFor(tick) + 4} textAnchor="end" fontSize="12" fill="#64748b">
                {tick}
              </text>
            </g>
          ))}
          {dayRanges.map((dayRange, rangeIndex) => {
            const clusterLeft = PLOT_LEFT + rangeIndex * slot + (slot - clusterWidth) / 2
            return (
              <g key={dayRange}>
                {plotted.map((status, statusIndex) => {
                  const value = status.byRange.get(dayRange) ?? 0
                  const x = clusterLeft + statusIndex * (barWidth + BAR_GAP)
                  const top = yFor(value)
                  const isHovered = hovered?.status === status.status && hovered.dayRange === dayRange
                  return (
                    <g key={status.status}>
                      {value > 0 ? (
                        <path
                          d={barPath(x, top, barWidth)}
                          fill={status.color}
                          opacity={hovered && !isHovered ? 0.45 : 1}
                        />
                      ) : null}
                      {/* Hit target: the bar's whole column, so short bars are easy to hover. */}
                      <rect
                        x={x - BAR_GAP / 2}
                        y={PLOT_TOP}
                        width={barWidth + BAR_GAP}
                        height={BASELINE - PLOT_TOP}
                        fill="transparent"
                        onMouseEnter={() =>
                          setHovered({
                            status: status.status,
                            label: status.label,
                            dayRange,
                            value,
                            x: x + barWidth / 2,
                            y: top,
                          })
                        }
                      >
                        <title>
                          {status.label}, {dayRange}: {value} applications
                        </title>
                      </rect>
                    </g>
                  )
                })}
                <text
                  x={PLOT_LEFT + rangeIndex * slot + slot / 2}
                  y={BASELINE + 22}
                  textAnchor="middle"
                  fontSize="13"
                  fill="#475569"
                >
                  {dayRange}
                </text>
              </g>
            )
          })}
          <text x={PLOT_LEFT + plotWidth / 2} y={HEIGHT - 6} textAnchor="middle" fontSize="12" fill="#475569">
            Day range
          </text>
        </svg>
        {hovered ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-md"
            style={{ left: `${(hovered.x / width) * 100}%`, top: `${(hovered.y / HEIGHT) * 100}%` }}
          >
            <div className="font-semibold text-gray-900">{hovered.label}</div>
            <div className="text-gray-600">
              {hovered.dayRange}: <span className="font-medium text-gray-900">{hovered.value.toLocaleString()}</span>{' '}
              applications
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
