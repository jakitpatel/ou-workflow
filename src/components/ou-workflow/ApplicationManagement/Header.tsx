import React from "react";
import type { ApplicationDetail } from "./../../../types/application";

export default function Header({ application }: { application: ApplicationDetail }) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            Application {application.applicationId}
          </h1>
          <p className="text-sm text-gray-600">{application.company?.name}</p>
        </div>
        <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
          {application.status}
        </span>
      </div>
    </header>
  );
}
