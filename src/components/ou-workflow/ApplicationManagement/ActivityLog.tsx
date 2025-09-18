import React from "react";

export default function ActivityLog({ messages }: { messages: any[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h2>
      <ul className="space-y-3 text-sm text-gray-700">
        {messages.map((m, idx) => (
          <li key={idx} className="border rounded-lg p-3">
            <p>{m.text}</p>
            <p className="text-xs text-gray-500">{m.timestamp}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}