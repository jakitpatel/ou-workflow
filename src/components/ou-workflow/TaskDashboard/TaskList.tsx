import { useState } from 'react';
import { TaskCard } from './TaskCard';
import { X } from 'lucide-react';

export function TaskList({ stages, applicantId }) {
  const [expandedStage, setExpandedStage] = useState(null);

  const handleStageClick = (stageKey) => {
    setExpandedStage(expandedStage === stageKey ? null : stageKey);
  };

  return (
    <div>
      <div className="flex space-x-1 h-6 rounded overflow-hidden mb-3">
        {Object.keys(stages).map((key) => {
          const status = stages[key].status;
          const color =
            status === 'completed'
              ? 'bg-green-500'
              : status === 'in_progress'
              ? 'bg-blue-500'
              : status === 'overdue'
              ? 'bg-red-500'
              : status === 'blocked'
              ? 'bg-gray-400'
              : 'bg-gray-300';
          return (
            <button
              key={key}
              onClick={() => handleStageClick(key)}
              className={`flex-1 text-white text-xs ${color} py-1`}
            >
              {key}
            </button>
          );
        })}
      </div>

      {expandedStage && (
        <div className="bg-gray-50 border rounded-lg p-4 mt-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold">{expandedStage} Tasks</h3>
            <button onClick={() => setExpandedStage(null)} className="text-gray-500 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stages[expandedStage].tasks.map((task, index) => (
              <TaskCard key={index} task={task} applicantId={applicantId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}