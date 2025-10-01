import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '../context/UserContext'
import { Navigation } from './../components/ou-workflow/Navigation' // 👈 import your nav

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { username, role } = useUser()
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
            <span className="font-semibold text-gray-700">Role: </span>
            {role}
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
