import React from "react";
import type { Company } from "./../../../types/application";

export default function CompanySection({ company }: { company: Company }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
      <dl className="grid grid-cols-2 gap-4 text-sm text-gray-700">
        <div>
          <dt className="font-medium">Name</dt>
          <dd>{company?.name}</dd>
        </div>
        <div>
          <dt className="font-medium">Category</dt>
          <dd>{company?.category || "N/A"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="font-medium">Address</dt>
          <dd>
            {company?.address.street}, {company?.address.city},{" "}
            {company?.address.state}, {company?.address.country}
          </dd>
        </div>
      </dl>
    </div>
  );
}