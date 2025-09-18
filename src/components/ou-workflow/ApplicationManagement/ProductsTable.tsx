import React from "react";

export default function ProductsTable({ products }: { products: any[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6 overflow-x-auto">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Products</h2>
      <table className="w-full border-collapse border text-sm">
        <thead>
          <tr className="bg-gray-100 text-gray-700">
            <th className="border px-4 py-2 text-left">Name</th>
            <th className="border px-4 py-2 text-left">Category</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => (
            <tr key={idx}>
              <td className="border px-4 py-2">{p.name}</td>
              <td className="border px-4 py-2">{p.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
