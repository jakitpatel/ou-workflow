import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '../context/UserContext'
import { Navigation } from './../components/ou-workflow/Navigation' // 👈 import your nav
import { useQuery } from '@tanstack/react-query'
import { fetchRoles } from './../api';
import { useEffect } from 'react';

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { username, role, roles, setRole, token, strategy } = useUser()
  const apiUrl = "http://localhost:5656";//import.meta.env.VITE_API_BASE_URL

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ✅ Navigation included */}
      <Navigation />

      <main className="flex-1 max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">User Profile</h1>
        <div className="space-y-4 bg-white rounded-xl shadow p-6">
          <div>
            <span className="font-semibold text-gray-700">Username: </span>
            {username}
          </div>
          <div>
            <span className="font-semibold text-gray-700">Roles: </span>
            {roles.map((role) => role.name).join(', ')}
          </div>
          <div>
            <span className="font-semibold text-gray-700">Role: </span>
            {role}
          </div>
          {/* Roles Dropdown */}
          <div className="pb-2">
            {/*isLoading && <p className="text-xs text-gray-500">Loading roles...</p>*/}
            {/*isError && <p className="text-xs text-red-500">Error loading roles</p>*/}
            <span className="font-semibold text-gray-700">Select Role: </span>
            {roles.length > 0 && (
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-gray-300 rounded-md text-sm p-1 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Role</option>
                {roles.map((role: { name: string; value: string }, idx: number) => (
                  <option key={idx} value={role.value}>
                    {role.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <span className="font-semibold text-gray-700">API URL: </span>
            {apiUrl}
          </div>
        </div>
      </main>
    </div>
  )
}
