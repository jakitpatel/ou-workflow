import { useState, useMemo } from 'react'
import { ApplicantCard } from './ApplicantCard'
import { ActionModal } from './ActionModal'
import { Search } from 'lucide-react';
import { IngredientsManagerPage } from './IngredientsManagerPage';
import { useUser } from './../../../context/UserContext'  // 👈 new import
import { useApplications } from './../hooks/useApplications';
//import type { Task, Stage, Applicant } from '@/types/application';

type Props = {
  showIngredientsManager: boolean
  setShowIngredientsManager: (val: boolean) => void
  selectedIngredientApp: any
  setSelectedIngredientApp: (val: any) => void
}

export function NCRCDashboard({
  showIngredientsManager,
  setShowIngredientsManager,
  selectedIngredientApp,
  setSelectedIngredientApp
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showActionModal, setShowActionModal] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<{
    task: any;
    action: string;
    applicantId: string;
  } | null>(null);
  const { setActiveScreen } = useUser(); // 👈 use context
  
  // Lookup tables for assignments
  const rcLookup = [
    { id: 'rc1', name: 'R. Gorelik', department: 'NCRC', specialty: 'Dairy Products', workload: 'Light' },
    { id: 'rc2', name: 'Rabbi Goldstein', department: 'NCRC', specialty: 'Baked Goods', workload: 'Medium' },
    { id: 'rc3', name: 'Rabbi Stern', department: 'NCRC', specialty: 'General', workload: 'Heavy' },
    { id: 'rc4', name: 'Rabbi Klein', department: 'NCRC', specialty: 'International', workload: 'Light' },
    { id: 'rc5', name: 'R. Herbsman', department: 'IAR', specialty: 'Ingredients Review', workload: 'Medium' }
  ];

  const departmentLookup = [
    { id: 'products', name: 'Products Department', contact: 'products@ou.org', avgTime: '3-5 days' },
    { id: 'iar', name: 'Ingredients (IAR)', contact: 'iar@ou.org', avgTime: '5-7 days' },
    { id: 'legal', name: 'Legal Department', contact: 'legal@ou.org', avgTime: '2-3 days' },
    { id: 'rfr', name: 'RFR Team', contact: 'inspections@ou.org', avgTime: '1-2 weeks' },
    { id: 'halachic', name: 'Halachic Review', contact: 'halachic@ou.org', avgTime: '3-5 days' }
  ];

  const {
    data: applicants = [],
    isLoading,
    isError,
    error,
  } = useApplications();

  const filteredApplicants = useMemo(() => {
    return (Array.isArray(applicants) ? applicants : []).filter((app) => {
      const matchesSearch =
        app.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.plant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.region?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || app.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [searchTerm, statusFilter, priorityFilter, applicants]);

  // ✅ Return conditionally AFTER all hooks
  if (showIngredientsManager && selectedIngredientApp) {
    return (
      <IngredientsManagerPage
        selectedIngredientApp={selectedIngredientApp}
        setShowIngredientsManager={setShowIngredientsManager}
      />
    );
  }

  const executeAction = (assignee: string) => {
    if (selectedAction) {
      const actionLabels = {
        'assign_rc': `Assigned to RC: ${assignee}`,
        'assign_department': `Assigned to department: ${assignee}`,
        'update_status': `Status updated to: ${assignee}`
      };
      
      const actionMessage = actionLabels[selectedAction.action] || `Action completed: ${selectedAction.action}`;
      
      handleTaskUpdate(
        `${selectedAction.applicantId}-${selectedAction.task.name}`,
        selectedAction.action === 'update_status' ? assignee : 'assigned',
        selectedAction.action !== 'update_status' ? assignee : null
      );
    }
  };

  const handleTaskAction = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    task: any,
    action: string,
    applicantId: string
  ) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (action === 'manage_ingredients') {
      const app = applicants.find(a => String(a.id) === String(applicantId));
      setSelectedIngredientApp(app);
      setShowIngredientsManager(true);
      return;
    }
    
    setSelectedAction({ task, action, applicantId });
    setShowActionModal(action);
  };

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
              handleTaskAction={handleTaskAction}
            />
          ))
        ) : (
          !isLoading && (<div className="text-center py-12">
              <p className="text-gray-500 text-lg">No applications match your current filters.</p>
              <p className="text-gray-400 mt-2">Try adjusting your search or filter criteria.</p>
            </div>)
        )}
      </div>

      <ActionModal departmentLookup={departmentLookup} 
      rcLookup={rcLookup}
      executeAction={executeAction}
      setShowActionModal={setShowActionModal} 
      showActionModal={showActionModal} 
      selectedAction={selectedAction} />
    </div>
  );
}