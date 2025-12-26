import type { ApplicationDetail } from "@/types/application";

export default function ContactsSection({
  application,
  editMode,
}: {
  application: ApplicationDetail;
  editMode: boolean;
}) {
  const contacts = application.companyContacts || [];
  const primaryContact = contacts.find(c => c.type === "Primary Contact");
  const otherContacts = contacts.filter(c => c.type !== "Primary Contact");

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Contact Information</h2>
        <span className="text-sm text-gray-500 font-medium">
          {contacts.length} {contacts.length === 1 ? 'Contact' : 'Contacts'}
        </span>
      </div>

      <div className="space-y-4">
        {/* Primary Contact - Always show first if exists */}
        {primaryContact && (
          <div className="border-2 border-purple-300 rounded-lg p-5 bg-gradient-to-br from-purple-50 to-purple-100/50">
            {/* Header Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-full text-xs font-semibold shadow-sm">
                ⭐ Primary Contact
              </span>
            </div>

            {/* Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={primaryContact.name}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                    editMode
                      ? "border-purple-300 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      : "border-purple-200 bg-white text-gray-900"
                  }`}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Phone
                </label>
                <input
                  type="text"
                  value={primaryContact.phone}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                    editMode
                      ? "border-purple-300 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      : "border-purple-200 bg-white text-gray-900"
                  }`}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={primaryContact.email}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                    editMode
                      ? "border-purple-300 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      : "border-purple-200 bg-white text-gray-900"
                  }`}
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Role
                </label>
                <input
                  type="text"
                  value={primaryContact.role ?? ""}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
                    editMode
                      ? "border-purple-300 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      : "border-purple-200 bg-white text-gray-900"
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Other Contacts */}
        {otherContacts.map((contact, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-5 bg-white hover:border-gray-300 transition-colors"
          >


            {/* Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={contact.name}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors ${
                    editMode
                      ? "border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      : "border-gray-200 bg-gray-50 text-gray-900"
                  }`}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Phone
                </label>
                <input
                  type="text"
                  value={contact.phone}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors ${
                    editMode
                      ? "border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      : "border-gray-200 bg-gray-50 text-gray-900"
                  }`}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={contact.email}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors ${
                    editMode
                      ? "border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      : "border-gray-200 bg-gray-50 text-gray-900"
                  }`}
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Role
                </label>
                <input
                  type="text"
                  value={contact.role ?? ""}
                  readOnly={!editMode}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors ${
                    editMode
                      ? "border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      : "border-gray-200 bg-gray-50 text-gray-900"
                  }`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Information Box */}
      <div className="mt-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            i
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 mb-2">
              Contact Roles & Responsibilities
            </h3>
            <div className="text-sm text-green-800 space-y-1.5">
              <p>
                <strong className="font-semibold">Primary Contact:</strong> Designated for initial
                communications, quote discussions, and contract negotiations.
              </p>
              <p>
                <strong className="font-semibold">Quality Assurance:</strong> Technical contact for ingredient
                specifications and compliance questions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}