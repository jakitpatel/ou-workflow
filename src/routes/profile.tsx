import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { useUser } from '@/context/UserContext'
import { getBuildInfo } from '@/lib/utils'
import { User, Shield, Server, Code, Check } from 'lucide-react'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

// Info card component for reusability
function InfoCard({ 
  icon: Icon, 
  label, 
  value, 
  className = '' 
}: { 
  icon: React.ElementType
  label: string
  value: string | React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-start space-x-3 ${className}`}>
      <div className="flex-shrink-0 mt-0.5">
        <Icon className="w-5 h-5 text-gray-400" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 break-words">{value}</dd>
      </div>
    </div>
  )
}

function ProfilePage() {
  const { username, role, roles, setRole, apiBaseUrl, stageLayout, setStageLayout, paginationMode, setPaginationMode } = useUser()
  const { version, buildTime } = getBuildInfo()
  const [showRoleChangeSuccess, setShowRoleChangeSuccess] = useState(false)
  const [showPrefSuccess, setShowPrefSuccess] = useState(false);

  // Format active role display
  const getActiveRoleDisplay = useCallback(() => {
    if (!role) return 'None selected'
    if (role === 'ALL') {
      const roleNames = (roles ?? []).map((r) => r.name).join(', ')
      return `All Roles${roleNames ? ` (${roleNames})` : ''}`
    }
    return role
  }, [role, roles])

  // Handle role change with feedback
  const handleRoleChange = useCallback((selectedValue: string) => {
    if (selectedValue === role) return // No change
    
    if (selectedValue === 'ALL') {
      setRole('ALL')
    } else if (selectedValue) {
      setRole(selectedValue)
    }
    
    // Show success feedback
    setShowRoleChangeSuccess(true)
    setTimeout(() => setShowRoleChangeSuccess(false), 2000)
  }, [role, setRole])

  const handleStageLayoutChange = (value: 'horizontal' | 'mixed') => {
    if (value === stageLayout) return
    setStageLayout(value)
    setShowPrefSuccess(true)
    setTimeout(() => setShowPrefSuccess(false), 2000)
  }

  const handlePaginationModeChange = (value: 'paged' | 'infinite') => {
    if (value === paginationMode) return
    setPaginationMode(value)
    setShowPrefSuccess(true)
    setTimeout(() => setShowPrefSuccess(false), 2000)
  }

  const hasRoles = roles && roles.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your account information and preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* User Information Card */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">User Information</h2>
            </div>
            <dl className="px-6 py-5 space-y-4">
              <InfoCard 
                icon={User} 
                label="Username" 
                value={username || 'Not available'} 
              />
              <InfoCard 
                icon={Shield} 
                label="Active Role" 
                value={getActiveRoleDisplay()} 
              />
            </dl>
          </section>

          {/* Role Selection Card */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Role Selection</h2>
            </div>
            <div className="px-6 py-5">
              {hasRoles ? (
                <div className="space-y-3">
                  <label 
                    htmlFor="role-select" 
                    className="block text-sm font-medium text-gray-700"
                  >
                    Select your active role
                  </label>
                  <div className="relative">
                    <select
                      id="role-select"
                      value={role === 'ALL' ? 'ALL' : role ?? ''}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 pl-3 pr-10 transition-colors"
                      aria-label="Select user role"
                    >
                      <option value="">Select a role</option>
                      <option value="ALL">All Roles</option>
                      {roles.map((r, idx) => (
                        <option key={idx} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Success feedback */}
                  {showRoleChangeSuccess && (
                    <div className="flex items-center space-x-2 text-sm text-green-600 animate-fade-in">
                      <Check className="w-4 h-4" aria-hidden="true" />
                      <span>Role updated successfully</span>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Changing your role will affect your access permissions
                  </p>
                </div>
              ) : (
                <div className="text-sm text-gray-500 py-2">
                  No roles available
                </div>
              )}
            </div>
          </section>
          {/* Preferences Card */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Display Preferences
              </h2>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Stage Layout */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Application Stage Layout
                </label>
                <select
                  value={stageLayout}
                  onChange={(e) =>
                    handleStageLayoutChange(e.target.value as 'horizontal' | 'mixed')
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
                >
                  <option value="horizontal">Horizontal (Classic)</option>
                  <option value="mixed">Mixed (Vertical + Horizontal)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Controls how application stages are displayed in progress view
                </p>
              </div>

              {/* Pagination Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Application List Pagination
                </label>
                <select
                  value={paginationMode}
                  onChange={(e) =>
                    handlePaginationModeChange(e.target.value as 'paged' | 'infinite')
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
                >
                  <option value="paged">Page Controls</option>
                  <option value="infinite">Infinite Scroll</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Choose between classic pagination or scroll-to-load behavior
                </p>
              </div>

              {/* Success Feedback */}
              {showPrefSuccess && (
                <div className="flex items-center space-x-2 text-sm text-green-600 animate-fade-in">
                  <Check className="w-4 h-4" />
                  <span>Preferences updated</span>
                </div>
              )}
            </div>
          </section>

          {/* System Information Card */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">System Information</h2>
            </div>
            <dl className="px-6 py-5 space-y-4">
              <InfoCard 
                icon={Server} 
                label="API Base URL" 
                value={apiBaseUrl || 'Not configured'} 
              />
              <InfoCard 
                icon={Code} 
                label="Build Version" 
                value={`v${version || 'Unknown'}`} 
              />
              <InfoCard 
                icon={Code} 
                label="Build Time" 
                value={buildTime || 'Unknown'} 
              />
            </dl>
          </section>
        </div>
      </main>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}