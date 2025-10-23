import { useForm } from "react-hook-form";
import { useSaveProduct } from "@/components/ou-workflow/hooks/useProducts";

export default function ProductFormDialog({ open, onClose, product }) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: product || {
      labelName: "",
      brandName: "",
      consumerIndustrial: "C",
      bulkShipped: "N",
      labelCompany: "",
    },
  });

  const saveProduct = useSaveProduct();

  const onSubmit = async (data) => {
    await saveProduct.mutateAsync(data);
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {product ? "Edit Product" : "Add New Product"}
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Product Name</label>
            <input className="w-full border rounded p-2" {...register("labelName")} />
          </div>

          <div>
            <label className="block text-sm font-medium">Brand Name</label>
            <input className="w-full border rounded p-2" {...register("brandName")} />
          </div>

          <div>
            <label className="block text-sm font-medium">Type</label>
            <select className="w-full border rounded p-2" {...register("consumerIndustrial")}>
              <option value="C">Consumer</option>
              <option value="I">Industrial</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Bulk Shipped</label>
            <select className="w-full border rounded p-2" {...register("bulkShipped")}>
              <option value="Y">Yes</option>
              <option value="N">No</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              className="px-4 py-2 bg-gray-200 rounded"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded"
              disabled={saveProduct.isPending}
            >
              {saveProduct.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}