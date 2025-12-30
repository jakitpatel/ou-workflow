import { useMutation } from "@tanstack/react-query";
import type { ApplicationDetail } from "@/types/application";
import { Package, Pencil, Trash2, Plus } from "lucide-react";
import { useUser } from "@/context/UserContext";

export default function ProductsTable({ application }: { application: ApplicationDetail }) {
  const { role, roles } = useUser();
  
  const userRoles =
    role?.toUpperCase() === "ALL"
      ? (roles ?? []).map(r => r.name?.toLowerCase()).filter(Boolean)
      : role
      ? [role.toLowerCase()]
      : [];
  
  const canEditProducts = userRoles.includes("product_role");
  const productData = application.products || [];
  const filteredProducts = productData;

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
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Source</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Product Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Brand Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Label Company</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Bulk Shipped</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Certification</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                {canEditProducts && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product, index) => (
                  <tr 
                    key={index} 
                    className={`hover:bg-gray-50 transition-colors ${
                      product.source === 'Form Data' ? 'bg-orange-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        product.source === "Form Data" 
                          ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}>
                        {product.source}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{product.labelName}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{product.brandName}</td>
                    <td className="py-3 px-4 text-gray-700">{product.labelCompany}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                        product.ConsumerIndustrial === "Industrial" 
                          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                          : 'bg-green-100 text-green-800 border border-green-200'
                      }`}>
                        {product.ConsumerIndustrial}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        product.bulkShipped === true 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {product.bulkShipped === true ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-medium">
                        {product.certification}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-md text-xs font-medium">
                        {product.status}
                      </span>
                    </td>
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
                            onClick={() => onDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-800 transition-colors p-1 hover:bg-red-50 rounded"
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canEditProducts ? 9 : 8} className="py-12 text-center">
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