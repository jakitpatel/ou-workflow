import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'

import { PageShell } from '@/components/layout/PageShell'
import { useUser } from '@/context/UserContext'

import { type ApplicationStat, fetchStats } from '../api/stats'

export function StatsChart({ data }: { data: ApplicationStat[] }) {
  const max = Math.max(1, ...data.map((row) => row.totalApps))
  const step = Math.max(1, Math.ceil(max / 5))
  const ceiling = step * Math.ceil(max / step)
  const width = Math.max(600, data.length * 110 + 100)
  const barWidth = (width - 100) / Math.max(1, data.length)
  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Applications by day range"
        viewBox={`0 0 ${width} 380`}
        className="w-full min-w-[600px]"
      >
        <desc>
          Each column shows applications in a day range. Exact counts appear in the table below.
        </desc>
        <text x="60" y="22" fontSize="12" fill="#475569">
          Number of applications
        </text>
        {Array.from({ length: ceiling / step + 1 }, (_, index) => index * step).map((tick) => {
          const y = 300 - (tick / ceiling) * 240
          return (
            <g key={tick}>
              <line x1="60" x2={width - 40} y1={y} y2={y} stroke="#e2e8f0" />
              <text x="48" y={y + 4} textAnchor="end" fontSize="12" fill="#64748b">
                {tick}
              </text>
            </g>
          )
        })}
        {data.map((row, index) => {
          const x = 60 + index * barWidth
          const height = (row.totalApps / ceiling) * 240
          return (
            <g key={`${row.dayRange}-${index}`}>
              <rect
                x={x}
                y={300 - height}
                width={barWidth}
                height={height}
                fill="#2563eb"
                stroke="white"
                strokeWidth="1"
              >
                <title>
                  {row.dayRange}: {row.totalApps} applications
                </title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={288 - height}
                textAnchor="middle"
                fontSize="15"
                fontWeight="600"
                fill="#1e3a8a"
              >
                {row.totalApps.toLocaleString()}
              </text>
              <text x={x + barWidth / 2} y="325" textAnchor="middle" fontSize="13" fill="#475569">
                {row.dayRange}
              </text>
            </g>
          )
        })}
        <text x={width / 2} y="365" textAnchor="middle" fontSize="12" fill="#475569">
          Day range
        </text>
      </svg>
    </div>
  )
}

export function StatsPage() {
  const { token, username } = useUser()
  const stats = useQuery({
    queryKey: ['stats', username],
    queryFn: () => fetchStats(token),
    enabled: !!token,
    staleTime: 60_000,
  })
  const data = stats.data ?? []
  const total = data.reduce((sum, row) => sum + row.totalApps, 0)
  return (
    <PageShell>
      <div className="space-y-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stats</h1>
            <p className="mt-1 text-sm text-gray-600">Application distribution by day range</p>
          </div>
          <button
            type="button"
            disabled={stats.isFetching || !token}
            onClick={() => void stats.refetch()}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${stats.isFetching ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {stats.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </header>
        {stats.isPending ? (
          <p role="status" className="rounded-xl border bg-white p-8">
            Loading application stats...
          </p>
        ) : (
          <>
            {stats.isError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
              >
                Unable to load application stats.{' '}
                <button className="underline" onClick={() => void stats.refetch()}>
                  Try again
                </button>
                {stats.data && <p>Showing the last available data.</p>}
              </div>
            )}
            {stats.data &&
              (data.length === 0 ? (
                <p className="rounded-xl border bg-white p-8 text-gray-600">
                  No application stats are available yet.
                </p>
              ) : (
                <>
                  <section
                    className="rounded-xl border border-blue-100 bg-blue-50 p-6"
                    aria-label="Total applications"
                  >
                    <h2 className="text-sm font-medium text-blue-800">Total applications</h2>
                    <p className="mt-2 text-4xl font-bold text-blue-950">
                      {total.toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-blue-700">Across {data.length} day ranges</p>
                  </section>
                  <section className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Applications by day range
                    </h2>
                    <p className="mb-4 mt-1 text-sm text-gray-500">
                      Number of applications in each reported interval
                    </p>
                    <StatsChart data={data} />
                  </section>
                  <section className="overflow-hidden rounded-xl border bg-white">
                    <table className="w-full text-left text-sm">
                      <caption className="px-6 py-4 text-left font-semibold">
                        Range breakdown
                      </caption>
                      <thead className="border-y bg-gray-50 text-gray-600">
                        <tr>
                          <th scope="col" className="px-6 py-3">
                            Day range
                          </th>
                          <th scope="col" className="px-6 py-3 text-right">
                            Applications
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row, index) => (
                          <tr key={`${row.dayRange}-${index}`} className="border-b">
                            <th scope="row" className="px-6 py-4 font-medium">
                              {row.dayRange}
                            </th>
                            <td className="px-6 py-4 text-right tabular-nums">
                              {row.totalApps.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 font-semibold">
                          <th scope="row" className="px-6 py-4">
                            Total
                          </th>
                          <td className="px-6 py-4 text-right">{total.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </section>
                </>
              ))}
          </>
        )}
      </div>
    </PageShell>
  )
}
