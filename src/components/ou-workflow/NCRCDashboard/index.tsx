import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ApplicantCard } from './ApplicantCard'
import { ActionModal } from './ActionModal'
import { Search } from 'lucide-react'
import { fetchApplicants } from './../../../api';

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
  status: string; // e.g. 'contract_sent'
  assignedRC: string;
  daysInStage: number;
  overdue: boolean;
  lastUpdate: string;
  nextAction: string;
  documents: number;
  notes: number;
  stages: Record<string, Stage>;
};

type Props = {
  showIngredientsManager: boolean
  setShowIngredientsManager: (val: boolean) => void
  selectedIngredientApp: any
  setSelectedIngredientApp: (val: any) => void
  setActiveScreen: (val: any) => void
}

export function NCRCDashboard({
  setShowIngredientsManager,
  setSelectedIngredientApp,
  setActiveScreen
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const {
    data: applicants = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['applicants'],
    queryFn: fetchApplicants,  // Using API version
  });

  const filteredApplicants = useMemo(() => {
    return applicants.filter((app) => {
      const matchesSearch =
        app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.plant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.region.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || app.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [searchTerm, statusFilter, priorityFilter, applicants]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">NCRC Dashboard</h2>
        <p className="text-gray-600">Executive Overview - Certification Management</p>
      </div>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by company, plant, region..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
        >
          <option value="all">All Statuses</option>
          <option value="contract_sent">Contract Sent</option>
          <option value="under_review">Under Review</option>
          <option value="inspection_scheduled">Inspection Scheduled</option>
          <option value="payment_pending">Payment Pending</option>
          <option value="certified">Certified</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[120px]"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      </div>

      {/* List */}
      {isLoading && <div className="text-gray-500">Loading applicants...</div>}
      {isError && <div className="text-red-600">Error: {(error as Error).message}</div>}

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-600">
          Showing {filteredApplicants.length} of {applicants.length} applications
        </p>
      </div>

      <div className="space-y-4">
        {filteredApplicants.length > 0 ? (
          filteredApplicants.map((applicant) => (
            <ApplicantCard
              key={applicant.id}
              applicant={applicant}
              setShowIngredientsManager={setShowIngredientsManager}
              setSelectedIngredientApp={setSelectedIngredientApp}
              setActiveScreen={setActiveScreen}
            />
          ))
        ) : (
          !isLoading && (<div className="text-center py-12">
              <p className="text-gray-500 text-lg">No applications match your current filters.</p>
              <p className="text-gray-400 mt-2">Try adjusting your search or filter criteria.</p>
            </div>)
        )}
      </div>

      <ActionModal />
    </div>
  );
}