import { Bell, Clock, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { normalizeStatus } from '@/lib/utils/taskHelpers';

type StatusConfig = {
  label: string;
  color: string;
  icon: any;
};

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-800', icon: Bell },
  in_progress: {
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
  },
  overdue: {
    label: 'Overdue',
    color: 'bg-red-100 text-red-800',
    icon: AlertTriangle,
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
  },
};

const PRIORITY_BORDER_CLASSES: Record<string, string> = {
  urgent: 'border-l-4 border-red-500',
  high: 'border-l-4 border-orange-400',
  medium: 'border-l-4 border-blue-400',
  low: 'border-l-4 border-gray-400',
};

export const getStatusConfig = (status: string, daysActive = 0): StatusConfig => {
  const key = normalizeStatus(status);
  const config = STATUS_CONFIGS[key];

  if (config && key === 'overdue') {
    return {
      ...config,
      label: `Overdue (${daysActive}d)`,
    };
  }

  if (config) {
    return config;
  }

  return {
    label: status.toUpperCase(),
    color: 'bg-gray-100 text-gray-800',
    icon: HelpCircle,
  };
};

export const getPriorityBorderClass = (priority: string) => {
  return PRIORITY_BORDER_CLASSES[normalizeStatus(priority)] || PRIORITY_BORDER_CLASSES.low;
};
