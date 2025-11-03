import React from 'react';
import { getStatusConfig, getPriorityBorderClass } from './taskHelpers';
import { History } from 'lucide-react';
import type { ApplicationTask } from '@/types/application';
//import { TaskActionsPanel } from './TaskActionsPanel';
//import { TaskMessagesPanel } from './TaskMessagesPanel';

interface PlantInfo {
  applications?: number;
}

interface TaskRowProps {
  application: ApplicationTask;
  plantInfo?: PlantInfo;
  handleShowPlantHistory: (plantName: string) => void;
  handleApplicationTaskAction: (e: React.MouseEvent, application: ApplicationTask) => void;
  //...props
}

export function TaskRow({
  application,
  plantInfo,
  handleShowPlantHistory,
  handleApplicationTaskAction,
  //...props
}: TaskRowProps) {
  const statusConfig = getStatusConfig(application.status, application.daysActive);
  //const isActionsExpanded = expandedActions.has(application.id);
  //const isMessagesExpanded = expandedMessages.has(application.id);
  //const messageCounts = getMessageCount(application);

  return (
    <React.Fragment>
      <tr className={`hover:bg-gray-50 ${getPriorityBorderClass(application.priority)}`}>
        {/* Task & Plant Column */}
        <td className="px-6 py-4">
            <div className="space-y-2">
            {/* Plant name - prominent and clickable */}
            <button 
                onClick={() => handleShowPlantHistory(application.plantName)}
                className="text-left group"
                title={`Click to view ${application.plantName} history. ${plantInfo?.applications || 0} applications`}
            >
                <div className="text-base font-bold group-hover:text-blue-600 transition-colors text-gray-900">
                {application.plantName}
                </div>
            </button>
                <div className="flex items-center">
                  {(application?.daysPending ?? 0) > 0 && (
                    <>
                    <History className="w-4 h-4 inline ml-2 opacity-60 group-hover:opacity-100" />
                    <span className="text-sm font-medium ml-1">
                      {application.daysPending} days elapsed
                    </span>
                  </>
                  )}
                  {application?.daysOverdue > 0 && (
                    <>
                    <History className="w-4 h-4 inline ml-2 opacity-60 group-hover:opacity-100" />
                    <span className="text-sm font-medium ml-1 text-red-600">
                      {application.daysOverdue} days overdue
                    </span>
                    </>
                  )}
                </div>
            </div>
        </td>

        {/* Actions Column */}
        <td className="px-6 py-4">
            <button
              key={application.taskInstanceId}
              onClick={(e) => handleApplicationTaskAction(e, application)}
              title={application.taskDescription || 'No description available'}
              className={`flex items-center justify-center px-3 py-2 text-white rounded-lg transition-colors text-sm font-medium bg-blue-600 hover:bg-blue-700`}
            >
              {/*application.icon && <application.icon className="w-4 h-4 mr-2" />*/}
              {application.taskName}
            </button>
            {/*
            <button
            onClick={() => handleActionsExpand(application.id)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
            <Wrench className="w-4 h-4" />
            <span className="text-sm">Actions</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isActionsExpanded ? 'rotate-180' : ''}`} />
            </button>
            */}
        </td>
        {/* Role Column */}
        <td className="px-6 py-4">
            {application.assigneeRole}
        </td>

        {/* Messages Column */}
        <td className="px-6 py-4">
            {application.stageName}
        </td>


        {/* Status Column */}
        <td className="px-6 py-4">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
            <statusConfig.icon className="w-3 h-3 mr-1" />
            {statusConfig.label}
            </span>
        </td>
      </tr>
      {/*isActionsExpanded && (
        <TaskActionsPanel
          key={`${application.id}-actions`}  // ✅ unique key
          application={application}
          {...props}
        />
      )*/}
      {/*isMessagesExpanded && (
        <TaskMessagesPanel
          key={`${application.id}-messages`} // ✅ unique key
          application={application}
          {...props}
        />
      )*/}
    </React.Fragment>
  );
}