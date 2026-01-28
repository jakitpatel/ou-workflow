// components/CompanyCard.tsx
type Props = {
  company: any;
  onClick: () => void;
};

export function CompanyCard({ company, onClick }: Props) {
  const primaryAddress =
    company.companyAddresses?.find((a: any) => a.type === 'Physical') ||
    company.companyAddresses?.[0];

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition"
    >
      <h3 className="text-lg font-semibold text-gray-800">
        {company.name}
      </h3>

      {primaryAddress && (
        <p className="mt-2 text-sm text-gray-600">
          {primaryAddress.street}, {primaryAddress.city}, {primaryAddress.state}{' '}
          {primaryAddress.zip}
        </p>
      )}
    </div>
  );
}
