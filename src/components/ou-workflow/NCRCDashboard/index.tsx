import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ApplicantCard } from './ApplicantCard'
import { ActionModal } from './ActionModal'

type Applicant = {
  id: string
  companyName: string
  contact: string
  email: string
  priority: 'high' | 'medium' | 'low'
  status: 'in-progress' | 'approved' | 'rejected' | 'pending'
  currentStage: number
  totalStages: number
  lastUpdated: string
}

type Props = {
  showIngredientsManager: boolean
  setShowIngredientsManager: (val: boolean) => void
  selectedIngredientApp: any
  setSelectedIngredientApp: (val: any) => void
}

// ✅ Mock fetch function (replace with real API/Firebase later)
async function fetchApplicants(): Promise<Applicant[]> {
  // Simulate async fetch
  await new Promise((res) => setTimeout(res, 500))

  return [
    {
      id: '1',
      companyName: 'Fresh Farms Co.',
      contact: 'John Doe',
      email: 'john@freshfarms.com',
      priority: 'high',
      status: 'in-progress',
      currentStage: 2,
      totalStages: 5,
      lastUpdated: '2025-08-10',
    },
    {
      id: '2',
      companyName: 'Organic Valley Ltd.',
      contact: 'Sarah Smith',
      email: 'sarah@organicvalley.com',
      priority: 'medium',
      status: 'approved',
      currentStage: 5,
      totalStages: 5,
      lastUpdated: '2025-08-05',
    },
    {
      id: '3',
      companyName: 'Global Foods Inc.',
      contact: 'Mike Johnson',
      email: 'mike@globalfoods.com',
      priority: 'low',
      status: 'pending',
      currentStage: 1,
      totalStages: 5,
      lastUpdated: '2025-08-15',
    },
    {
      id: '4',
      companyName: 'Sunrise Dairy',
      contact: 'Emily Clark',
      email: 'emily@sunrisedairy.com',
      priority: 'high',
      status: 'rejected',
      currentStage: 3,
      totalStages: 5,
      lastUpdated: '2025-08-01',
    },
  ]
}

export function NCRCDashboard({
  setShowIngredientsManager,
  setSelectedIngredientApp,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // ✅ Load applicants with TanStack Query
  const {
    data: applicants = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['applicants'],
    queryFn: fetchApplicants,
  })

  // ✅ Filtering logic
  const filteredApplicants = useMemo(() => {
    return applicants.filter((app) => {
      const matchesSearch =
        app.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.email.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || app.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || app.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [searchTerm, statusFilter, priorityFilter, applicants])

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <h2 className="text-2xl font-bold text-gray-900">NCRC Dashboard</h2>
      <p className="text-gray-600">Executive Overview - Certification Management</p>

      {/* 🔍 Search + Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mt-6 mb-6 space-y-3 md:space-y-0">
        <input
          type="text"
          placeholder="Search by company, contact, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-1/3 rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="in-progress">In Progress</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="pending">Pending</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>

      {/* 📦 Applicant List */}
      {isLoading && <div className="text-gray-500">Loading applicants...</div>}
      {isError && <div className="text-red-600">Error: {(error as Error).message}</div>}

      <div className="space-y-4">
        {filteredApplicants.length > 0 ? (
          filteredApplicants.map((applicant) => (
            <ApplicantCard
              key={applicant.id}
              applicant={applicant}
              setShowIngredientsManager={setShowIngredientsManager}
              setSelectedIngredientApp={setSelectedIngredientApp}
            />
          ))
        ) : (
          !isLoading && <div className="text-gray-500 text-sm">No applicants found.</div>
        )}
      </div>

      {/* ➕ Action Button */}
      <ActionModal />
    </div>
  )
}