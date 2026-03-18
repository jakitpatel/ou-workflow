import type {
  ApplicantsResponse,
  ApplicationTasksResponse,
  ApplicationTask,
  ApplicationDetailResponse,
  UserRoleResponse,
  KashrusCompanyDetailsResponse,
  KashrusPlantDetailsResponse,
} from "./types/application";
import { getAccessToken } from "@/auth/authService";
import {
  executeRequest,
  fetchWithAuth,
  parseErrorBody,
  resolveApiBaseUrl,
} from "@/shared/api/httpClient";
import { createAppError } from "@/shared/api/errors";
export { fetchWithAuth, registerUserContext } from "@/shared/api/httpClient";

// ============================================================================
// Types & Interfaces
// ============================================================================
const createApiError = (
  message: string,
  status?: number,
  details?: unknown,
) => createAppError(message, { status, details, code: 'API_ERROR' })

// ============================================================================
// Query Parameter Builders
// ============================================================================

/**
 * Builds pagination parameters
 */
function buildPaginationParams(page: number, limit: number): URLSearchParams {
  const params = new URLSearchParams();
  params.append("page[limit]", String(limit));
  params.append("page[offset]", String(page));
  return params;
}
/**
 * Builds sorting parameters
 * Example: sort=username or sort=-username
 */
function buildSortParams(sortBy?: string): URLSearchParams {
  const params = new URLSearchParams();

  if (sortBy) {
    params.append("sort", sortBy);
  }

  return params;
}

function mergeParams(...paramSets: URLSearchParams[]): URLSearchParams {
  const merged = new URLSearchParams();

  paramSets.forEach((params) => {
    params.forEach((value, key) => {
      merged.append(key, value);
    });
  });

  return merged;
}

/**
 * Adds filter parameters if they have valid values
 */
function addFilterParams(
  params: URLSearchParams,
  filters: Record<string, string | undefined>
): void {
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value.trim() !== "" && value !== "all") {
      params.append(key, value.trim());
    }
  });
}

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * Fetches paginated applicants list with optional filters
 */
export async function fetchApplicants({
  page = 0,
  limit = 20,
  token,
  searchTerm,
  statusFilter,
  priorityFilter,
  applicationId,
  myOnly,
  role,
}: {
  page?: number;
  limit?: number;
  token?: string | null;
  searchTerm?: string;
  statusFilter?: string;
  priorityFilter?: string;
  applicationId?: number;
  myOnly?: string | boolean;
  role?: string | null;
} = {}): Promise<ApplicantsResponse> {
  const params = buildPaginationParams(page, limit);

  addFilterParams(params, {
    "filter[name]": searchTerm,
    "filter[status]": statusFilter,
    "filter[priority]": priorityFilter,
  });

  if (applicationId !== undefined) {
    params.append("filter[applicationId]", String(applicationId));
  }

  if (myOnly !== false) {
    params.append("filter[OnlyMyRoles]", "true");
    if(typeof role === "string" && role.toLocaleLowerCase()!== "all"){
      params.append("filter[role]", String(role));
    }
  }

  const response = await fetchWithAuth<ApplicantsResponse>({
    path: `/get_applications_v1?${params.toString()}`,
    token,
  });

  // Normalize stage keys to lowercase
  const normalizedData = response.data.map((applicant: any) => ({
    ...applicant,
    stages: Object.fromEntries(
      Object.entries(applicant.stages).map(([key, value]) => [
        key.toLowerCase(),
        value,
      ])
    ),
  }));

  return {
    data: normalizedData,
    meta: response.meta || { total_count: normalizedData.length },
  } as any;
}

/**
 * Exchanges Cognito token for application roles
 */
export async function fetchRoles({
  token,
}: {
  token?: string | null;
} = {}): Promise<any[]> {
  const accessToken = token ?? getAccessToken();

  if (!accessToken) {
    throw createApiError("Access token missing. Please login again.", 401);
  }

  return await fetchWithAuth({
    path: `/auth/exchange-cognito-token`,
    method: "POST",
    body: { token: accessToken },
    token,
  });
}

/**
 * Fetches users by role type (NCRC, RFR, etc.)
 */
function normalizeLookupText(value: unknown): string {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchUserByRole({
  token,
  endpoint = "api/vSelectNCRC",
}: {
  token?: string | null;
  endpoint?: string;
} = {}): Promise<
  Array<{
    name: string;
    id: string;
    lookupKey: string;
    assigneeValue: string;
    personId?: string;
    email?: string;
    userName?: string;
    fullName?: string;
    userRole?: string;
    isActive?: boolean;
    rfr?: string;
    pct_of_total_apps?: number;
    pct_of_total_apps_at_work?: number;
  }>
> {
  const paginationParams = buildPaginationParams(0, 10000);
  const sortParams = buildSortParams("fullName");
  const params = mergeParams(paginationParams, sortParams);

  const response = await fetchWithAuth<UserRoleResponse>({
    path: `/${endpoint}?${params.toString()}`,
    token,
  });

  return response.data.map((item: any) => {
    const attributes = item.attributes ?? {};
    const fullName = normalizeLookupText(
      attributes.fullName ?? attributes.FullName ?? attributes.RFR ?? item.id
    );
    const userName = normalizeLookupText(attributes.userName);
    const personId = normalizeLookupText(attributes.PERSON_ID ?? item.id);
    const email = normalizeLookupText(attributes.Email ?? attributes.BusinessEmail);
    const assigneeValue = userName || personId;
    const lookupKey =
      personId ||
      assigneeValue ||
      normalizeLookupText(item.links?.self) ||
      normalizeLookupText(item.id);

    return {
      name: fullName,
      id: assigneeValue,
      lookupKey,
      assigneeValue,
      personId,
      email,
      userName,
      fullName,
      userRole: attributes.UserRole,
      isActive: attributes.IsActive,
      rfr: normalizeLookupText(attributes.RFR) || fullName,
      pct_of_total_apps: attributes.pct_of_total_apps,
      pct_of_total_apps_at_work: attributes.pct_of_total_apps_at_work,
    };
  });
}

/**
 * Assigns a task to a user
 */
export async function assignTask({
  appId,
  taskId,
  role,
  assignee,
  token,
  capacity,
}: {
  appId?: number | null;
  taskId: string;
  role: string;
  assignee: string;
  token?: string | null;
  capacity?: string;
}): Promise<any> {
  return await fetchWithAuth({
    path: `/assignRole`,
    method: "POST",
    body: { appId, taskId, role, assignee, capacity },
    token,
  });
}

/**
 * Confirms/completes a task with result and status
 */
export async function confirmTask({
  taskId,
  result,
  completionNotes,
  token,
  username,
  status,
  capacity
}: {
  taskId: string;
  result?: string;
  completionNotes?: string;
  token?: string | null;
  username?: string;
  status?: string;
  capacity?: string;
}): Promise<any> {
  // Determine completion notes based on result
  const completionNotesMap: Record<string, string> = {
    completed: "Task completed successfully",
    in_progress: "Task IN PROGRESS successfully",
    pending: "Task PENDING successfully",
  };

  const completion_notes =
    completionNotes ??
    ((result && completionNotesMap[result]) || "Task completed successfully");

  // Build request body dynamically
  const body: Record<string, any> = {
    task_instance_id: taskId,
    completed_by: username,
    completion_notes,
    capacity: capacity,
  };

  if (result) {
    const normalizedResult = result.toLowerCase();
    const standardizedResultValues = new Set([
      'yes',
      'no',
      'completed',
      'in_progress',
      'pending',
    ]);
    body.result = standardizedResultValues.has(normalizedResult)
      ? normalizedResult.toUpperCase()
      : result;
  }

  if (status) {
    body.status = status;
  }

  return await fetchWithAuth({
    path: `/complete_task`,
    method: "POST",
    body,
    token,
  });
}

/**
 * Uploads files for an application using multipart/form-data
 */
export async function uploadApplicationFile({
  file,
  fileUrl,
  fileName,
  applicationId,
  taskInstanceID,
  description,
  token,
}: {
  file?: File;
  fileUrl?: string;
  fileName?: string;
  applicationId?: string | number | null;
  taskInstanceID?: string | number | null;
  description?: string;
  token?: string | null;
}): Promise<any> {
  const baseUrl = resolveApiBaseUrl();
  const uploadBaseUrl = baseUrl.replace("/api", "");
  const url = `${uploadBaseUrl}/upload_files`;
  const accessToken = token ?? getAccessToken();

  const formData = new FormData();

  if (file) {
    formData.append("file", file, file.name);
  } else if (fileUrl?.trim()) {
    formData.append("file_url", fileUrl.trim());
    const urlFileName = fileName ?? fileUrl.trim().split("/").pop() ?? "linked_file";
    formData.append("file_name", urlFileName);
  } else {
    throw createApiError("Please select a file or provide a URL.", 400);
  }

  if (applicationId !== "" && applicationId !== null && applicationId !== undefined) {
    formData.append("application_id", String(applicationId));
  }

  if (taskInstanceID !== "" && taskInstanceID !== null && taskInstanceID !== undefined) {
    formData.append("task_instance_id", String(taskInstanceID));
  }

  if (description?.trim()) {
    formData.append("description", description.trim());
  }

  const requestHeaders: Record<string, string> = {};
  if (accessToken) {
    requestHeaders["Authorization"] = `Bearer ${accessToken}`;
  }

  const requestOptions: RequestInit = {
    method: "POST",
    headers: requestHeaders,
    body: formData,
  };

  const response = await executeRequest(url, requestOptions, accessToken);

  if (!response.ok) {
    const errorBody = await parseErrorBody(response);
    const parsedError = errorBody as { message?: string; error?: string } | null;
    const message =
      parsedError?.message ||
      parsedError?.error ||
      `Request failed: ${response.status} ${response.statusText}`;
    throw createApiError(message, response.status, errorBody);
  }

  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

/**
 * Sends a message related to an application
 */
export async function sendMsgTask({
  newMessage,
  token,
}: {
  newMessage: any;
  token?: string | null;
}): Promise<any> {
  return await fetchWithAuth({
    path: `/api/WFApplicationMessage`,
    method: "POST",
    body: newMessage,
    token,
  });
}

/**
 * Fetches detailed information for a specific application
 */
export async function fetchApplicationDetail({
  applicationId,
  token,
}: {
  applicationId?: string;
  token?: string | null;
} = {}): Promise<any> {
  if (!applicationId) {
    throw createApiError("applicationId is required", 400);
  }

  const response = await fetchWithAuth<ApplicationDetailResponse>({
    path: `/get_application_detail_v2?applicationId=${applicationId}`,
    token,
  });

  return response.appplicationinfo;
}

/**
 * Fetches tasks associated with an application
 */
export async function fetchApplicationTasks({
  token,
  applicationId,
  searchTerm,
  days
}: {
  token?: string | null;
  applicationId?: string;
  searchTerm?: string;
  days?: string | number | undefined;
} = {}): Promise<ApplicationTask[]> {
  const params = new URLSearchParams();

  if (applicationId) {
    params.append("filter[applicationId]", applicationId);
  }

  if (searchTerm) {
    params.append("filter[plantName]", searchTerm);
  }
  if (days) params.append('days', String(days));

  const queryString = params.toString();
  const path = `/get_application_tasks${queryString ? `?${queryString}` : ""}`;

  const response = await fetchWithAuth<ApplicationTasksResponse>({
    path,
    token,
  });

  return response.data;
}

export async function fetchTaskRoles({
  token,
}: {
  token?: string | null;
} = {}): Promise<Array<string>> {
  const params = buildPaginationParams(0, 10000);

  const response = await fetchWithAuth<UserRoleResponse>({
    path: `/api/TaskRole?${params.toString()}`,
    token,
  });

  return response.data
  .filter((item: any) => item.attributes?.groupAssignment)
  .map((item: any) =>
    String(item.attributes.RoleCode).toLowerCase()
  );
}

/**
 * Profile(Page,Stage) layout save
 */
export async function saveProfileLayout({
  token,
  username,
  profileLayout,
}: {
  token?: string | null;
  username?: string;
  profileLayout?: string; // 👈 expect STRING
}): Promise<any> {

  const body = {
    data: {
      type: 'WFUserProfile',
      attributes: {
        Username: username,
        Profile: profileLayout, // ✅ JSON string
        CreatedDate: new Date().toISOString(),
      },
    },
  };

  return fetchWithAuth({
    path: '/api/WFUserProfile',
    method: 'POST',
    body,
    token,
  });
}

/**
 * Profile(Page,Stage) layout save
 */
export async function fetchProfileLayout({
  token,
  username
}: {
  token?: string | null;
  username?: string;
}): Promise<any> {

  const params = new URLSearchParams();
  if (username) {
    params.append("filter[Username]", username);
  }

  const queryString = params.toString();
  const path = `/api/WFUserProfile${queryString ? `?${queryString}` : ""}`;

  const response = await fetchWithAuth<ApplicationTasksResponse>({
    path,
    token,
  });

  return response.data;
}

// ============================================================================
export async function fetchPrelimApplications({
  page = 0,
  limit = 20,
  token,
  searchTerm,
  statusFilter
}: {
  page?: number;
  limit?: number;
  token?: string | null;
  searchTerm?: string;
  statusFilter?: string;
} = {}): Promise<ApplicantsResponse> {
  console.log('✅ CORRECT fetchPrelimApplications');

  const params = buildPaginationParams(page, limit);

  addFilterParams(params, {
    "filter[name]": searchTerm,
    "filter[status]": statusFilter
  });

  const res = await fetchWithAuth<ApplicantsResponse>({
    path: `/get_applications_v1?application_type=SUBMISSION&${params.toString()}`,
    token,
  });
  //console.log('Full response:', res);
  //console.log('Response data:', res.data);
  return res;
}

// Fetches detailed information for a specific preliminary application
export async function fetchPrelimApplicationDetails(
  preliminaryApplicationId: number,
  token?: string | null
) {
  const params = new URLSearchParams();
  params.append("externalReferenceId", String(preliminaryApplicationId));
  const res =  await fetchWithAuth<ApplicantsResponse>({
    path: `/get_prelim_application_details?${params.toString()}`,
    token,
  });
  return res.data;
}

// api/vectorSearch.ts
export async function fetchVectorMatches(payload: any,
  token?: string | null
) {
  /*
  const baseUrl = "/dashboard";
  let prelimurl = baseUrl + '/data/matchList.json';
  // Convert payload to query string
  const params = new URLSearchParams({
    source: JSON.stringify(payload.source) // or however you want to encode it
  });
  
  const res = await fetch(`${prelimurl}?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    // No body for GET requests
  })
  if (!res.ok) {
    throw new Error('Vector search failed')
  }

  return res.json()
  */
  return await fetchWithAuth({
    path: `/matchList`,
    method: "POST",
    body: {data: JSON.stringify(payload)},
    token,
  });  
}

// api/company.ts
export async function fetchCompanyDetails(companyId: number, token?: string | null) {
  /*
  const baseUrl = "/dashboard";
  let prelimurl = baseUrl + '/data/getCompanyDetails.json';
  prelimurl = prelimurl + `?companyId=${companyId}`;
  const res = await fetch(prelimurl)

  if (!res.ok) {
    throw new Error('Failed to fetch company details')
  }

  return res.json()
  */
  const params = new URLSearchParams();
  params.append("companyId", String(companyId));
  return await fetchWithAuth<ApplicantsResponse>({
    path: `/getCompanyDetails?${params.toString()}`,
    token,
  });
}

export async function getCompanyDetailsFromKASH({
  companyID,
  token,
}: {
  companyID: string | number;
  token?: string | null;
}): Promise<KashrusCompanyDetailsResponse> {
  const params = new URLSearchParams();
  params.append("companyID", String(companyID));

  return await fetchWithAuth<KashrusCompanyDetailsResponse>({
    path: `/get_CompanyDetailsFromKASH?${params.toString()}`,
    token,
  });
}

export async function getPlantDetailsFromKASH({
  PlantId,
  token,
}: {
  PlantId: string | number;
  token?: string | null;
}): Promise<KashrusPlantDetailsResponse> {
  const params = new URLSearchParams();
  params.append("PlantId", String(PlantId));

  return await fetchWithAuth<KashrusPlantDetailsResponse>({
    path: `/get_PlantDetailsFromKASH?${params.toString()}`,
    token,
  });
}

type AppCompanyValue = {
  companyName?: string;
  whichCategory?: string;
  companyAddress?: string;
  companyAddress2?: string;
  companyCity?: string;
  companyState?: string;
  ZipPostalCode?: string;
  companyCountry?: string;
  billingContact?: {
    name?: string;
  };
};

type AppPlantValue = {
  plantName?: string;
  processDescription?: string;
  plantAddress?: string;
  plantCity?: string;
  plantState?: string;
  plantZip?: string;
  plantCountry?: string;
};

type CompanyApiAttributes = {
  COMPANY_ID?: number;
  NAME: string;
  CATEGORY: string;
  ACTIVE: number;
  STATUS: string;
};

type PlantApiAttributes = {
  PLANT_ID: number;
  NAME: string;
  ACTIVE: number;
};

export function buildCompanyPayloadFromApplication(
  appValue: AppCompanyValue,
  companyId: number | null = 0
): {
  data: { attributes: CompanyApiAttributes; type: "COMPANYTB" };
} {
  const includeCompanyId =
    typeof companyId === "number" && Number.isFinite(companyId) && companyId > 0;

  return {
    data: {
      attributes: {
        ...(includeCompanyId ? { COMPANY_ID: companyId } : {}),
        NAME: appValue.companyName ?? "",
        CATEGORY: appValue.whichCategory ?? "",
        ACTIVE: 1,
        STATUS: "",
        /* will add later when we have more fields in the app form
        LIST: appValue.whichCategory ?? "",
        GP_NOTIFY: 0,
        PRODUCER: false,
        MARKETER: false,
        SOURCE: false,
        IN_HOUSE: "",
        PRIVATE_LABEL: "",
        COPACKER: "",
        JEWISH_OWNED: "",
        CORPORATE: "",
        COMPANY_TYPE: "",
        INVOICE_TYPE: "",
        INVOICE_FREQUENCY: "",
        INVOICE_DTL: "",
        TIMESTAMP: new Date().toISOString(),
        RC: "",
        PARENT_CO: "",
        INVOICE_LAST_DATE: ZERO_SQL_DATE,
        COMPANY_BILL_TO_NAME: appValue.billingContact?.name ?? "",
        AcquiredFrom: "",
        UID: "",
        MoveToGP: "",
        DefaultPO: "",
        POexpiry: ZERO_SQL_DATE,
        PrivateLabelPO: "",
        PrivateLabelPOexpiry: ZERO_SQL_DATE,
        VisitPO: "",
        VisitPOexpiry: ZERO_SQL_DATE,
        ValidFromTime: ZERO_SQL_DATE,
        ValidToTime: ZERO_SQL_DATE,
        CHANGESET_ID: 0,
        OLDCOMPANYTYPE: "",
        BoilerplateInvoiceComment: "",
        IsPoRequired: false,
        ShouldPropagateCompanyPo: false,
        ShouldPropagateKscPoToPlants: false,
        ShouldPropagateVisitPoToPlants: false,
        PoReason: "",
        On3rdPartyBilling: false,
        IsTest: false,
        ChometzEmailSentDate: ZERO_SQL_DATE,
        */
      },
      type: "COMPANYTB"
    },
  };
}

export function buildPlantPayloadFromApplication(
  appValue: AppPlantValue,
  plantId: number | null = 0
): {
  data: { attributes: PlantApiAttributes; type: "PLANTTB" };
} {
  const includePlantId =
    typeof plantId === "number" && Number.isFinite(plantId) && plantId > 0;

  return {
    data: {
      attributes: {
        ...(includePlantId ? { PLANT_ID: plantId } : {PLANT_ID: 0}),
        NAME: appValue.plantName ?? "",
        ACTIVE: 1,
        /* will add later when we have more fields in the app form
        GP_NOTIFY: false,
        MULTILINES: appValue.processDescription ?? "",
        PASSOVER: "",
        SPECIAL_PROD: "",
        JEWISH_OWNED: "",
        PLANT_TYPE: "",
        PLANT_DIRECTIONS: "",
        USDA_CODE: "",
        PlantUID: "",
        DoNotAttach: "",
        OtherCertification: "",
        PrimaryCompany: 0,
        DesignatedRFR: 0,
        ValidFromTime: ZERO_SQL_DATE,
        ValidToTime: ZERO_SQL_DATE,
        CHANGESET_ID: 0,
        MaxOnSiteVisits: 0,
        MaxVirtualVisits: 0,
        IsDaily: false,
        */
      },
      type: "PLANTTB"
    },
  };
}

export async function createOrUpdateCompanyFromApplication({
  appValue,
  companyId = 0,
  token,
}: {
  appValue: AppCompanyValue;
  companyId?: number | null;
  token?: string | null;
}): Promise<any> {
  const body = buildCompanyPayloadFromApplication(appValue, companyId);
  return await fetchWithAuth({
    path: "/api/COMPANYTB",
    method: "POST",
    body,
    token,
  });
}

export async function createOrUpdatePlantFromApplication({
  appValue,
  plantId = 0,
  token,
}: {
  appValue: AppPlantValue;
  plantId?: number | null;
  token?: string | null;
}): Promise<any> {
  const body = buildPlantPayloadFromApplication(appValue, plantId);
  return await fetchWithAuth({
    path: "/api/PLANTTB",
    method: "POST",
    body,
    token,
  });
}

function toPositiveInteger(value: string | number | null | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

function buildCompanyAddressPayloadFromApplication(
  appValue: AppCompanyValue,
  companyId: string | number
): {
  data: {
    attributes: {
      COMPANY_ID: number;
      ADDRESS_SEQ_NUM: number;
      TYPE: string;
      ATTN: string;
      STREET1: string;
      STREET2: string;
      STREET3: string;
      CITY: string;
      STATE: string;
      ZIP: string;
      COUNTRY: string;
      //TIMESTAMP: string;
      ACTIVE: number;
      S_CheckSum: string;
    };
    type: "COMPANYADDRESSTB";
  };
} {
  const parsedCompanyId = toPositiveInteger(companyId);
  if (parsedCompanyId == null) {
    throw createApiError("Invalid company id for COMPANYADDRESSTB payload");
  }

  return {
    data: {
      attributes: {
        COMPANY_ID: parsedCompanyId,
        ADDRESS_SEQ_NUM: 0,
        TYPE: "",
        ATTN: "",
        STREET1: appValue.companyAddress ?? "",
        STREET2: appValue.companyAddress2 ?? "",
        STREET3: "",
        CITY: appValue.companyCity ?? "",
        STATE: appValue.companyState ?? "",
        ZIP: appValue.ZipPostalCode ?? "",
        COUNTRY: appValue.companyCountry ?? "",
        //TIMESTAMP: "",
        ACTIVE: 1,
        S_CheckSum: "",
      },
      type: "COMPANYADDRESSTB",
    },
  };
}

function buildPlantAddressPayloadFromApplication(
  appValue: AppPlantValue,
  plantId: string | number
): {
  data: {
    attributes: {
      PLANT_ID: number;
      ADDRESS_SEQ_NUM: number;
      TYPE: string;
      ATTN: string;
      STREET1: string;
      STREET2: string;
      STREET3: string;
      CITY: string;
      STATE: string;
      ZIP: string;
      COUNTRY: string;
      //TIMESTAMP: string;
      ACTIVE: number;
      S_CheckSum: string;
    };
    type: "PLANTADDRESSTB";
  };
} {
  const parsedPlantId = toPositiveInteger(plantId);
  if (parsedPlantId == null) {
    throw createApiError("Invalid plant id for PLANTADDRESSTB payload");
  }

  return {
    data: {
      attributes: {
        PLANT_ID: parsedPlantId,
        ADDRESS_SEQ_NUM: 0,
        TYPE: "",
        ATTN: "",
        STREET1: appValue.plantAddress ?? "",
        STREET2: "",
        STREET3: "",
        CITY: appValue.plantCity ?? "",
        STATE: appValue.plantState ?? "",
        ZIP: appValue.plantZip ?? "",
        COUNTRY: appValue.plantCountry ?? "",
        //TIMESTAMP: "",
        ACTIVE: 1,
        S_CheckSum: "",
      },
      type: "PLANTADDRESSTB",
    },
  };
}

export async function createCompanyAddressFromApplication({
  appValue,
  companyId,
  token,
}: {
  appValue: AppCompanyValue;
  companyId: string | number;
  token?: string | null;
}): Promise<any> {
  const body = buildCompanyAddressPayloadFromApplication(appValue, companyId);
  return await fetchWithAuth({
    path: "/api/COMPANYADDRESSTB",
    method: "POST",
    body,
    token,
  });
}

export async function createPlantAddressFromApplication({
  appValue,
  plantId,
  token,
}: {
  appValue: AppPlantValue;
  plantId: string | number;
  token?: string | null;
}): Promise<any> {
  const body = buildPlantAddressPayloadFromApplication(appValue, plantId);
  return await fetchWithAuth({
    path: "/api/PLANTADDRESSTB",
    method: "POST",
    body,
    token,
  });
}

export function extractCreatedRecordId(
  response: any,
  key?: "companyId" | "plantId"
): string | number | null {
  const keyedValue =
    key == null
      ? undefined
      : response?.[key] ??
        response?.data?.[key] ??
        response?.result?.[key] ??
        response?.payload?.[key];

  const jsonApiId = response?.data?.id;
  const fallbackAttributeId =
    response?.data?.attributes?.COMPANY_ID ??
    response?.data?.attributes?.PLANT_ID;

  const candidate = keyedValue ?? jsonApiId ?? fallbackAttributeId;
  return candidate == null || candidate === "" ? null : candidate;
}

export async function createSubmissionApplication({
  applicationId,
  token
}: {
  applicationId: number;
  token?: string | null;
  applicationType?: number;
}): Promise<any> {
  const params = new URLSearchParams();
  params.append("application_id", String(applicationId));

  return await fetchWithAuth({
    path: `/createSubmissionApplication?${params.toString()}`,
    token,
  });
}

export async function deleteSubmissionApplication({
  applicationId,
  token,
  applicationType = 2,
}: {
  applicationId: number;
  token?: string | null;
  applicationType?: number;
}): Promise<any> {
  const params = new URLSearchParams();
  params.append("application_id", String(applicationType));
  params.append("applicationID", String(applicationId));

  return await fetchWithAuth({
    path: `/deleteSubmissionApplication?${params.toString()}`,
    token,
  });
}
