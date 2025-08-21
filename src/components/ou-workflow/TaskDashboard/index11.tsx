import React, { useState } from 'react';
import { TaskList } from './TaskList';
import { StageHeader } from './StageHeader';

export function TaskDashboard({ applicants }) {
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Tasks Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {applicants.map((applicant) => (
          <div
            key={applicant.id}
            className="bg-white border rounded-lg shadow-sm p-4 hover:shadow-md transition"
          >
            <StageHeader applicant={applicant} setSelectedApplicant={setSelectedApplicant} />
            <TaskList stages={applicant.stages} applicantId={applicant.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
