import { useEffect, useMemo, useState } from 'react'
import { Boxes, ShoppingBag, Tag, X } from 'lucide-react'
import { useScheduleBProducts } from '@/features/applications/hooks/useScheduleBProducts'
import type { KashProduct, ScheduleBProduct } from '@/types/application'

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

function formatValue(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized || '-'
}

function formatBooleanFlag(value: unknown) {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return '-'
  if (['y', 'yes', 'true', '1'].includes(normalized)) return 'Yes'
  if (['n', 'no', 'false', '0'].includes(normalized)) return 'No'
  return String(value).trim()
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-900">{formatValue(value)}</div>
    </div>
  )
}

function EmptyTabState({ description, icon }: { description: string; icon: 'products' | 'kash' }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
        {icon === 'products' ? (
          <ShoppingBag className="h-5 w-5 text-sky-600" />
        ) : (
          <Boxes className="h-5 w-5 text-emerald-600" />
        )}
      </div>
      <p className="mt-3 text-sm font-medium text-gray-900">No products found</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  )
}

function ProductCard({ product }: { product: ScheduleBProduct }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">
            {product.productName || product.BrandName || 'Unnamed Product'}
          </h4>
          <p className="mt-1 text-xs text-gray-500">
            Product ID: {formatValue(product.ScheduleProductId)}
          </p>
        </div>
        <span className="inline-flex rounded-full border border-sky-200 bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
          Application
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Brand Name" value={product.BrandName} />
        <Field label="UPC" value={product.UPC} />
        <Field label="Symbol" value={product.symbol} />
        <Field label="Private Label Co." value={product.privateLabelCo} />
        <Field label="In House" value={formatBooleanFlag(product.inHouse)} />
        <Field label="Private Label" value={formatBooleanFlag(product.privateLabel)} />
        <Field label="Industrial" value={formatBooleanFlag(product.Industrial)} />
        <Field label="Retail" value={formatBooleanFlag(product.Retail)} />
        <Field label="Bulk Shipped" value={formatBooleanFlag(product.bulkShipped)} />
        <Field label="Passover" value={formatBooleanFlag(product.passover)} />
        <Field label="List" value={formatBooleanFlag(product.list)} />
        <Field label="Internal Use Only" value={formatBooleanFlag(product.internal_use_only)} />
      </div>
    </article>
  )
}

function KashProductCard({ product }: { product: KashProduct }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">
            {product.PRODUCT_NAME || product.MerchProductName || product.BRAND_NAME || 'Unnamed Product'}
          </h4>
          <p className="mt-1 text-xs text-gray-500">
            Label ID: {formatValue(product.LABEL_ID)}
          </p>
        </div>
        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
          KASH
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Brand Name" value={product.BRAND_NAME} />
        <Field label="Product Name" value={product.PRODUCT_NAME} />
        <Field label="Company" value={product.COMPANY_NAME} />
        <Field label="Plant" value={product.PLANT_NAME} />
        <Field label="Plant Status" value={product.PLANT_STATUS} />
        <Field label="Status" value={product.STATUS} />
        <Field label="Passover" value={formatBooleanFlag(product.PESACH)} />
        <Field label="Symbol" value={product.SYMBOL} />
        <Field label="Group" value={product.GRP} />
        <Field label="DPM" value={product.DPM} />
        <Field label="RC" value={product.RC} />
        <Field label="Country" value={product.Plant_Country} />
      </div>
    </article>
  )
}

const getProductKey = (product: ScheduleBProduct) =>
  `product-${String(product.ScheduleProductId ?? product.productName ?? product.BrandName ?? 'product')}`

const getKashProductKey = (product: KashProduct) =>
  `kash-${String(product.LABEL_ID ?? product.MERCHANDISE_ID ?? product.PRODUCT_NAME ?? product.BRAND_NAME ?? 'product')}`

function ProductsTabPanel({
  products,
  isLoading,
  error,
}: {
  products: ScheduleBProduct[]
  isLoading: boolean
  error: unknown
}) {
  if (isLoading) {
    return <div className="p-6 text-sm text-gray-600">Loading products...</div>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load products: {(error as Error).message}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <EmptyTabState
        icon="products"
        description="This application does not currently have any Schedule B products."
      />
    )
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <ProductCard key={getProductKey(product)} product={product} />
      ))}
    </div>
  )
}

function KashTabPanel({
  products,
  isLoading,
  error,
}: {
  products: KashProduct[]
  isLoading: boolean
  error: unknown
}) {
  if (isLoading) {
    return <div className="p-6 text-sm text-gray-600">Loading KASH products...</div>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load KASH products: {(error as Error).message}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <EmptyTabState
        icon="kash"
        description="No matching KASH products were returned for this application."
      />
    )
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <KashProductCard key={getKashProductKey(product)} product={product} />
      ))}
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
  const { data, isLoading, error } = useScheduleBProducts(open ? resolvedApplicationId : undefined)
  const scheduleProducts = useMemo(() => data?.scheduleProducts ?? [], [data])
  const kashProducts = useMemo(() => data?.kashProducts ?? [], [data])

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
                <Tag className="h-5 w-5 text-sky-300" />
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
            <ProductsTabPanel products={scheduleProducts} isLoading={isLoading} error={error} />
          ) : null}
          {activeTab === 'kash' ? (
            <KashTabPanel products={kashProducts} isLoading={isLoading} error={error} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
