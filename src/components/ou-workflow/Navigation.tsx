import React from 'react'
import { Bell, User, BarChart3, ClipboardList } from 'lucide-react'

type Props = {
  activeScreen: string
  setActiveScreen: (screen: string) => void
}

export function Navigation({ activeScreen, setActiveScreen }: Props) {
  const currentUser = 'A. Gottesman'

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">OU</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">Workflow System</span>
            </div>

            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveScreen('ncrc-dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeScreen === 'ncrc-dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline-block mr-1.5" />
                NCRC Dashboard
              </button>

              <button
                onClick={() => setActiveScreen('tasks-dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeScreen === 'tasks-dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <ClipboardList className="w-4 h-4 inline-block mr-1.5" />
                Tasks & Notifications
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            <Bell className="w-4 h-4 text-gray-500" />
            <div className="flex items-center space-x-1.5">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">{currentUser}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
