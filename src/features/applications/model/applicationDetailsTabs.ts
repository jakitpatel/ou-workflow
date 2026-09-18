import { Upload, FileText, Building, Users, Package, Beaker, ClipboardList, Mail } from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'company', label: 'Company Details', icon: Building },
  { id: 'contacts', label: 'Company Contacts', icon: Users },
  { id: 'plants', label: 'Plants', icon: Building },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'ingredients', label: 'Ingredients', icon: Beaker },
  { id: 'raw-application', label: 'Raw Application', icon: FileText },
  { id: 'quote', label: 'Quote', icon: FileText },
  // Temporarily hidden from Application Details and Application Intake Details menus.
  // { id: 'activity', label: 'Recent Activity', icon: AlertCircle },
  { id: 'task-events', label: 'Task Events', icon: ClipboardList },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'files', label: 'File Management', icon: Upload },
] as const

const SCHEDULE_A_TAB = { id: 'schedule-a', label: 'Schedule A', icon: ClipboardList } as const
const INSPECTION_INVOICE_TAB = {
  id: 'inspection-invoice',
  label: 'Inspection Invoice',
  icon: FileText,
} as const
const SCHEDULE_B_TAB = { id: 'schedule-b', label: 'Schedule B', icon: Package } as const
const CONTRACT_TAB = { id: 'contract', label: 'Contract', icon: FileText } as const


const RFR_TABS = [TABS[1], TABS[2], TABS[3], SCHEDULE_A_TAB, SCHEDULE_B_TAB, TABS[6]] as const

export function getApplicationDetailsTabs(dataSource: 'application' | 'prelim', rfrView = false) {
  if (rfrView) return RFR_TABS
  if (dataSource !== 'application') return TABS
  const applicationTabs = TABS.filter((tab) => tab.id !== 'products' && tab.id !== 'ingredients')
  return [
    ...applicationTabs.slice(0, 4),
    INSPECTION_INVOICE_TAB, SCHEDULE_A_TAB, SCHEDULE_B_TAB, CONTRACT_TAB,
    ...applicationTabs.slice(4),
  ]
}

