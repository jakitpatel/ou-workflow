import { Bell, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

// Example helper functions. Copy all relevant helpers from your index.tsx.
export const getStatusConfig = (status: string, daysActive = 0) => {
  const configs = {
    new: { label: 'New', color: 'bg-blue-100 text-blue-800', icon: Bell },
    in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    overdue: { label: `Overdue (${daysActive}d)`, color: 'bg-red-100 text-red-800', icon: AlertTriangle },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };
    return configs[status] || configs.new;
};

export const getPriorityBorderClass = (priority: string) => {
  const classes = {
    urgent: 'border-l-4 border-red-500',
    high: 'border-l-4 border-orange-400',
    medium: 'border-l-4 border-blue-400',
    low: 'border-l-4 border-gray-400'
    };
  return classes[priority] || classes.low;
};

export const getStageColor = (stage: string) => {
  const colors = {
    'Application': 'bg-purple-100 text-purple-700',
    'NDA': 'bg-blue-100 text-blue-700',
    'Inspection': 'bg-orange-100 text-orange-700',
    'Ingredients': 'bg-green-100 text-green-700',
    'Products': 'bg-indigo-100 text-indigo-700',
    'Contract': 'bg-yellow-100 text-yellow-700',
    'Certification': 'bg-emerald-100 text-emerald-700'
    };
    return colors[stage] || 'bg-gray-100 text-gray-700';
};

export const getMessageCount = (app: any) => {
  const messageCounts = app.application_messages?.length || 0;
  return { total: messageCounts, unread: 0 };
};

export const formatNowForApi = (): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    now.getFullYear() +
    "-" +
    pad(now.getMonth() + 1) +
    "-" +
    pad(now.getDate()) +
    " " +
    pad(now.getHours()) +
    ":" +
    pad(now.getMinutes()) +
    ":" +
    pad(now.getSeconds())
  );
}
// Add any other helpers you use in TaskDashboard here.