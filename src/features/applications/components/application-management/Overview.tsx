import type { ApplicationDetail } from "@/types/application";

const formatCreatedDate = (value?: string) => {
  const datePart = value?.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)?.slice(1);
  if (!datePart) return '-';

  const [year, month, day] = datePart.map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatAssignedNcrc = (value: unknown) => {
  if (typeof value === 'string') return value.trim() || '-';
  if (!value || typeof value !== 'object') return '-';

  const coordinator = value as Record<string, unknown>;
  const name = [
    coordinator.PREFIX ?? coordinator.prefix,
    coordinator.First ?? coordinator.first,
    coordinator.Middle ?? coordinator.middle,
    coordinator.LAST ?? coordinator.last,
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');

  return name || String(coordinator.id ?? '').trim() || '-';
};

function MatchMarker({ isNew }: { isNew?: boolean }) {
  if (isNew == null) return null;

  const marker = isNew ? 'C' : 'M';
  const title = isNew ? 'Created' : 'Matched';

  return (
    <span
      className={`mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold ${
        isNew
          ? 'border-blue-200 bg-blue-100 text-blue-700'
          : 'border-green-200 bg-green-100 text-green-700'
      }`}
      title={title}
    >
      {marker}
    </span>
  );
}

export default function Overview({
  application,
  dataSource = 'application',
}: {
  application: ApplicationDetail,
  dataSource?: 'application' | 'prelim'
}) {
  const company = application?.company?.[0];
  const plant = application?.plants?.[0];
  const isPrelimApplicationDetail = dataSource === 'prelim';
  const validationErrorDesc = isPrelimApplicationDetail ? application.validationErrorDesc ?? '' : '';
  const intakeData = isPrelimApplicationDetail ? application.globalData : undefined;
  const intakePlant = intakeData?.plants?.[0];
  const companyId = isPrelimApplicationDetail
    ? intakeData?.company_id ?? application.kashrusCompanyId ?? '-'
    : company?.companyId ?? '-';
  const companyStatus = company?.status ?? '-';
  const plantId = isPrelimApplicationDetail
    ? intakePlant?.plant_id ?? intakeData?.plant_id ?? '-'
    : application.PlantID ?? application.PlantId ?? plant?.plantID ?? plant?.plantId ?? '-';
  const applicationOwnsId = application.OwnsID ?? application.ownsid ?? '-';
  const applicationOwnsStatus = application.OwnsStatus ?? '-';
  const ownsId = intakePlant?.owns_id ?? intakeData?.owns_id ?? '-';
  const ownsStatus = intakePlant?.owns_status ?? intakeData?.owns_status ?? '-';
  const daysInProcess = Number(application.daysInProcess ?? 0);
  const daysOverdue = Number(application.daysOverdue ?? 0);

  // Calculate statistics
  const stats = {
    plantCount: application.preferences?.plantCount || 0,
    productCount: application.products?.length || 0,
    ingredientCount: application.ingredients?.length || 0,
    uploadedFiles: application.files?.length || 0
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Application Overview</h2>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Created Date</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">
            {formatCreatedDate(application.createdDate)}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Days in Process</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">{daysInProcess}</div>
        </div>
        <div
          className={`rounded-lg border px-4 py-3 ${
            daysOverdue > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div
            className={`text-xs font-semibold uppercase tracking-wide ${
              daysOverdue > 0 ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            Days Overdue
          </div>
          <div
            className={`mt-1 text-sm font-semibold ${
              daysOverdue > 0 ? 'text-red-700' : 'text-gray-900'
            }`}
          >
            {daysOverdue}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Status Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-6 bg-blue-600 rounded"></span>
            <h3 className="font-semibold text-gray-900 text-lg">Application Status</h3>
          </div>

          <div className="space-y-3">
            {isPrelimApplicationDetail ? (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">Application Status</span>
                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-semibold">
                  {application.kashrusStatus}
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">
                <MatchMarker isNew={intakeData?.is_new_company} />
                Company ID
              </span>
              <span className="text-sm font-semibold text-green-700">
                {companyId}
              </span>
            </div>

            {!isPrelimApplicationDetail ? (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">CompanyStatus</span>
                <span className="text-sm font-semibold text-green-700">
                  {companyStatus}
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">
                <MatchMarker isNew={intakePlant?.is_new_plant ?? intakeData?.is_new_plant} />
                Plant ID
              </span>
              <span className="text-sm font-semibold text-green-700">
                {plantId}
              </span>
            </div>

            {!isPrelimApplicationDetail ? (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">Owns ID</span>
                <span className="text-sm font-semibold text-green-700">
                {applicationOwnsId}
              </span>
            </div>
          ) : null}

            {!isPrelimApplicationDetail ? (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">OwnsStatus</span>
                <span className="text-sm font-semibold text-green-700">
                  {applicationOwnsStatus}
                </span>
              </div>
            ) : null}

            {isPrelimApplicationDetail ? (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">
                  <MatchMarker isNew={intakePlant?.is_new_owns ?? intakeData?.is_new_owns} />
                  Owns ID
                </span>
                <span className="text-sm font-semibold text-green-700">
                  {ownsId}
                </span>
              </div>
            ) : null}

            {isPrelimApplicationDetail ? (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">Owns Status</span>
                <span className="text-sm font-semibold text-green-700">
                  {ownsStatus}
                </span>
              </div>
            ) : null}

            {isPrelimApplicationDetail ? (
              <>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Primary Contact</span>
                  <span className="text-sm font-semibold text-purple-700">
                    {application.primaryContact}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Currently OU Certified</span>
                  <span className={`text-sm font-semibold ${
                    company?.currentlyCertified === 'Yes' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {company?.currentlyCertified || 'No'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-600">Previously Certified</span>
                  <span className={`text-sm font-semibold ${
                    company?.everCertified === 'Yes' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {company?.everCertified || 'No'}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Quick Stats Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-6 bg-purple-600 rounded"></span>
            <h3 className="font-semibold text-gray-900 text-lg">Quick Stats</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Plants</span>
              <span className="text-lg font-bold text-gray-900">{stats.plantCount}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Total Products</span>
              <span className="text-lg font-bold text-gray-900">{stats.productCount}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Total Ingredients</span>
              <span className="text-lg font-bold text-gray-900">{stats.ingredientCount}</span>
            </div>

            {!isPrelimApplicationDetail ? (
              <>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Assigned NCRC</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatAssignedNcrc(application.assignedNCRC)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Assigned RC</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {application.assignedRC || '-'}
                  </span>
                </div>
              </>
            ) : null}

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Uploaded Files</span>
              <span className="text-lg font-bold text-gray-900">{stats.uploadedFiles}</span>
            </div>

            {isPrelimApplicationDetail ? (
              <div className="py-2">
                <label
                  htmlFor="intake-validation-error-desc"
                  className="mb-2 block text-sm font-medium text-gray-600"
                >
                  ValidationErrorDesc
                </label>
                <textarea
                  id="intake-validation-error-desc"
                  className="min-h-[4.75rem] w-full resize-y rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium leading-5 text-gray-900"
                  readOnly
                  rows={3}
                  value={validationErrorDesc}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>


    </div>
  );
}
