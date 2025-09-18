import React from "react";
import type { UploadedFile } from "./../../../types/application";

export default function FilesList({ files }: { files: UploadedFile[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Files</h2>
      <ul className="divide-y divide-gray-200">
        {files.map((f, idx) => (
          <li key={idx} className="py-3 flex justify-between items-center">
            <span>{f.name}</span>
            <span className="text-sm text-gray-500">{f.size}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}