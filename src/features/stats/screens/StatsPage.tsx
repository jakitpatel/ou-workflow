import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'

import { PageShell } from '@/components/layout/PageShell'
import { useUser } from '@/context/UserContext'

import { fetchStats, type ApplicationStats } from '../api/stats'
import { StatusDayRangeChart } from '../components/StatusDayRangeChart'
import { collectDayRanges, toStatusSeriesViews } from '../model/statusSeries'

function StatsContent({ data }: { data: ApplicationStats }) {
  const statuses = toStatusSeriesViews(data.statuses)
  const dayRanges = collectDayRanges(data.overall, ...data.statuses.map((status) => status.rows))
  const overallTotal = data.overall.reduce((sum, row) => sum + row.totalApps, 0)
  const statusesTotal = statuses.reduce((sum, status) => sum + status.total, 0)
  const rangeTotal = (dayRange: string) =>
    statuses.reduce((sum, status) => sum + (status.byRange.get(dayRange) ?? 0), 0)

  if (data.overall.length === 0 && statusesTotal === 0) {
    return (
      <p className="rounded-xl border bg-white p-8 text-gray-600">
        No application stats are available yet.
      </p>
    )
  }

  return (
    <>
      {data.overall.length > 0 ? (
        <section aria-label="Total applications" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <h2 className="text-sm font-medium text-blue-800">Total applications</h2>
            <p className="mt-2 text-4xl font-bold text-blue-950">{overallTotal.toLocaleString()}</p>
            <p className="mt-1 text-sm text-blue-700">Across {data.overall.length} day ranges</p>
          </div>
          {data.overall.map((row) => (
            <div key={row.dayRange} className="rounded-xl border bg-white p-5">
              <h3 className="text-sm font-medium text-gray-600">{row.dayRange}</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{row.totalApps.toLocaleString()}</p>
              <p className="mt-1 text-sm text-gray-500">applications</p>
            </div>
          ))}
        </section>
      ) : null}

      {statuses.length > 0 ? (
        <>
          <section className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900">Applications by status and day range</h2>
            <p className="mb-4 mt-1 text-sm text-gray-500">
              Number of applications in each status, per reported interval
            </p>
            {statusesTotal > 0 ? (
              <StatusDayRangeChart dayRanges={dayRanges} series={statuses} />
            ) : (
              <p className="text-sm text-gray-500">No applications in any status yet.</p>
            )}
          </section>

          <section className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <caption className="px-6 py-4 text-left font-semibold">Status breakdown</caption>
              <thead className="border-y bg-gray-50 text-gray-600">
                <tr>
                  <th scope="col" className="px-6 py-3">Status</th>
                  {dayRanges.map((dayRange) => (
                    <th key={dayRange} scope="col" className="px-6 py-3 text-right">{dayRange}</th>
                  ))}
                  <th scope="col" className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {statuses.map((status) => (
                  <tr key={status.status} className="border-b">
                    <th scope="row" className="px-6 py-4 font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-sm"
                          style={{ backgroundColor: status.color }}
                          aria-hidden="true"
                        />
                        {status.label}
                      </span>
                    </th>
                    {dayRanges.map((dayRange) => (
                      <td key={dayRange} className="px-6 py-4 text-right tabular-nums">
                        {(status.byRange.get(dayRange) ?? 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right font-medium tabular-nums">{status.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <th scope="row" className="px-6 py-4">All statuses</th>
                  {dayRanges.map((dayRange) => (
                    <td key={dayRange} className="px-6 py-4 text-right tabular-nums">
                      {rangeTotal(dayRange).toLocaleString()}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right tabular-nums">{statusesTotal.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        </>
      ) : null}
    </>
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
  return (
    <PageShell>
      <div className="space-y-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stats</h1>
            <p className="mt-1 text-sm text-gray-600">Applications by day range and status</p>
          </div>
          <button
            type="button"
            disabled={stats.isFetching || !token}
            onClick={() => void stats.refetch()}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${stats.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
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
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                Unable to load application stats.{' '}
                <button className="underline" onClick={() => void stats.refetch()}>
                  Try again
                </button>
                {stats.data && <p>Showing the last available data.</p>}
              </div>
            )}
            {stats.data ? <StatsContent data={stats.data} /> : null}
          </>
        )}
      </div>
    </PageShell>
  )
}
