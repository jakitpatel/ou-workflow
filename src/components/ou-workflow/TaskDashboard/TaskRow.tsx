import React from 'react';
import { getStatusConfig, getPriorityBorderClass, getStageColor, getMessageCount } from './taskHelpers';
import { History, Wrench, ChevronDown, MessageCircle } from 'lucide-react';
import { TaskActionsPanel } from './TaskActionsPanel';
import { TaskMessagesPanel } from './TaskMessagesPanel';

export function TaskRow({
  application,
  plantInfo,
  expandedActions,
  expandedMessages,
  handleShowPlantHistory,
  handleActionsExpand,
  handleMessagesExpand,
  ...props
}) {
  const statusConfig = getStatusConfig(application.status, application.daysActive);
  const isActionsExpanded = expandedActions.has(application.id);
  const isMessagesExpanded = expandedMessages.has(application.id);
  const messageCounts = getMessageCount(application);

  return (
    <React.Fragment>
      <tr className={`hover:bg-gray-50 ${getPriorityBorderClass(application.priority)}`}>
        {/* Task & Plant Column */}
        <td className="px-6 py-4">
            <div className="space-y-2">
            {/* Plant name - prominent and clickable */}
            <button 
                onClick={() => handleShowPlantHistory(application.plant)}
                className="text-left group"
                title={`Click to view ${application.plant} history. ${plantInfo?.applications || 0} applications`}
            >
                <div className="text-base font-bold group-hover:text-blue-600 transition-colors text-gray-900">
                {application.plant}
                <History className="w-4 h-4 inline ml-2 opacity-60 group-hover:opacity-100" />
                <span className="text-sm font-medium ml-1">{application.daysInStage} days elapsed</span>
                {/*<span className="text-sm font-normal ml-1 text-gray-600">
                  {application.applicationId}
                </span>*/}
                </div>
            </button>
            
            {/* Task title with stage label */}
            <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded font-medium ${getStageColor(application.workflowStage)}`}>
                {application.applicationId} {application.workflowStage}
                </span>
                <span className="font-medium text-sm text-gray-900">
                {application.title}
                </span>
            </div>
            </div>
        </td>

        {/* Actions Column */}
        <td className="px-6 py-4">
            <button
            onClick={() => handleActionsExpand(application.id)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
            <Wrench className="w-4 h-4" />
            <span className="text-sm">Actions</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isActionsExpanded ? 'rotate-180' : ''}`} />
            </button>
        </td>

        {/* Messages Column */}
        <td className="px-6 py-4">
            <button
            onClick={() => handleMessagesExpand(application.id)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">
                {messageCounts.total} message{messageCounts.total !== 1 ? 's' : ''}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isMessagesExpanded ? 'rotate-180' : ''}`} />
            </button>
        </td>

        {/* Status Column */}
        <td className="px-6 py-4">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
            <statusConfig.icon className="w-3 h-3 mr-1" />
            {statusConfig.label}
            </span>
        </td>
      </tr>
      {isActionsExpanded && (
        <TaskActionsPanel
          key={`${application.id}-actions`}  // ✅ unique key
          application={application}
          {...props}
        />
      )}
      {isMessagesExpanded && (
        <TaskMessagesPanel
          key={`${application.id}-messages`} // ✅ unique key
          application={application}
          {...props}
        />
      )}
    </React.Fragment>
  );
}