import React, { useState, useRef, useEffect } from 'react'
import { Bell, User, BarChart3, ClipboardList, LogOut, Settings } from 'lucide-react'

type Props = {
  activeScreen: string
  setActiveScreen: (screen: string) => void
}

export function Navigation({ activeScreen, setActiveScreen }: Props) {
  const currentUser = 'S. Benjamin'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Nav */}
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

          {/* Right: Notifications + User */}
          <div className="flex items-center space-x-3 relative" ref={menuRef}>
            <Bell className="w-5 h-5 text-gray-500 cursor-pointer" />

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-1.5 px-2 py-1 rounded-md hover:bg-gray-100"
            >
              <User className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-700">{currentUser}</span>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-10 w-40 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50">
                <button
                  className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={() => {
                    setMenuOpen(false)
                    // TODO: navigate to profile page
                    alert('Profile clicked')
                  }}
                >
                  <Settings className="w-4 h-4 mr-2 text-gray-500" />
                  Profile
                </button>
                <button
                  className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  onClick={() => {
                    setMenuOpen(false)
                    // TODO: implement sign out logic
                    alert('Signed out')
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}