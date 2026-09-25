import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { Search, X } from 'lucide-react'
import { useUser } from '@/context/UserContext'
import { COMPANY_SEARCH_PAGE_SIZE, searchCompanies } from '../api/companySearch'
import type { Match } from '../model/resolution'
import { prelimQueryKeys } from '../model/queryKeys'

export function CompanySearchDialog({
  companyName,
  onClose,
  onSelect,
}: {
  companyName: string
  onClose: () => void
  onSelect: (match: Match) => void
}) {
  const { token } = useUser()
  const [input, setInput] = useState(companyName)
  const [search, setSearch] = useState(companyName.trim())
  const [page, setPage] = useState(0)
  const query = useQuery({
    queryKey: prelimQueryKeys.companySearch(search, page),
    queryFn: () => searchCompanies({ companyName: search, page, token: token ?? undefined }),
    enabled: search.length > 0,
  })
  const records = query.data?.data ?? []
  const hasNext =
    query.data?.meta?.total_count != null
      ? (page + 1) * COMPANY_SEARCH_PAGE_SIZE < query.data.meta.total_count
      : records.length === COMPANY_SEARCH_PAGE_SIZE
  const buttonClass =
    'rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50'

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[70] flex max-h-[85vh] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">Search Company</Dialog.Title>
          <Dialog.Description className="text-sm text-gray-600">
            Search by company name and select a company to compare its Kashrus details with the
            application.
          </Dialog.Description>
          <Dialog.Close
            aria-label="Close company search"
            className="absolute right-4 top-4 rounded p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </Dialog.Close>
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setSearch(input.trim())
              setPage(0)
            }}
          >
            <div className="flex-1">
              <label htmlFor="company-search-name" className="mb-1 block text-sm font-medium">
                Company name
              </label>
              <input
                id="company-search-name"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim()}
              className={`${buttonClass} inline-flex items-center gap-2`}
            >
              <Search className="h-4 w-4" /> Search
            </button>
          </form>
          {!search ? (
            <p role="status">Enter a company name to search.</p>
          ) : query.isFetching ? (
            <p role="status">Loading companies...</p>
          ) : query.isError ? (
            <div role="alert" className="text-sm text-red-700">
              Unable to load companies.{' '}
              <button className={buttonClass} onClick={() => void query.refetch()}>
                Retry
              </button>
            </div>
          ) : records.length === 0 ? (
            <p role="status">No companies found for “{search}”. Try a different name.</p>
          ) : (
            <div className="overflow-auto rounded-md border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3">Company / ID</th>
                    <th className="p-3">Address</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => {
                    const company = record.attributes
                    const address = [
                      company.STREET1,
                      company.STREET2,
                      company.CITY,
                      company.STATE,
                      company.ZIP,
                    ]
                      .filter(Boolean)
                      .join(', ')
                    return (
                      <tr
                        key={`${record.id}-${index}`}
                        className="border-t border-gray-100 hover:bg-indigo-50"
                      >
                        <td className="p-3">
                          <button
                            type="button"
                            className="text-left font-medium text-indigo-700 hover:underline"
                            disabled={
                              company.COMPANY_ID == null || String(company.COMPANY_ID).trim() === ''
                            }
                            onClick={() => {
                              onSelect({
                                Id: company.COMPANY_ID,
                                companyName: company.NAME,
                                Address: address,
                                City: company.CITY ?? '',
                                status: company.Status ?? undefined,
                              })
                              onClose()
                            }}
                          >
                            {company.NAME || 'Unnamed company'}
                            <span className="block text-xs text-gray-500">
                              #{company.COMPANY_ID}
                            </span>
                          </button>
                        </td>
                        <td className="p-3">{address || '—'}</td>
                        <td className="p-3">
                          <div>
                            {[company.FirstName, company.LastName].filter(Boolean).join(' ')}
                          </div>
                          <div>{company.Email}</div>
                          <div>{company.Voice}</div>
                          <div className="text-xs text-gray-500">{company.ContactType}</div>
                        </td>
                        <td className="p-3">{company.Status || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {search && (
            <div className="flex items-center justify-between text-sm">
              <span>
                Page {page + 1}
                {query.data?.meta?.total_count != null
                  ? ` · ${query.data.meta.total_count} results`
                  : ''}
              </span>
              <div className="flex gap-2">
                <button
                  className={buttonClass}
                  disabled={page === 0 || query.isFetching}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <button
                  className={buttonClass}
                  disabled={!hasNext || query.isFetching || query.isError}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
