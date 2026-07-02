import { useMutation } from "@tanstack/react-query";
import type { ApplicationDetail } from "@/types/application";
import { Package, Pencil, Trash2, Plus } from "lucide-react";
import { useUser } from "@/context/UserContext";

type ProductRow = {
  BrandName?: string
  CompanyName?: string
  id?: string
  source?: string
  ProductName?: string
  LableType?: string
  LabelType?: string
  ProducedIn1Status?: string
  STATUS?: string
  SYMBOL?: string
  UKID?: string | number
  UKDID?: string | number
  labelName?: string
  brandName?: string
  labelCompany?: string
  ConsumerIndustrial?: string
  bulkShipped?: boolean
  certification?: string
  status?: string
}

const readRecordText = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key]
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

const displayText = (value: string) => value || '-'

type Props = {
  application: ApplicationDetail
  dataSource?: 'application' | 'prelim'
}

export default function ProductsTable({ application, dataSource = 'application' }: Props) {
  const { role, roles } = useUser();
  
  const userRoles =
    role?.toUpperCase() === "ALL"
      ? (roles ?? []).map(r => r.name?.toLowerCase()).filter(Boolean)
      : role
      ? [role.toLowerCase()]
      : [];
  
  const canEditProducts = userRoles.includes("product_role");
  const productData: ProductRow[] =
    dataSource === 'prelim'
      ? (
          application.products?.length
            ? (application.products as ProductRow[])
            : application.preferences?.prelimPlantsRaw?.flatMap((plant: any) => plant.products ?? [])
        ) || []
      : (application.products as ProductRow[]) || [];
  const filteredProducts = productData;
  const visibleColumnCount = 8 + (canEditProducts ? 1 : 0);

  // Calculate statistics
  const stats = {
    total: productData.length,
    consumer: productData.filter(p => p.ConsumerIndustrial === "Consumer").length,
    bulkShipped: productData.filter(p => p.bulkShipped === true).length,
    fromApplication: productData.filter(p => p.source === "Form Data").length
  };

  // Delete Product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
  });

  const onDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProductMutation.mutateAsync(productId);
    } catch (err) {
      console.error("Delete product failed:", err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Product Information</h2>
        {canEditProducts && (
          <div className="flex flex-wrap items-center gap-2">
            <button 
              className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            > 
              <Package className="h-4 w-4 mr-2" /> 
              Save to Local
            </button>
            <button 
              className="flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            > 
              <Package className="h-4 w-4 mr-2" /> 
              Save to KASH
            </button>
            <button
              className="flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-3xl font-bold text-blue-700">{stats.total}</div>
          <div className="text-sm font-medium text-blue-600 mt-1">Total Products</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-3xl font-bold text-green-700">{stats.consumer}</div>
          <div className="text-sm font-medium text-green-600 mt-1">Consumer Products</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-3xl font-bold text-purple-700">{stats.bulkShipped}</div>
          <div className="text-sm font-medium text-purple-600 mt-1">Bulk Shipped</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="text-3xl font-bold text-orange-700">{stats.fromApplication}</div>
          <div className="text-sm font-medium text-orange-600 mt-1">From Application</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">ProductName</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">BrandName</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">CompanyName</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">LableType</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">SYMBOL</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">UKID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">STATUS</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">ProducedIn1Status</th>
                {canEditProducts && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product, index) => {
                  const productRecord = product as Record<string, unknown>
                  const productName = readRecordText(productRecord, [
                    'ProductName',
                    'PRODUCT_NAME',
                    'productName',
                    'labelName',
                    'MerchProductName',
                  ])
                  const brandName = readRecordText(productRecord, [
                    'BrandName',
                    'BRAND_NAME',
                    'brandName',
                  ])
                  const companyName = readRecordText(productRecord, [
                    'CompanyName',
                    'COMPANY_NAME',
                    'labelCompany',
                    'LABEL_COMPANY',
                  ])
                  const lableType = readRecordText(productRecord, [
                    'LableType',
                    'LabelType',
                    'LABEL_TYPE',
                  ])
                  const symbol = readRecordText(productRecord, ['SYMBOL', 'symbol', 'certification'])
                  const ukid = readRecordText(productRecord, ['UKID', 'UKDID'])
                  const status = readRecordText(productRecord, ['STATUS', 'status'])
                  const producedIn1Status = readRecordText(productRecord, [
                    'ProducedIn1Status',
                    'PRODUCED_IN1_STATUS',
                    'producedIn1Status',
                    'PlantStatus',
                    'PLANT_STATUS',
                  ])

                  return (
                    <tr
                      key={`${productName || 'product'}-${index}`}
                      className={`hover:bg-gray-50 transition-colors ${
                        product.source === 'Form Data' ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 align-top">
                        <span className="font-medium text-gray-900">{displayText(productName)}</span>
                      </td>
                      <td className="py-3 px-4 align-top text-gray-700">{displayText(brandName)}</td>
                      <td className="py-3 px-4 align-top text-gray-700">{displayText(companyName)}</td>
                      <td className="py-3 px-4 align-top text-gray-700">{displayText(lableType)}</td>
                      <td className="py-3 px-4 align-top text-gray-700">{displayText(symbol)}</td>
                      <td className="py-3 px-4 align-top text-gray-700">{displayText(ukid)}</td>
                      <td className="py-3 px-4 align-top text-gray-700">{displayText(status)}</td>
                      <td className="py-3 px-4 align-top text-gray-700">{displayText(producedIn1Status)}</td>
                      {canEditProducts && (
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-blue-600 hover:text-blue-800 transition-colors p-1 hover:bg-blue-50 rounded"
                              title="Edit Product"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => product.id && onDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-800 transition-colors p-1 hover:bg-red-50 rounded"
                              title="Delete Product"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={visibleColumnCount} className="py-12 text-center">
                    <div className="text-gray-400">
                      <p className="text-sm font-medium">No products found</p>
                      <p className="text-xs mt-1">No products have been added yet</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800 leading-relaxed">
          <strong className="font-semibold">Product Specifications:</strong> All products are submitted for OU Kosher certification. 
          Product specifications and ingredient lists have been uploaded and verified. Manufacturing processes documented 
          for each product category.
        </p>
      </div>
    </div>
  );
}
