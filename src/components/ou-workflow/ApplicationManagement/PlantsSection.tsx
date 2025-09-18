import React from "react";
import type { Plant } from "./../../../types/application";

export default function PlantsSection({ plants }: { plants: Plant[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Plants</h2>
      <ul className="space-y-3">
        {plants.map((p) => (
          <li key={p.id} className="border rounded-lg p-4">
            <p className="font-medium">{p.name}</p>
            <p className="text-sm text-gray-600">{p.address.street}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
