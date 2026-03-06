import { ClipboardList } from 'lucide-react';
import type { TaskEvent } from '@/types/application';

const formatTaskEventDate = (date?: string): string => {
  if (!date) return '-';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleString();
};

const extractTaskEventDetails = (event: TaskEvent): string => {
  if (event.ActionReason?.trim()) return event.ActionReason.trim();
  if (!event.Details?.trim()) return '-';

  try {
    const parsed = JSON.parse(event.Details);
    if (typeof parsed?.notes === 'string' && parsed.notes.trim()) {
      return parsed.notes.trim();
    }
    return event.Details;
  } catch {
    return event.Details;
  }
};

export default function TaskEventsPanel({ taskEvents }: { taskEvents: TaskEvent[] }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">Task Events</h2>

      {taskEvents.length === 0 ? (
        <div className="text-sm text-gray-500">No task events found for this application.</div>
      ) : (
        <div className="space-y-4">
          {taskEvents.map((event) => (
            <div
              key={event.TaskEventId ?? `${event.TaskInstanceId ?? 'task'}-${event.ActionDate ?? event.Action}`}
              className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 rounded-full bg-blue-100">
                <ClipboardList className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-medium text-gray-900">{event.Action || 'Task updated'}</h3>
                  <div className="flex items-center space-x-2">
                    {(event.PreviousStatus || event.NewStatus) && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {(event.PreviousStatus || '-') + ' -> ' + (event.NewStatus || '-')}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTaskEventDate(event.ActionDate)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{extractTaskEventDetails(event)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-medium">Updated by:</span> {event.ActionBy || 'System'}
                  {event.TaskInstanceId ? ` • Task #${event.TaskInstanceId}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
