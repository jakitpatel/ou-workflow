import React from "react";

type Props = {
  active: string;
  onChange: (tab: string) => void;
};

export default function SidebarTabs({ active, onChange }: Props) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "company", label: "Company" },
    { id: "contacts", label: "Contacts" },
    { id: "plants", label: "Plants" },
    { id: "products", label: "Products" },
    { id: "files", label: "Files" },
    { id: "activity", label: "Activity Log" },
  ];

  return (
    <nav className="space-y-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`block w-full text-left px-4 py-2 rounded-md text-sm font-medium ${
            active === t.id
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
