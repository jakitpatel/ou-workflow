export { fetchWithAuth, registerUserContext } from '@/shared/api/httpClient'

export {
  fetchApplicants,
  fetchApplicationDetail,
  fetchCompanyDetails,
  generateInspectionInvoice,
  fetchScheduleAIngredients,
  fetchUserByRole,
  getCompanyDetailsFromKASH,
  getPlantDetailsFromKASH,
  sendMsgTask,
  uploadApplicationFile,
} from '@/features/applications/api'

export {
  assignTask,
  confirmTask,
  createTaskNote,
  fetchApplicationTasks,
  fetchTaskRoles,
} from '@/features/tasks/api'

export { fetchProfileLayout, fetchRoles, saveProfileLayout } from '@/features/profile/api'

export {
  buildCompanyPayloadFromApplication,
  buildPlantPayloadFromApplication,
  createCompanyAddressFromApplication,
  createOrUpdateCompanyFromApplication,
  createOrUpdatePlantFromApplication,
  createPlantAddressFromApplication,
  createSubmissionApplication,
  deleteSubmissionApplication,
  extractCreatedRecordId,
  fetchPrelimApplicationDetails,
  fetchPrelimApplications,
} from '@/features/prelim/api'
