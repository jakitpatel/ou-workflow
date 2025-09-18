import React from "react";
import type { Contact } from "./../../../types/application";

export default function ContactsSection({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Contacts</h2>
      <ul className="space-y-3">
        {contacts.map((c, idx) => (
          <li key={idx} className="border rounded-lg p-4">
            <p className="font-medium">{c.name}</p>
            <p className="text-sm text-gray-600">{c.email}</p>
            <p className="text-sm text-gray-600">{c.phone}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
