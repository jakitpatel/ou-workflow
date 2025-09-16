import React, { useState, useRef, useEffect } from 'react'
import { Bell, User, BarChart3, ClipboardList, LogOut, Settings } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchRoles } from './../../api';
import { useUser } from './../../context/UserContext'  // 👈 new import
import { Link } from '@tanstack/react-router'

type Props = {
  hideMenu?: boolean   // 👈 new optional prop
}

export function Navigation({ hideMenu }: Props) {
  const { username, role, setRole, activeScreen, setActiveScreen } = useUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  const {
    data: roles = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,  // Using API version
  });
  
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
                <Link
                  to="/"
                  className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center hover:bg-blue-700 transition"
                >
                  <span className="text-white font-bold text-xs">OU</span>
                </Link>
              </div>
              <span className="text-lg font-semibold text-gray-900">Workflow System</span>
            </div>

            {/* ✅ Conditionally render top menu */}
            {!hideMenu && (
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
            )}
          </div>

          {/* Right: Notifications + User */}
          <div className="flex items-center space-x-3 relative" ref={menuRef}>
            <Bell className="w-5 h-5 text-gray-500 cursor-pointer" />

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-1.5 px-2 py-1 rounded-md hover:bg-gray-100"
            >
              <User className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-700">{username}</span>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 shadow-lg rounded-md py-2 z-50">
                
                {/* Roles Dropdown */}
                <div className="px-3 pb-2">
                  {isLoading && <p className="text-xs text-gray-500">Loading roles...</p>}
                  {isError && <p className="text-xs text-red-500">Error loading roles</p>}
                  {!isLoading && !isError && roles.length > 0 && (
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

               {/* Profile */}
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)} // close dropdown on click
                  className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <Settings className="w-4 h-4 mr-2 text-gray-500" />
                  Profile
                </Link>
                {/* Sign out */}
                <button
                  className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  onClick={() => {
                    setMenuOpen(false)
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