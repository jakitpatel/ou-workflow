import { useEffect, useState } from 'react'
import { Boxes, Package2, ShoppingBag, X } from 'lucide-react'

type ScheduleBTab = 'products' | 'kash'

type Props = {
  open: boolean
  applicationId?: string | number
  applicationName?: string
  taskName?: string
  onClose: () => void
}

const TABS: Array<{ id: ScheduleBTab; label: string }> = [
  { id: 'products', label: 'PRODUCTS' },
  { id: 'kash', label: 'KASH' },
]

function EmptyTabState({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: 'products' | 'kash'
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
        {icon === 'products' ? (
          <ShoppingBag className="h-5 w-5 text-sky-600" />
        ) : (
          <Boxes className="h-5 w-5 text-emerald-600" />
        )}
      </div>
      <p className="mt-3 text-sm font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  )
}

export function ScheduleBProductsDrawer({
  open,
  applicationId,
  applicationName,
  taskName,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<ScheduleBTab>('products')
  const resolvedApplicationId =
    applicationId === undefined || applicationId === null ? undefined : String(applicationId)

  useEffect(() => {
    if (open) {
      setActiveTab('products')
    }
  }, [open, resolvedApplicationId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed right-0 top-0 flex h-full w-full max-w-[96vw] flex-col overflow-hidden bg-white shadow-2xl lg:max-w-[54vw]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b bg-gray-900 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Package2 className="h-5 w-5 text-sky-300" />
                <h3 className="text-lg font-semibold">Schedule B Products</h3>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-300">
                {taskName ? <span className="rounded-full bg-white/10 px-2.5 py-1">{taskName}</span> : null}
                {applicationName ? (
                  <span className="rounded-full bg-white/10 px-2.5 py-1">{applicationName}</span>
                ) : null}
                {resolvedApplicationId ? (
                  <span className="rounded-full bg-white/10 px-2.5 py-1">AppId: {resolvedApplicationId}</span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-300 hover:bg-white/10 hover:text-white"
              aria-label="Close Schedule B drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b bg-white px-5 py-3">
          <div className="flex gap-2">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-5">
          {activeTab === 'products' ? (
            <EmptyTabState
              icon="products"
              title="Products Tab Ready"
              description="Schedule B product content will be added here next."
            />
          ) : null}
          {activeTab === 'kash' ? (
            <EmptyTabState
              icon="kash"
              title="KASH Tab Ready"
              description="KASH product content will be added here next."
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
