import { createFileRoute, Link } from "@tanstack/react-router"
import { useUser } from "@/context/UserContext"
import { useState } from "react"
import DashboardAppDialog from "@/components/ou-workflow/modal/DashboardAppDialog"

export const Route = createFileRoute("/")({
  component: App,
})

function App() {
  const { username, setActiveScreen } = useUser()

  const [showCreate, setShowCreate] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  return (
    <main className="flex-1 p-8">
      <div className="max-w-4xl mx-auto text-center">
        
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Welcome, {username}
        </h1>

        <p className="text-gray-600 mb-8">
          Use the options below to access different dashboards and tools.
        </p>

        {/* EXISTING GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <Link
            to="/ou-workflow/ncrc-dashboard"
            onClick={() => setActiveScreen("ncrc-dashboard")}
            className="block bg-white rounded-xl shadow hover:shadow-lg p-6 text-left transition"
          >
            <h2 className="text-lg font-semibold text-blue-600 mb-2">
              NCRC Dashboard
            </h2>
          </Link>

          <Link
            to="/ou-workflow/tasks-dashboard"
            onClick={() => setActiveScreen("tasks-dashboard")}
            className="block bg-white rounded-xl shadow hover:shadow-lg p-6 text-left transition"
          >
            <h2 className="text-lg font-semibold text-blue-600 mb-2">
              Task & Notification
            </h2>
          </Link>
        </div>

        {/* NEW BUTTONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button
            onClick={() => setShowCreate(true)}
            className="block w-full bg-white rounded-xl shadow hover:shadow-lg p-6 text-left transition"
          >
            <h2 className="text-lg font-semibold text-blue-600 mb-2">
              Create Dashboard App
            </h2>
          </button>

          <button
            onClick={() => setShowDelete(true)}
            className="block w-full bg-white rounded-xl shadow hover:shadow-lg p-6 text-left transition"
          >
            <h2 className="text-lg font-semibold text-blue-600 mb-2">
              Delete Dashboard App
            </h2>
          </button>
        </div>
      </div>

      {/* dialogs */}
      <DashboardAppDialog
        mode="create"
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />

      <DashboardAppDialog
        mode="delete"
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
      />
    </main>
  )
}