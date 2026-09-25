import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { Search, X } from 'lucide-react'
import { useUser } from '@/context/UserContext'
import { PLANT_SEARCH_PAGE_SIZE, searchPlants } from '../api/plantSearch'
import type { Match } from '../model/resolution'
import { prelimQueryKeys } from '../model/queryKeys'

export function PlantSearchDialog({
  plantName,
  onClose,
  onSelect,
}: {
  plantName: string
  onClose: () => void
  onSelect: (match: Match) => void
}) {
  const { token } = useUser()
  const [input, setInput] = useState(plantName)
  const [search, setSearch] = useState(plantName.trim())
  const [page, setPage] = useState(0)
  const query = useQuery({
    queryKey: prelimQueryKeys.plantSearch(search),
    queryFn: () =>
      searchPlants({ plantName: search, token: token ?? undefined }),
    enabled: search.length > 0,
  })
  const allRecords = query.data?.data ?? []
  const records = allRecords.slice(page * PLANT_SEARCH_PAGE_SIZE, (page + 1) * PLANT_SEARCH_PAGE_SIZE)
  const hasNext = (page + 1) * PLANT_SEARCH_PAGE_SIZE < allRecords.length
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
          <Dialog.Title className="text-lg font-semibold">Search Plant</Dialog.Title>
          <Dialog.Description className="text-sm text-gray-600">
            Search by plant name and select a plant to compare its Kashrus details with the
            application.
          </Dialog.Description>
          <Dialog.Close
            aria-label="Close plant search"
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
              <label htmlFor="plant-search-name" className="mb-1 block text-sm font-medium">
                Plant name
              </label>
              <input
                id="plant-search-name"
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
            <p role="status">Enter a plant name to search.</p>
          ) : query.isFetching ? (
            <p role="status">Loading plants...</p>
          ) : query.isError ? (
            <div role="alert" className="text-sm text-red-700">
              Unable to load plants.{' '}
              <button className={buttonClass} onClick={() => void query.refetch()}>
                Retry
              </button>
            </div>
          ) : records.length === 0 ? (
            <p role="status">No plants found for “{search}”. Try a different name.</p>
          ) : (
            <div className="overflow-auto rounded-md border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3">Plant / ID</th>
                    <th className="p-3">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => {
                    const plant = record
                    const address = [
                      plant.STREET1,
                      plant.STREET2,
                      plant.STREET3,
                      plant.CITY,
                      plant.STATE,
                      plant.ZIP,
                      plant.COUNTRY,
                    ]
                      .filter(Boolean)
                      .join(', ')
                    return (
                      <tr
                        key={`${plant.PLANT_ID}-${index}`}
                        className="border-t border-gray-100 hover:bg-indigo-50"
                      >
                        <td className="p-3">
                          <button
                            type="button"
                            className="text-left font-medium text-indigo-700 hover:underline"
                            disabled={
                              plant.PLANT_ID == null || String(plant.PLANT_ID).trim() === ''
                            }
                            onClick={() => {
                              onSelect({
                                Id: plant.PLANT_ID,
                                PlantID: plant.PLANT_ID,
                                plantName: plant.NAME,
                                Address: address,
                                City: plant.CITY ?? '',
                              })
                              onClose()
                            }}
                          >
                            {plant.NAME || 'Unnamed plant'}
                            <span className="block text-xs text-gray-500">#{plant.PLANT_ID}</span>
                          </button>
                        </td>
                        <td className="p-3">{address || '—'}</td>
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
                {` · ${allRecords.length} results`}
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
