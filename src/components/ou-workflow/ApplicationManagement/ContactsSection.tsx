import type { ApplicationDetail } from "./../../../types/application";

export default function ContactsSection({ application, editMode }: { application: ApplicationDetail, editMode: boolean }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">Contact Information</h2>
      <div className="space-y-6">
        {application.contacts.map((contact, index) => (
          <div key={index} className={`border rounded-lg p-4 ${contact.designated ? 'border-purple-200 bg-purple-50' : ''}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900">{contact.type}</h3>
              {contact.designated && (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                  ⭐ Primary for Initial Contact
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={contact.name}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={contact.phone}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={contact.email}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                />
              </div>
              {contact.title && (
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={contact.title}
                    readOnly={!editMode}
                    className={`w-full px-3 py-2 border rounded-lg ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-medium text-green-800 mb-2">Contact Roles & Responsibilities</h3>
        <div className="text-sm text-green-700">
          <p><strong>Primary Contact (John Mitchell):</strong> Designated for all initial communications, quote discussions, and contract negotiations.</p>
          <p className="mt-1"><strong>Quality Assurance (Gary Magder):</strong> Technical contact for ingredient specifications, manufacturing processes, and compliance questions.</p>
        </div>
      </div>
    </div>
  );
}
