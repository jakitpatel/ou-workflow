import React, { useState } from "react";
import type { ApplicationDetail } from "./../../../types/application";
import Header from "./Header";
import SidebarTabs from "./SidebarTabs";
import Overview from "./Overview";
import CompanySection from "./CompanySection";
import ContactsSection from "./ContactsSection";
import PlantsSection from "./PlantsSection";
import ProductsTable from "./ProductsTable";
import FilesList from "./FilesList";
import ActivityLog from "./ActivityLog";

type Props = {
  application: ApplicationDetail;
};

export function ApplicationManagementInterface({ application }: Props) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header application={application} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex">
        {/* Sidebar */}
        <aside className="w-64 mr-8">
          <SidebarTabs active={activeTab} onChange={setActiveTab} />
        </aside>

        {/* Main content */}
        <main className="flex-1">
          {activeTab === "overview" && <Overview application={application} />}
          {activeTab === "company" && (
            <CompanySection company={application.company} />
          )}
          {activeTab === "contacts" && (
            <ContactsSection contacts={application.contacts} />
          )}
          {activeTab === "plants" && <PlantsSection plants={application.plants} />}
          {activeTab === "products" && (
            <ProductsTable products={application.products} />
          )}
          {activeTab === "files" && (
            <FilesList files={application.uploadedFiles || []} />
          )}
          {activeTab === "activity" && (
            <ActivityLog messages={application.messages || []} />
          )}
        </main>
      </div>
    </div>
  );
}
