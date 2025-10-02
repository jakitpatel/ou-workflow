export function StageHeader({ applicant, setSelectedApplicant }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold">{applicant.company}</h2>
      <button
        onClick={() => setSelectedApplicant(applicant)}
        className="text-blue-600 hover:underline text-sm"
      >
        View Details
      </button>
    </div>
  );
}
