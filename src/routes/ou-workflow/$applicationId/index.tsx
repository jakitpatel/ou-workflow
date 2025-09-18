import { createFileRoute } from '@tanstack/react-router';
import { useApplicationDetail } from './../../../components/ou-workflow/hooks/useApplicationDetail';
import { ApplicationManagementInterface } from './../../../components/ou-workflow/ApplicationManagement'

export const Route = createFileRoute('/ou-workflow/$applicationId/')({
  component: ApplicationDetailPage,
})

function ApplicationDetailPage() {
  //const data = Route.useLoaderData();
  const { applicationId } = Route.useParams();
  const { data, isLoading, error } = useApplicationDetail(applicationId);

  if (isLoading) return <div className="p-8">Loading application...</div>;
  if (error) return <div className="p-8 text-red-600">Failed to load application: {(error as Error).message}</div>;
  if (!data) return <div className="p-8">Application not found</div>;

  return <ApplicationManagementInterface application={data} />;
}