//import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { ApplicationDetail } from "@/types/application";
import { Package, Pencil, Trash2 } from "lucide-react";
//import ProductFormDialog from "./ProductFormDialog";
import { useUser } from "@/context/UserContext";

export default function ProductsTable({ application }: { application: ApplicationDetail }) {
  const { role, roles } = useUser();
  //const [isDialogOpen, setIsDialogOpen] = useState(false);
  //const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  //const queryClient = useQueryClient();

  const userRoles =
    role?.toUpperCase() === "ALL"
      ? (roles ?? []).map(r => r.name?.toLowerCase()).filter(Boolean)
      : role
      ? [role.toLowerCase()]
      : [];
  //console.log(roles);
  const canEditProducts = userRoles.includes("product_role");

  const productData = application.products || [];
  const totalProducts = productData.length;
  const consumerProducts = productData.filter(p => p.ConsumerIndustrial === "Consumer").length;
  const bulkShipped = productData.filter(p => p.bulkShipped === true).length;
  const fromApplication = productData.filter(p => p.source === "Form Data").length;

  // Add/Edit Product mutations
  //const saveProductMutation = useMutation({ /* implement your API call here */ });

  /*const onAddProduct = async (newProduct: any) => {
    try {
      await saveProductMutation.mutateAsync(newProduct);
      //await queryClient.invalidateQueries(["application", application.id]);
    } catch (err) {
      console.error("Add product failed:", err);
    }
  };

  const onEditProduct = async (updatedProduct: any) => {
    try {
      await saveProductMutation.mutateAsync(updatedProduct);
      //await queryClient.invalidateQueries(["application", application.id]);
    } catch (err) {
      console.error("Edit product failed:", err);
    }
  };*/

  // Delete Product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    //onSuccess: () => queryClient.invalidateQueries(["application", application.id]),
  });

  const onDeleteProduct = async (productId: string) => {
    try {
      await deleteProductMutation.mutateAsync(productId);
    } catch (err) {
      console.error("Delete product failed:", err);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 space-x-2">
          <h2 className="text-xl font-semibold">Product Information</h2>
          {canEditProducts && ( 
            <>
            <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors" > 
              <Package className="h-4 w-4 mr-1" /> 
              SAVE to LOCAL DB 
            </button> 
            <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors" > 
              <Package className="h-4 w-4 mr-1" /> 
              SAVE TO KASH DB 
            </button>
              {/* Add New Product Button */}
              <button
                onClick={() => {
                  if (!canEditProducts) return;
                //setSelectedProduct(null);
                //setIsDialogOpen(true);
            }}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              canEditProducts
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Package className="h-4 w-4 mr-2" />
            Add New Product
          </button>
          </>
          )}
        </div>

        {/* Summary Cards */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard title="Total Products" value={totalProducts} color="blue" />
          <SummaryCard title="Consumer Products" value={consumerProducts} color="green" />
          <SummaryCard title="Bulk Shipped" value={bulkShipped} color="purple" />
          <SummaryCard title="From Application" value={fromApplication} color="orange" />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b bg-gray-50">
                <TableHeader>Source</TableHeader>
                <TableHeader>Product Name</TableHeader>
                <TableHeader>Brand Name</TableHeader>
                <TableHeader>Label Company</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Bulk Shipped</TableHeader>
                <TableHeader>Certification</TableHeader>
                <TableHeader>Status</TableHeader>
                {canEditProducts && <TableHeader>Actions</TableHeader>}
              </tr>
            </thead>
            <tbody>
              {productData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-gray-500">
                    No products available. Click “Add New Product” to begin.
                  </td>
                </tr>
              ) : (
                productData.map((product, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Badge text={product.source} color={product.source === "Form Data" ? "orange" : "purple"} />
                    </td>
                    <td className="py-3 px-4 font-medium">{product.labelName}</td>
                    <td className="py-3 px-4">{product.brandName}</td>
                    <td className="py-3 px-4">{product.labelCompany}</td>
                    <td className="py-3 px-4">
                      <Badge text={product.ConsumerIndustrial === "Industrial" ? "Industrial" : "Consumer"} color="blue" />
                    </td>
                    <td className="py-3 px-4">
                      <Badge text={product.bulkShipped === true ? "Yes" : "No"} color={product.bulkShipped === true ? "green" : "gray"} />
                    </td>
                    <td className="py-3 px-4">
                      <Badge text={product.certification} color="green" />
                    </td>
                    <td className="py-3 px-4">
                      <Badge text={product.status} color="yellow" />
                    </td>
                    {canEditProducts && (
                    <td className="py-3 px-4 flex items-center space-x-2">
                      <button
                        onClick={() => {
                          if (!canEditProducts) return;
                          //setSelectedProduct(product);
                          //setIsDialogOpen(true);
                        }}
                        className={`text-gray-700 hover:text-gray-900 transition-colors ${
                          !canEditProducts && "text-gray-400 cursor-not-allowed hover:text-gray-400"
                        }`}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (!canEditProducts) return;
                          onDeleteProduct(product.id);
                        }}
                        className={`text-red-600 hover:text-red-800 transition-colors ${
                          !canEditProducts && "text-gray-400 cursor-not-allowed hover:text-gray-400"
                        }`}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Info Panel */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">Product Specifications</h3>
          <p className="text-sm text-blue-700">
            All products are submitted for OU Kosher certification. Product specifications and ingredient lists have been uploaded and verified. Manufacturing processes documented for each product category.
          </p>
        </div>
      </div>
    </>
  );
}

/* ---------- Subcomponents ---------- */

function TableHeader({ children }: { children: React.ReactNode }) {
  return <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{children}</th>;
}

function Badge({ text, color }: { text: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
    purple: "bg-purple-100 text-purple-800",
    orange: "bg-orange-100 text-orange-800",
    gray: "bg-gray-100 text-gray-800",
  };
  return <span className={`px-2 py-1 rounded text-xs font-medium ${colorMap[color] || "bg-gray-100 text-gray-800"}`}>{text}</span>;
}

function SummaryCard({ title, value, color }: { title: string; value: number; color: "blue" | "green" | "purple" | "orange" }) {
  const colorMap = {
    blue: ["text-blue-600", "bg-blue-50", "text-blue-700"],
    green: ["text-green-600", "bg-green-50", "text-green-700"],
    purple: ["text-purple-600", "bg-purple-50", "text-purple-700"],
    orange: ["text-orange-600", "bg-orange-50", "text-orange-700"],
  }[color];

  return (
    <div className={`${colorMap?.[1]} rounded-lg p-3`}>
      <div className={`text-2xl font-bold ${colorMap?.[0]}`}>{value}</div>
      <div className={`text-sm ${colorMap?.[2]}`}>{title}</div>
    </div>
  );
}