import type { Match } from '../model/resolution'

export function ResolvedSearchRecord({ isCompany, match }: {
  isCompany: boolean
  match?: Match | null
}) {
  return (
    <section className="rounded-md border border-indigo-100 bg-indigo-50 p-3 text-sm">
      <h3 className="font-semibold">Database (Kashrus)</h3>
      {match ? (
        <>
          <p className="mt-1">Resolved: {(isCompany ? match.companyName : match.plantName) || (isCompany ? 'Company' : 'Plant')} — #{match.Id}</p>
          {match.Address && <p className="mt-1 text-gray-600">{match.Address}</p>}
          {match.status && <p className="mt-1 text-gray-600">Status: {match.status}</p>}
        </>
      ) : <p className="mt-1">No resolved ID is available.</p>}
    </section>
  )
}
