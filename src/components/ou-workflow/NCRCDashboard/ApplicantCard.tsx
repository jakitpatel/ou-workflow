import React from 'react';
import { ApplicantProgressBar } from './ApplicantProgressBar';
import { Bell, FileText, Clock, Bot, ClipboardList, Package, Mail, ExternalLink } from 'lucide-react'

type Task = {
  name: string;
  status: string;
  assignee: string;
  daysActive: number;
  required: boolean;
};

type Stage = {
  status: string;
  progress: number;
  tasks: Task[];
};

type Applicant = {
  id: number;
  company: string;
  plant: string;
  region: string;
  priority: 'high' | 'medium' | 'low';
  status: string; // e.g., "contract_sent"
  assignedRC: string;
  lastUpdate: string;
  stages: Record<string, Stage>;
};

type Props = {
  applicant: Applicant;
  setShowIngredientsManager: (val: boolean) => void;
  setSelectedIngredientApp: (val: Applicant) => void;
  setActiveScreen: (val: string) => void;
};

export function ApplicantCard({ applicant, setShowIngredientsManager, setSelectedIngredientApp, setActiveScreen }: Props) {
  const statusColors: Record<string, string> = {
    contract_sent: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    pending: 'bg-gray-100 text-gray-800',
  };
  const priorityColors: Record<string, string> = {
    high: 'text-red-600 font-semibold',
    medium: 'text-yellow-600',
    low: 'text-green-600',
  };
  const priorityConfig = {
    urgent: { label: 'Urgent', color: 'bg-red-500', textColor: 'text-white' },
    high: { label: 'High', color: 'bg-orange-500', textColor: 'text-white' },
    medium: { label: 'Medium', color: 'bg-blue-500', textColor: 'text-white' },
    low: { label: 'Low', color: 'bg-gray-500', textColor: 'text-white' }
  };
  const statusConfig = {
    contract_sent: { label: 'Contract Sent', color: 'bg-blue-100 text-blue-800', step: 1 },
    under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', step: 2 },
    inspection_scheduled: { label: 'Inspection Scheduled', color: 'bg-purple-100 text-purple-800', step: 3 },
    payment_pending: { label: 'Payment Pending', color: 'bg-orange-100 text-orange-800', step: 4 },
    certified: { label: 'Certified', color: 'bg-green-100 text-green-800', step: 5 }
  };
  const priority = priorityConfig[applicant.priority];
  const status = statusConfig[applicant.status];

  // Calculate overall progress
  const stageKeys = Object.keys(applicant.stages);
  const totalStages = stageKeys.length;
  const completedStages = stageKeys.filter(
    (stage) => applicant.stages[stage].status === 'completed'
  ).length;
  const progressPercent = Math.round((completedStages / totalStages) * 100);

  // Cross-navigation handler
  const handleViewTasks = (companyName) => {
    setActiveScreen('tasks-dashboard');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <button
              onClick={() => handleViewTasks(applicant.company)}
              className="text-lg font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              title={`Click to view tasks for ${applicant.company}`}
            >
              {applicant.company}
            </button>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${priority.color} ${priority.textColor}`}>
              {priority.label}
            </span>
            {(applicant.overdue || applicant.stages.inspection.tasks.find(t => t.name === 'KIM Paid')?.status === 'overdue') && (
              <div className="flex items-center text-red-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                <span className="text-xs font-medium">CRITICAL</span>
              </div>
            )}
            <div className="flex items-center text-gray-600 bg-gray-100 px-2 py-1 rounded">
              <Clock className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">{applicant.daysInStage} days elapsed</span>
            </div>
          </div>
          <p className="text-gray-600 text-sm">{applicant.plant} • {applicant.region}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowAIAssistant(!showAIAssistant)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="AI Assistant - Powered by Gemini"
          >
            <Bot className="w-4 h-4" />
          </button>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      
      <ApplicantProgressBar applicant={applicant} showDetails={false} />

      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <FileText className="w-4 h-4 mr-1" />
            {applicant.documents} docs
          </span>
          <span className="flex items-center">
            <Bell className="w-4 h-4 mr-1" />
            {applicant.notes} notes
          </span>
        </div>
        <span>Updated: {applicant.lastUpdate}</span>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-700 font-medium">Next: {applicant.nextAction}</p>
          <div className="flex space-x-2">
            <button 
              onClick={() => {}}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              View Details
            </button>
            <button 
              onClick={() => handleViewTasks(applicant.company)}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              View Tasks →
            </button>
          </div>
      </div>
      </div>

      <div className="flex items-center space-x-4 pt-2 border-t border-gray-50">
        <span className="text-xs text-gray-500 font-medium">Pre-NCRC Documentation:</span>
        <button className="flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors">
          <ClipboardList className="w-3 h-3 mr-1" />
          Application Details
          <ExternalLink className="w-3 h-3 ml-1" />
        </button>
        <button className="flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors">
          <Package className="w-3 h-3 mr-1" />
          Ingredients List
          <ExternalLink className="w-3 h-3 ml-1" />
        </button>
        <button className="flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors">
          <FileText className="w-3 h-3 mr-1" />
          Product Details
          <ExternalLink className="w-3 h-3 ml-1" />
        </button>
      </div>
    </div>
  );
}