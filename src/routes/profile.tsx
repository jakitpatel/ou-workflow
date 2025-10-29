import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@/context/UserContext'
//import { Navigation } from '@/components/ou-workflow/Navigation' // 👈 import your nav

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { username, role, roles, setRole } = useUser()
  
  const API_BUILD = import.meta.env.VITE_API_BUILD;
  const API_LOCAL_URL = import.meta.env.VITE_API_LOCAL_URL;
  const API_CLIENT_URL = import.meta.env.VITE_API_CLIENT_URL;

  const API_BASE_URL =
    API_BUILD === "client" ? API_CLIENT_URL : API_LOCAL_URL;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ✅ Navigation included */}
      {/*<Navigation />*/}

      <main className="flex-1 max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">User Profile</h1>
        <div className="space-y-4 bg-white rounded-xl shadow p-6">
          <div>
            <span className="font-semibold text-gray-700">Username: </span>
            {username}
          </div>
          <div>
            <span className="font-semibold text-gray-700">Active Role: </span>
            {role === 'ALL'
              ? `AllRoles (${roles.map((r) => r.name).join(', ')})`
              : role || 'None selected'}
          </div>
          {/* Roles Dropdown */}
          <div className="pb-2">
            <span className="font-semibold text-gray-700">Select Role: </span>
            {roles.length > 0 && (
              <select
                value={role === 'ALL' ? 'ALL' : role}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  if (selectedValue === 'ALL') {
                    // ✅ special case: select all roles
                    setRole('ALL');
                  } else {
                    setRole(selectedValue);
                  }
                }}
                className="w-full border border-gray-300 rounded-md text-sm p-1 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Role</option>
                {/* ✅ new option */}
                <option value="ALL">All Roles</option>
                {roles.map((r, idx) => (
                  <option key={idx} value={r.value}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <span className="font-semibold text-gray-700">API URL: </span>
            {API_BASE_URL}
          </div>
        </div>
      </main>
    </div>
  )
}
