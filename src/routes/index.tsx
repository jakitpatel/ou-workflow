import { createFileRoute, Link } from '@tanstack/react-router'
import { useUser } from '@/context/UserContext'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { username, setActiveScreen } = useUser()

  return (
    <main className="flex-1 p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Welcome, {username}
        </h1>
        <p className="text-gray-600 mb-8">
          Use the options below to access different dashboards and tools.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            to="/ou-workflow/ncrc-dashboard"
            onClick={() => setActiveScreen('ncrc-dashboard')}
            className="block bg-white rounded-xl shadow hover:shadow-lg p-6 text-left transition"
          >
            <h2 className="text-lg font-semibold text-blue-600 mb-2">
              NCRC Dashboard
            </h2>
          </Link>

          <Link
            to="/ou-workflow/tasks-dashboard"
            onClick={() => setActiveScreen('tasks-dashboard')}
            className="block bg-white rounded-xl shadow hover:shadow-lg p-6 text-left transition"
          >
            <h2 className="text-lg font-semibold text-blue-600 mb-2">
              Task & Notification
            </h2>
          </Link>
        </div>
      </div>
    </main>
  )
}