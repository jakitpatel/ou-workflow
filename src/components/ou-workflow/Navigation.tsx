import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell, User, BarChart3, ClipboardList, LogOut, Settings } from 'lucide-react'
import { useUser } from '@/context/UserContext'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'

// Navigation route constants
const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  PROFILE: '/profile',
  NCRC_DASHBOARD: '/ou-workflow/ncrc-dashboard',
  TASKS_DASHBOARD: '/ou-workflow/tasks-dashboard',
} as const

type NavigationProps = {
  showMenu?: boolean
}

export function Navigation({ showMenu = true }: NavigationProps) {
  const location = useRouterState({ select: (s) => s.location.pathname })
  const { username, role, logout, apiBaseUrl } = useUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [menuOpen])

  const handleLogout = useCallback(() => {
    setMenuOpen(false)
    logout()
    navigate({ to: ROUTES.LOGIN })
  }, [logout, navigate])

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev)
  }, [])

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
  }, [])

  // Helper to check if route is active
  const isActiveRoute = (path: string) => location.includes(path)

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Navigation Links */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            {/* Logo */}
            <Link
              to={ROUTES.HOME}
              className="flex items-center space-x-2 group"
              aria-label="Home"
            >
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center group-hover:bg-blue-700 transition-colors">
                <span className="text-white font-bold text-xs">OU</span>
              </div>
              <span className="text-base sm:text-lg font-semibold text-gray-900 hidden sm:inline">
                Workflow System
              </span>
            </Link>

            {/* Navigation Menu */}
            {showMenu && (
              <div className="hidden md:flex space-x-1">
                <Link
                  to={ROUTES.NCRC_DASHBOARD}
                  search={{
                    q: '',
                    status: 'all',
                    priority: 'all',
                    page: 0,
                  }}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                    isActiveRoute('ncrc-dashboard')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-current={isActiveRoute('ncrc-dashboard') ? 'page' : undefined}
                >
                  <BarChart3 className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  Application Dashboard
                </Link>

                <Link
                  to={ROUTES.TASKS_DASHBOARD}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                    isActiveRoute('tasks-dashboard')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  aria-current={isActiveRoute('tasks-dashboard') ? 'page' : undefined}
                >
                  <ClipboardList className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  Tasks & Notifications
                </Link>
              </div>
            )}
          </div>

          {/* Right: API Info, Notifications & User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-3 relative" ref={menuRef}>
            {/* API Base URL - Hidden on small screens */}
            {apiBaseUrl && (
              <span className="hidden lg:inline text-xs sm:text-sm text-gray-500 mr-2 sm:mr-4">
                API: {apiBaseUrl}
              </span>
            )}

            {/* Notifications */}
            <button
              type="button"
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-500" aria-hidden="true" />
            </button>

            {/* User Menu */}
            <button
              type="button"
              onClick={toggleMenu}
              className="flex items-center space-x-1.5 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label="User menu"
            >
              <User className="w-5 h-5 text-gray-500" aria-hidden="true" />
              <span className="text-xs sm:text-sm text-gray-700 max-w-[120px] truncate">
                {username}
                {role && <span className="text-gray-500">/{role}</span>}
              </span>
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div 
                className="absolute right-0 top-12 w-48 bg-white border border-gray-200 shadow-lg rounded-md py-2 z-50"
                role="menu"
                aria-orientation="vertical"
              >
                {/* Profile Link */}
                <Link
                  to={ROUTES.PROFILE}
                  onClick={closeMenu}
                  className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                  role="menuitem"
                >
                  <Settings className="w-4 h-4 mr-2 text-gray-500" aria-hidden="true" />
                  Profile
                </Link>

                {/* Divider */}
                <div className="border-t border-gray-200 my-1" role="separator" />

                {/* Sign Out */}
                <button
                  type="button"
                  className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}