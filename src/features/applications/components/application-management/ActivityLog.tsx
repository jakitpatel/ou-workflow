import { AlertTriangle, Beaker, Building, CheckCircle, MessageSquare, Package, Send, Users } from "lucide-react";

// Type definitions
interface Activity {
  type: 'ingredient' | 'plant' | 'company' | 'bulk' | 'completion' | 'dispatch' | 'undo';
  action: string;
  details: string;
  user: string;
  date: string;
  status: 'approved' | 'pending' | 'completed';
}

interface Comment {
  author: string;
  date: string;
  comment: string;
}

interface ActivityLogProps {
  recentActivity: Activity[];
  comments: Comment[];
}

// Constants
const ACTIVITY_ICONS = {
  ingredient: { icon: Beaker, color: 'text-green-600', bg: 'bg-green-100' },
  plant: { icon: Building, color: 'text-blue-600', bg: 'bg-blue-100' },
  company: { icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
  bulk: { icon: Package, color: 'text-gray-600', bg: 'bg-gray-100' },
  completion: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  dispatch: { icon: Send, color: 'text-blue-600', bg: 'bg-blue-100' },
  undo: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
} as const;

const STATUS_STYLES = {
  approved: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-100 text-gray-800',
} as const;

// Utility functions
const getTodayCount = (activities: Activity[]): number => {
  return activities.filter(a => a.date.includes('2025-07-18')).length;
};

const getIngredientCount = (activities: Activity[]): number => {
  return activities.filter(a => a.type === 'ingredient').length;
};

const getManualUpdateCount = (activities: Activity[]): number => {
  return activities.filter(a => a.user !== 'System' && a.user !== 'System Import').length;
};

const getApprovedCount = (activities: Activity[]): number => {
  return activities.filter(a => a.status === 'approved').length;
};

// Sub-components
const StatCard = ({ value, label, bgColor, textColor, borderColor }: { 
  value: number; 
  label: string; 
  bgColor: string; 
  textColor: string;
  borderColor: string;
}) => (
  <div className={`${bgColor} ${borderColor} border rounded-lg p-4`}>
    <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
    <div className={`text-sm ${textColor.replace('600', '700')}`}>{label}</div>
  </div>
);

const ActivityItem = ({ activity }: { activity: Activity }) => {
  const iconConfig = ACTIVITY_ICONS[activity.type];
  const Icon = iconConfig.icon;

  return (
    <div className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className={`p-2 rounded-full ${iconConfig.bg}`}>
        <Icon className={`h-4 w-4 ${iconConfig.color}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-medium text-gray-900">{activity.action}</h3>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[activity.status]}`}>
              {activity.status}
            </span>
            <span className="text-xs text-gray-500 whitespace-nowrap">{activity.date}</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
        <p className="text-xs text-gray-500 mt-1">
          <span className="font-medium">Updated by:</span> {activity.user}
        </p>
      </div>
    </div>
  );
};

const CommentItem = ({ comment }: { comment: Comment }) => (
  <div className="text-sm text-green-700 border-l-2 border-green-300 pl-3">
    <div className="flex justify-between items-start gap-2">
      <span className="font-medium">{comment.author}</span>
      <span className="text-xs text-green-600 whitespace-nowrap">{comment.date}</span>
    </div>
    <p className="mt-1">{comment.comment}</p>
  </div>
);

const InfoPanel = ({ 
  icon: Icon, 
  title, 
  bgColor, 
  borderColor, 
  textColor, 
  children 
}: { 
  icon: typeof CheckCircle; 
  title: string; 
  bgColor: string; 
  borderColor: string; 
  textColor: string; 
  children: React.ReactNode;
}) => (
  <div className={`p-4 ${bgColor} border ${borderColor} rounded-lg`}>
    <div className="flex items-start space-x-3">
      <Icon className={`h-5 w-5 ${textColor} mt-0.5 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <h3 className={`font-medium ${textColor.replace('600', '800')}`}>{title}</h3>
        {children}
      </div>
    </div>
  </div>
);

// Main component
export default function ActivityLog({ recentActivity, comments }: ActivityLogProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">Recent Activity & Change Log</h2>
      
      {/* Statistics Grid */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          value={getTodayCount(recentActivity)} 
          label="Actions Today" 
          bgColor="bg-green-50" 
          textColor="text-green-600"
          borderColor="border-green-200"
        />
        <StatCard 
          value={getIngredientCount(recentActivity)} 
          label="Ingredient Changes" 
          bgColor="bg-blue-50" 
          textColor="text-blue-600"
          borderColor="border-blue-200"
        />
        <StatCard 
          value={getManualUpdateCount(recentActivity)} 
          label="Manual Updates" 
          bgColor="bg-purple-50" 
          textColor="text-purple-600"
          borderColor="border-purple-200"
        />
        <StatCard 
          value={getApprovedCount(recentActivity)} 
          label="Approved Changes" 
          bgColor="bg-orange-50" 
          textColor="text-orange-600"
          borderColor="border-orange-200"
        />
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {recentActivity.map((activity, index) => (
          <ActivityItem key={index} activity={activity} />
        ))}
      </div>

      {/* Info Panels */}
      <div className="mt-8 space-y-4">
        <InfoPanel 
          icon={CheckCircle}
          title="NCRC Database Sync"
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
          textColor="text-blue-600"
        >
          <p className="text-blue-700 text-sm mt-1">
            All changes are automatically synchronized with the NCRC database. 
            Recent additions are tracked and auditable for compliance purposes.
            <br />
            <strong>Last Sync:</strong> 2025-07-18 14:35 • <strong>Status:</strong> Active
          </p>
        </InfoPanel>

        <InfoPanel 
          icon={MessageSquare}
          title="Internal Comments"
          bgColor="bg-green-50"
          borderColor="border-green-200"
          textColor="text-green-600"
        >
          <div className="space-y-2 mt-2">
            {comments.map((comment, index) => (
              <CommentItem key={index} comment={comment} />
            ))}
          </div>
        </InfoPanel>
      </div>
    </div>
  );
}