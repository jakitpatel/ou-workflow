import React from 'react';

export function TaskCard({ task }) {
  return (
    <div
      className={`p-3 rounded border shadow-sm ${
        task.status === 'completed'
          ? 'border-green-300 bg-green-50'
          : task.status === 'in_progress'
          ? 'border-blue-300 bg-blue-50'
          : task.status === 'overdue'
          ? 'border-red-300 bg-red-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <h4 className="text-sm font-medium">{task.name}</h4>
      <p className="text-xs text-gray-500">Assignee: {task.assignee}</p>
      <p className="text-xs mt-1">Status: {task.status}</p>
      {task.required && <p className="text-xs text-red-500 mt-1">Required</p>}
    </div>
  );
}
