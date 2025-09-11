// src/routes/index.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useUser } from '../context/UserContext'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { username, role } = useUser()

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ✅ Header */}
      <header className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        {/* Left: main navigation */}
        <nav className="flex space-x-6">
          <Link to="/ou-workflow" className="text-blue-600 hover:underline font-medium">
            OU Workflow
          </Link>
          {/* You can add more links later */}
        </nav>

        {/* Right: user profile */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-800">{username}</p>
            <p className="text-xs text-gray-500">{role}</p>
          </div>
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0D8ABC&color=fff`}
            alt="profile avatar"
            className="w-9 h-9 rounded-full shadow"
          />
        </div>
      </header>

      {/* ✅ Main content area */}
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Welcome, {username}</h1>
          <p className="text-gray-600 mb-8">
            Use the navigation above to access different workflows and tools.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Example navigation cards */}
            <Link
              to="/ou-workflow"
              className="block bg-white rounded-xl shadow hover:shadow-lg p-6 text-left transition"
            >
              <h2 className="text-lg font-semibold text-blue-600 mb-2">OU Workflow</h2>
              <p className="text-sm text-gray-500">
                Manage organizational units and tasks.
              </p>
            </Link>

            {/* Add more cards here as your app grows */}
          </div>
        </div>
      </main>
    </div>
  )
}