export function NotificationsTab() {
  return (
    <div className="p-6 text-gray-700">
      <h3 className="text-xl font-semibold mb-4">Notifications</h3>
      <ul className="space-y-3">
        <li className="p-3 bg-yellow-50 border-l-4 border-yellow-400 shadow rounded">
          ⚠️ New applicant registered: <span className="font-medium">Sunrise Dairy</span>
        </li>
        <li className="p-3 bg-green-50 border-l-4 border-green-400 shadow rounded">
          ✅ Certification approved for <span className="font-medium">Global Foods Inc.</span>
        </li>
        <li className="p-3 bg-blue-50 border-l-4 border-blue-400 shadow rounded">
          📩 Message from auditor regarding <span className="font-medium">Fresh Farms Co.</span>
        </li>
      </ul>
    </div>
  )
}
