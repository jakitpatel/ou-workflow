import React from "react";
import type { ApplicationDetail } from "./../../../types/application";

export default function Overview({ application }: { application: ApplicationDetail }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
      <dl className="grid grid-cols-2 gap-4 text-sm text-gray-700">
        <div>
          <dt className="font-medium">Submission Date</dt>
          <dd>{application.submissionDate || "N/A"}</dd>
        </div>
        <div>
          <dt className="font-medium">Status</dt>
          <dd>{application.status}</dd>
        </div>
      </dl>
    </div>
  );
}
