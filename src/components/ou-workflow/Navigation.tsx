import { useState, useRef, useEffect } from 'react'
import { Bell, User, BarChart3, ClipboardList, LogOut, Settings } from 'lucide-react'
import { useUser } from './../../context/UserContext'  // 👈 new import
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { getApiBaseUrl } from '@/lib/utils'

/*type Props = {
  hideMenu?: boolean   // 👈 new optional prop
}*/

export function Navigation() {
  // inside Navigation component, remove setActiveScreen calls and add:
  const location = useRouterState({ select: (s) => s.location.pathname })
  
  const { username, role, setActiveScreen, logout } = useUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  
  const API_BASE_URL = getApiBaseUrl();
  
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
            {!false && (
              <nav className="flex space-x-1">
                <Link
                  to="/ou-workflow/ncrc-dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.includes('ncrc-dashboard')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 inline-block mr-1.5" />
                  NCRC Dashboard
                </Link>

                <Link
                  to="/ou-workflow/tasks-dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.includes('tasks-dashboard')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 inline-block mr-1.5" />
                  Tasks & Notifications
                </Link>
              </nav>
            )}
          </div>

          {/* Right: Notifications + User */}
         <div className="flex items-center space-x-3 relative" ref={menuRef}>
          <span className="text-sm text-gray-500 mr-4">API : {API_BASE_URL}</span>
  <Bell className="w-5 h-5 text-gray-500 cursor-pointer" />
  <button
    type="button"
    onClick={() => {
      setMenuOpen(!menuOpen);
    }}
    className="flex items-center space-x-1.5 px-2 py-1 rounded-md hover:bg-gray-100"
  >
    <User className="w-5 h-5 text-gray-500" />
    <span className="text-sm text-gray-700">{username}/{role}</span>
  </button>
          {menuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 shadow-lg rounded-md py-2 z-50">
               {/* Profile */}
                <Link
                  to="/profile"
                  onClick={() => {
                    setMenuOpen(false);
                    setActiveScreen(null); // ✅ safe now
                  }}
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
                    logout()
                    navigate({ to: '/login' })
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