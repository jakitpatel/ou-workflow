import { useState, useRef, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, User, BarChart3, ClipboardList, LogOut, Settings, Inbox, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAppPreferences } from '@/context/AppPreferencesContext'
import { useUser } from '@/context/UserContext'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { applicationsQueryKeys } from '@/features/applications/model/queryKeys'
import { tasksQueryKeys } from '@/features/tasks/model/queryKeys'

// Navigation route constants
const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  PROFILE: '/profile',
  NCRC_DASHBOARD: '/ou-workflow/ncrc-dashboard',
  TASKS_DASHBOARD: '/ou-workflow/tasks-dashboard',
  PRELIM_DASHBOARD: '/ou-workflow/prelim-dashboard',
} as const

type NavigationProps = {
  showMenu?: boolean
}

type LeftNavigationProps = {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

export function Navigation({ showMenu = true }: NavigationProps) {
  const location = useRouterState({ select: (s) => s.location.pathname })
  const { username, role, logout } = useUser()
  const { apiBaseUrl } = useAppPreferences()
  const queryClient = useQueryClient()
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

  const refreshApplicationsDashboardData = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: applicationsQueryKeys.lists(),
    })
  }, [queryClient])

  const refreshTasksDashboardData = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: tasksQueryKeys.lists(),
    })
  }, [queryClient])

  // Helper to check if route is active
  const isActiveRoute = (path: string) => location.includes(path)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm" role="navigation" aria-label="Main navigation">
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
                  onClick={refreshApplicationsDashboardData}
                  search={{
                    q: '',
                    status: 'all',
                    priority: 'all',
                    page: 0,
                    myOnly: true
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
                  onClick={refreshTasksDashboardData}
                  search={{
                    qs:'',
                    days: 'pending',
                    page: 0,
                  }}
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

export function LeftNavigation({ collapsed, onCollapsedChange }: LeftNavigationProps) {
  const location = useRouterState({ select: (s) => s.location.pathname })
  const { username, role, logout } = useUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const handleLogout = useCallback(() => {
    logout()
    navigate({ to: ROUTES.LOGIN })
  }, [logout, navigate])

  const refreshApplicationsDashboardData = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: applicationsQueryKeys.lists(),
    })
  }, [queryClient])

  const refreshTasksDashboardData = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: tasksQueryKeys.lists(),
    })
  }, [queryClient])

  const isActiveRoute = (path: string) => location.includes(path)
  const navWidth = collapsed ? 'w-16' : 'w-64'

  const linkClass = (active: boolean) =>
    `flex h-10 items-center rounded-md px-3 text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-100 text-blue-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    } ${collapsed ? 'justify-center' : 'gap-3'}`

  const iconClass = collapsed ? 'h-5 w-5 shrink-0' : 'h-5 w-5 shrink-0'

  return (
    <aside
      className={`fixed bottom-0 left-0 top-0 z-50 flex ${navWidth} flex-col border-r border-gray-200 bg-white shadow-sm transition-[width] duration-200`}
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-3">
        <Link
          to={ROUTES.HOME}
          className={`flex min-w-0 items-center ${collapsed ? 'justify-center' : 'gap-2'}`}
          aria-label="Home"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
            OU
          </div>
          {!collapsed ? (
            <span className="truncate text-sm font-semibold text-gray-900">Workflow System</span>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label={collapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        <Link
          to={ROUTES.NCRC_DASHBOARD}
          onClick={refreshApplicationsDashboardData}
          search={{
            q: '',
            status: 'all',
            priority: 'all',
            page: 0,
            myOnly: true,
          }}
          className={linkClass(isActiveRoute('ncrc-dashboard'))}
          aria-current={isActiveRoute('ncrc-dashboard') ? 'page' : undefined}
          title="Application Dashboard"
        >
          <BarChart3 className={iconClass} aria-hidden="true" />
          {!collapsed ? <span className="truncate">Application Dashboard</span> : null}
        </Link>

        <Link
          to={ROUTES.TASKS_DASHBOARD}
          onClick={refreshTasksDashboardData}
          search={{
            qs: '',
            days: 'pending',
            page: 0,
          }}
          className={linkClass(isActiveRoute('tasks-dashboard'))}
          aria-current={isActiveRoute('tasks-dashboard') ? 'page' : undefined}
          title="Tasks & Notifications"
        >
          <ClipboardList className={iconClass} aria-hidden="true" />
          {!collapsed ? <span className="truncate">Tasks & Notifications</span> : null}
        </Link>

        <Link
          to={ROUTES.PROFILE}
          className={linkClass(isActiveRoute('profile'))}
          aria-current={isActiveRoute('profile') ? 'page' : undefined}
          title="Profile"
        >
          <Settings className={iconClass} aria-hidden="true" />
          {!collapsed ? <span className="truncate">Profile</span> : null}
        </Link>

        <Link
          to={ROUTES.PRELIM_DASHBOARD}
          search={{
            q: '',
            status: 'all',
            page: 0,
          }}
          className={linkClass(isActiveRoute('prelim-dashboard'))}
          aria-current={isActiveRoute('prelim-dashboard') ? 'page' : undefined}
          title="Application Intake Dashboard"
        >
          <Inbox className={iconClass} aria-hidden="true" />
          {!collapsed ? <span className="truncate">Application Intake Dashboard</span> : null}
        </Link>
      </nav>

      <div className="border-t border-gray-200 p-2">
        {!collapsed ? (
          <div className="mb-2 min-w-0 px-2 text-xs text-gray-500">
            <div className="truncate">{username}</div>
            {role ? <div className="truncate">{role}</div> : null}
          </div>
        ) : null}
        <button
          type="button"
          className={`flex h-10 w-full items-center rounded-md px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 ${
            collapsed ? 'justify-center' : 'gap-3'
          }`}
          onClick={handleLogout}
          title="Sign Out"
        >
          <LogOut className={iconClass} aria-hidden="true" />
          {!collapsed ? <span>Sign Out</span> : null}
        </button>
      </div>
    </aside>
  )
}
