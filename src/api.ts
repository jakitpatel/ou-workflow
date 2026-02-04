import { getApiBaseUrl } from "./lib/utils";
import type {
  ApplicantsResponse,
  ApplicationTasksResponse,
  ApplicationTask,
  ApplicationDetailResponse,
  UserRoleResponse,
  PrelimApplicantsResponse,
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
} = {}): Promise<PrelimApplicantsResponse> {
  console.log('✅ CORRECT fetchPrelimApplications');

  const params = buildPaginationParams(page, limit);

  addFilterParams(params, {
    "filter[name]": searchTerm,
    "filter[status]": statusFilter
  });

  const res = await fetchWithAuth<PrelimApplicantsResponse>({
    path: `/get_applications_v1?application_type=SUBMISSION&${params.toString()}`,
    token,
  });

  /*
  return {
    data: res.data,
    meta: res.meta || { total_count: res.data.length },
  } as any;
   */
  return res.data;
}

// Fetches detailed information for a specific preliminary application
export async function fetchPrelimApplicationDetails(
  preliminaryApplicationId: number,
  token?: string | null
) {
  /*
  const baseUrl = "/dashboard";
  let prelimurl = baseUrl + '/data/prelimApplicationsDetails.json';
  prelimurl = prelimurl + `?preliminaryApplicationId=${preliminaryApplicationId}`;
  const res = await fetch(prelimurl);

  if (!res.ok) {
    throw new Error('Failed to fetch application details')
  }

  return res.json()
  */
  const params = new URLSearchParams();
  params.append("filter[preliminaryApplicationId]", String(preliminaryApplicationId));
  return await fetchWithAuth<ApplicantsResponse>({
    path: `/prelimApplicationsDetails?${params.toString()}`,
    token,
  });
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