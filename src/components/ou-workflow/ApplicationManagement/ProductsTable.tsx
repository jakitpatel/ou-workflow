import type { ApplicationDetail } from "@/types/application";
import { Package } from "lucide-react";

export default function ProductsTable({ application }: { application: ApplicationDetail }) {
  const productData = application.products || [];
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Product Information</h2>
        <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <Package className="h-4 w-4 mr-2" />
          Add New Product
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{productData.length}</div>
          <div className="text-sm text-blue-700">Total Products</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600">{productData.filter(p => p.consumerIndustrial === 'C').length}</div>
          <div className="text-sm text-green-700">Consumer Products</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-600">{productData.filter(p => p.bulkShipped === 'Y').length}</div>
          <div className="text-sm text-purple-700">Bulk Shipped</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-orange-600">{productData.filter(p => p.source === 'Form Data').length}</div>
          <div className="text-sm text-orange-700">From Application</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">Source</th>
              <th className="text-left py-3 px-4">Product Name</th>
              <th className="text-left py-3 px-4">Brand Name</th>
              <th className="text-left py-3 px-4">Label Company</th>
              <th className="text-left py-3 px-4">Type</th>
              <th className="text-left py-3 px-4">Bulk Shipped</th>
              <th className="text-left py-3 px-4">Certification</th>
              <th className="text-left py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {productData.map((product, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    product.source === 'Form Data' 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {product.source}
                  </span>
                </td>
                <td className="py-3 px-4 font-medium">{product.labelName}</td>
                <td className="py-3 px-4">{product.brandName}</td>
                <td className="py-3 px-4">{product.labelCompany}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {product.consumerIndustrial === 'C' ? 'Consumer' : 'Industrial'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    product.bulkShipped === 'Y' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.bulkShipped === 'Y' ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    {product.symbol}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                    Submitted
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">Product Specifications</h3>
        <p className="text-sm text-blue-700">
          All products are submitted for OU Kosher certification. Product specifications and 
          ingredient lists have been uploaded and verified. Manufacturing processes documented 
          for each product category.
        </p>
        <div className="mt-2 flex space-x-4 text-xs text-blue-600">
          <span>• 2 Flour products from existing brands</span>
          <span>• 2 New cheese-based products</span>
          <span>• All products use verified kosher ingredients</span>
        </div>
      </div>
    </div>
  );
}
