import { createFileRoute, Link } from '@tanstack/react-router';
import { useUser } from '@/context/UserContext';
import { useState, useCallback } from 'react';
import { 
  BarChart3, 
  ClipboardList, 
  PlusCircle, 
  Trash2,
  ChevronRight 
} from 'lucide-react';
import DashboardAppDialog from '@/components/ou-workflow/modal/DashboardAppDialog';

export const Route = createFileRoute('/')({
  component: HomePage,
});

// Types
type DialogMode = 'create' | 'delete' | null;

// Card Component
interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  to?: string;
  onClick?: () => void;
  variant?: 'primary' | 'success' | 'danger';
}

function DashboardCard({ 
  title, 
  description, 
  icon: Icon, 
  to, 
  onClick,
  variant = 'primary' 
}: DashboardCardProps) {
  const variantClasses = {
    primary: 'text-blue-600 bg-blue-50 group-hover:bg-blue-100',
    success: 'text-green-600 bg-green-50 group-hover:bg-green-100',
    danger: 'text-red-600 bg-red-50 group-hover:bg-red-100',
  };

  const iconColorClasses = {
    primary: 'text-blue-600',
    success: 'text-green-600',
    danger: 'text-red-600',
  };

  const commonClasses = 
    'group block w-full bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-200 p-6 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

  const content = (
    <>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-lg ${variantClasses[variant]} transition-colors`}>
          <Icon className="w-6 h-6" aria-hidden="true" />
        </div>
        <ChevronRight 
          className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" 
          aria-hidden="true" 
        />
      </div>
      <h2 className={`text-lg font-semibold ${iconColorClasses[variant]} mb-2 group-hover:underline`}>
        {title}
      </h2>
      <p className="text-sm text-gray-600">
        {description}
      </p>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={commonClasses} aria-label={`Navigate to ${title}`}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={commonClasses}
      aria-label={title}
    >
      {content}
    </button>
  );
}

// Main Component
function HomePage() {
  const { username, role } = useUser();
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);

  const openDialog = useCallback((mode: 'create' | 'delete') => {
    setDialogMode(mode);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogMode(null);
  }, []);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <main className="flex-1 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Header Section */}
        <header className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            {greeting}, {username || 'User'}
          </h1>
          
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Access your dashboards and manage your workflow applications
            {role && <span className="text-gray-500"> • Role: {role}</span>}
          </p>
        </header>

        {/* Navigation Cards Section */}
        <section aria-labelledby="navigation-heading" className="mb-8">
          <h2 id="navigation-heading" className="sr-only">
            Navigation Options
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <DashboardCard
              title="Application Dashboard"
              description="View and manage applications and workflows"
              icon={BarChart3}
              to="/ou-workflow/ncrc-dashboard"
              variant="primary"
            />

            <DashboardCard
              title="Tasks & Notifications"
              description="Track your pending tasks and recent notifications"
              icon={ClipboardList}
              to="/ou-workflow/tasks-dashboard"
              variant="primary"
            />
          </div>
        </section>

        {/* Navigation Cards Section */}
        <section aria-labelledby="navigation-heading" className="mb-8">
          <h2 id="navigation-heading" className="sr-only">
            Navigation Options
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <DashboardCard
              title="Preliminary Dashboard"
              description="View and manage Preliminary applications data"
              icon={BarChart3}
              to="/ou-workflow/prelim-dashboard"
              variant="primary"
            />
          </div>
        </section>

        {/* Management Actions Section */}
        <section aria-labelledby="management-heading">
          <h2 id="management-heading" className="text-xl font-semibold text-gray-900 mb-4">
            Dashboard Management
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <DashboardCard
              title="Create Dashboard App"
              description="Set up a new dashboard application"
              icon={PlusCircle}
              onClick={() => openDialog('create')}
              variant="success"
            />

            <DashboardCard
              title="Delete Dashboard App"
              description="Remove an existing dashboard application"
              icon={Trash2}
              onClick={() => openDialog('delete')}
              variant="danger"
            />
          </div>
        </section>
      </div>

      {/* Dialogs */}
      {dialogMode && (
        <DashboardAppDialog
          mode={dialogMode}
          isOpen={true}
          onClose={closeDialog}
        />
      )}
    </main>
  );
}