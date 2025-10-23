import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Save (Add/Edit) Product
export const useSaveProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product) => {
      const res = await fetch(`/api/products${product.id ? "/" + product.id : ""}`, {
        method: product.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["application"]);
    },
  });
};
