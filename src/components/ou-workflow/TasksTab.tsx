import React from 'react'

export function TasksTab() {
  return (
    <div className="p-6 text-gray-700">
      <h3 className="text-xl font-semibold mb-4">Tasks</h3>
      <ul className="space-y-3">
        <li className="p-3 bg-white shadow rounded border border-gray-200">
          📌 Follow up with <span className="font-medium">Organic Valley Ltd.</span>
        </li>
        <li className="p-3 bg-white shadow rounded border border-gray-200">
          📌 Review certification documents for <span className="font-medium">Fresh Farms Co.</span>
        </li>
        <li className="p-3 bg-white shadow rounded border border-gray-200">
          📌 Schedule call with <span className="font-medium">Sunrise Dairy</span> compliance officer
        </li>
      </ul>
    </div>
  )
}
