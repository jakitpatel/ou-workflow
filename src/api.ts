import { getApiBaseUrl } from "./lib/utils";
import type {
  ApplicantsResponse,
  ApplicationTasksResponse,
  ApplicationTask,
  ApplicationDetailResponse,
  UserRoleResponse,
  KashrusCompanyDetailsResponse,
  KashrusPlantDetailsResponse,
} from "./types/application";
import {
  getAccessToken,
  refreshAccessToken,
  cognitoLogout,
} from "@/auth/authService";

// ============================================================================
// Types & Interfaces
// ============================================================================

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface FetchOptions {
  path: string;
  method?: HttpMethod;
  body?: any;
  token?: string | null;
  headers?: Record<string, string>;
}

interface ApiError extends Error {
  status?: number;
  details?: any;
}

interface UserContext {
  apiBaseUrl?: string | null;
}

// ============================================================================
// Configuration & Context Management
// ============================================================================

/**
 * Resolves the API base URL from multiple sources with priority:
 * 1. User context (dynamic selection)
 * 2. Global config window object
 * 3. Environment-based utility fallback
 */
function resolveApiBaseUrl(): string {
  try {
    const userContext = (window as any).__USER_CONTEXT__ as UserContext;

    // Priority 1: User-selected URL from context
    if (userContext?.apiBaseUrl) {
      console.debug("[API] Using context URL:", userContext.apiBaseUrl);
      return userContext.apiBaseUrl;
    }

    // Priority 2: Global config
    const config = (window as any).__APP_CONFIG__;
    if (config) {
      const servers = Object.keys(config)
        .filter((key) => key.startsWith("API_CLIENT_URL"))
        .map((key) => config[key]);

      if (servers.length > 0) {
        console.debug("[API] Using config URL:", servers[0]);
        return servers[0];
      }
    }

    // Priority 3: Fallback to utility
    const fallback = getApiBaseUrl();
    console.debug("[API] Using fallback URL:", fallback);
    return fallback;
  } catch (err) {
    console.warn("[API] Error resolving base URL:", err);
    return getApiBaseUrl();
  }
}

/**
 * Registers user context globally for API URL resolution
 * Should be called once from UserProvider
 */
export function registerUserContext(ctx: UserContext): void {
  (window as any).__USER_CONTEXT__ = ctx;
}

// ============================================================================
// Core HTTP Client
// ============================================================================

/**
 * Creates an API error with additional metadata
 */
function createApiError(
  message: string,
  status?: number,
  details?: any
): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.details = details;
  return error;
}

/**
 * Performs HTTP request with automatic token refresh on 401
 */
async function executeRequest(
  url: string,
  options: RequestInit,
  token: string | null | undefined
): Promise<Response> {
  // First attempt
  let response = await fetch(url, options);

  // Handle 401 with token refresh
  if (response.status === 401 && token) {
    try {
      console.debug("[API] Token expired, attempting refresh...");
      const newToken = await refreshAccessToken();

      // Retry with new token
      const newHeaders = new Headers(options.headers);
      newHeaders.set("Authorization", `Bearer ${newToken}`);

      response = await fetch(url, {
        ...options,
        headers: newHeaders,
      });

      console.debug("[API] Token refresh successful");
    } catch (err) {
      console.error("[API] Token refresh failed:", err);
      cognitoLogout();
      throw createApiError("Session expired. Please log in again.", 401);
    }
  }

  return response;
}

/**
 * Parses error response body safely
 */
async function parseErrorBody(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return await response.text().catch(() => null);
  }
}

/**
 * Main fetch wrapper with authentication and error handling
 */
export async function fetchWithAuth<T = any>({
  path,
  method = "GET",
  body,
  token,
  headers = {},
}: FetchOptions): Promise<T> {
  const baseUrl = resolveApiBaseUrl();
  const url = `${baseUrl}${path}`;
  const accessToken = token ?? getAccessToken();

  // Build request headers
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (accessToken) {
    requestHeaders["Authorization"] = `Bearer ${accessToken}`;
  }

  // Build request options
  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  };

  try {
    const response = await executeRequest(url, requestOptions, accessToken);

    // Handle non-OK responses
    if (!response.ok) {
      const errorBody = await parseErrorBody(response);
      const message =
        errorBody?.message ||
        errorBody?.error ||
        `Request failed: ${response.status} ${response.statusText}`;

      throw createApiError(message, response.status, errorBody);
    }

    return await response.json();
  } catch (err) {
    // Re-throw API errors as-is
    if ((err as ApiError).status) {
      throw err;
    }

    // Handle network errors (timeout, CORS, DNS, offline)
    console.error("[API] Network error:", err);
    throw err;
  }
}

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
export async function fetchUserByRole({
  token,
  endpoint = "api/vSelectNCRC",
}: {
  token?: string | null;
  endpoint?: string;
} = {}): Promise<Array<{ name: string; id: string }>> {
  const paginationParams = buildPaginationParams(0, 10000);
  const sortParams = buildSortParams("fullName");
  const params = mergeParams(paginationParams, sortParams);

  const response = await fetchWithAuth<UserRoleResponse>({
    path: `/${endpoint}?${params.toString()}`,
    token,
  });

  return response.data.map((item: any) => {
    return {
      name: item.attributes.fullName,
      id: item.attributes.userName,
      pct_of_total_apps: item.attributes.pct_of_total_apps,
      pct_of_total_apps_at_work : item.attributes.pct_of_total_apps_at_work,
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
  token,
  username,
  status,
  capacity
}: {
  taskId: string;
  result?: string;
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
    (result && completionNotesMap[result]) || "Task completed successfully";

  // Build request body dynamically
  const body: Record<string, any> = {
    task_instance_id: taskId,
    completed_by: username,
    completion_notes,
    capacity: capacity,
  };

  if (result) {
    body.result = result.toUpperCase();
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
  billingContact?: {
    name?: string;
  };
};

type AppPlantValue = {
  plantName?: string;
  processDescription?: string;
};

const ZERO_SQL_DATE = "0001-01-01 00:00:00";

type CompanyApiAttributes = {
  COMPANY_ID?: number;
  NAME: string;
  LIST: string;
  GP_NOTIFY: number;
  PRODUCER: boolean;
  MARKETER: boolean;
  SOURCE: boolean;
  IN_HOUSE: string;
  PRIVATE_LABEL: string;
  COPACKER: string;
  JEWISH_OWNED: string;
  CORPORATE: string;
  COMPANY_TYPE: string;
  INVOICE_TYPE: string;
  INVOICE_FREQUENCY: string;
  INVOICE_DTL: string;
  TIMESTAMP: string;
  STATUS: string;
  RC: string;
  PARENT_CO: string;
  INVOICE_LAST_DATE: string;
  COMPANY_BILL_TO_NAME: string;
  ACTIVE: number;
  AcquiredFrom: string;
  UID: string;
  MoveToGP: string;
  DefaultPO: string;
  POexpiry: string;
  PrivateLabelPO: string;
  PrivateLabelPOexpiry: string;
  VisitPO: string;
  VisitPOexpiry: string;
  ValidFromTime: string;
  ValidToTime: string;
  CHANGESET_ID: number;
  CATEGORY: string;
  OLDCOMPANYTYPE: string;
  BoilerplateInvoiceComment: string;
  IsPoRequired: boolean;
  ShouldPropagateCompanyPo: boolean;
  ShouldPropagateKscPoToPlants: boolean;
  ShouldPropagateVisitPoToPlants: boolean;
  PoReason: string;
  On3rdPartyBilling: boolean;
  IsTest: boolean;
  ChometzEmailSentDate: string;
};

type PlantApiAttributes = {
  PLANT_ID?: number;
  NAME: string;
  GP_NOTIFY: boolean;
  MULTILINES: string;
  PASSOVER: string;
  SPECIAL_PROD: string;
  JEWISH_OWNED: string;
  PLANT_TYPE: string;
  PLANT_DIRECTIONS: string;
  ACTIVE: number;
  USDA_CODE: string;
  PlantUID: string;
  DoNotAttach: string;
  OtherCertification: string;
  PrimaryCompany: number;
  DesignatedRFR: number;
  ValidFromTime: string;
  ValidToTime: string;
  CHANGESET_ID: number;
  MaxOnSiteVisits: number;
  MaxVirtualVisits: number;
  IsDaily: boolean;
};

export function buildCompanyPayloadFromApplication(
  appValue: AppCompanyValue,
  companyId: number | null = 0
): {
  data: { attributes: CompanyApiAttributes; type: "COMPANYTB"; id: "client_generated" };
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
  data: { attributes: PlantApiAttributes; type: "PLANTTB"; id: "client_generated" };
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
  params.append("applciation_id", String(applicationId));

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
