import { getApiBaseUrl } from "./lib/utils";
import type {
  ApplicantsResponse,
  Applicant,
  ApplicationTasksResponse,
  ApplicationTask,
  ApplicationDetailResponse,
  UserRoleResponse,
} from "./types/application";
import {
  getAccessToken,
  refreshAccessToken,
} from "./components/auth/authService";
import { cognitoLogout } from "./components/auth/authService";
//const API_BASE_URL = getApiBaseUrl();

/**
 * ✅ Dynamic API base URL:
 * Always uses the latest `apiBaseUrl` selected by user in context,
 * with fallback to window.__APP_CONFIG__ or env-based util.
 */
function resolveApiBaseUrl(): string {
  try {
    // 🧩 Debug log to confirm the selected server is active
    const userContext = (window as any).__USER_CONTEXT__;
    const contextUrl = userContext?.apiBaseUrl;
    console.log(
      `[resolveApiBaseUrl] Current base URL:`,
      contextUrl || "(no context)",
      "| From Context:",
      !!contextUrl,
    );

    // 1️⃣ Try context
    if (contextUrl) {
      return contextUrl;
    }

    // 2️⃣ Try global config
    const config = (window as any).__APP_CONFIG__;
    if (config) {
      const servers = Object.keys(config)
        .filter((key) => key.startsWith("API_CLIENT_URL"))
        .map((key) => config[key]);
      if (servers.length > 0) {
        console.log(`[resolveApiBaseUrl] Using config server:`, servers[0]);
        return servers[0];
      }
    }

    // 3️⃣ Fallback to util
    const fallback = getApiBaseUrl();
    console.log(
      `[resolveApiBaseUrl] Using fallback getApiBaseUrl():`,
      fallback,
    );
    return fallback;
  } catch (err) {
    console.warn("[resolveApiBaseUrl] Exception occurred:", err);
    return getApiBaseUrl();
  }
}

/**
 * 👇 Helper to keep `UserContext` syncable with global scope.
 * (We set this once in UserProvider.)
 */
export function registerUserContext(ctx: any) {
  (window as any).__USER_CONTEXT__ = ctx;
}

// Define fetchWithAuth options type
type FetchWithAuthOptions = {
  path: string;
  method?: string;
  body?: any;
  strategy?: string;
  token?: string | null | undefined;
  headers?: Record<string, string>;
};

// Fetch with authentication wrapper
export async function fetchWithAuth<T>({
  path,
  method = "GET",
  body,
  strategy,
  token,
  headers = {},
}: FetchWithAuthOptions): Promise<T> {
  const baseUrl = resolveApiBaseUrl();
  // Pick token source
  let accessToken =
    strategy === "cognito"
      ? token //getAccessToken()
      : token;

  async function doFetch(currentToken: string | null | undefined) {
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (currentToken) {
      requestHeaders["Authorization"] = `Bearer ${currentToken}`;
    }

    return fetch(`${baseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // 1️⃣ First request
  let response = await doFetch(accessToken);

  // 2️⃣ Retry if Cognito access token expired
  if (response.status === 401 && strategy === "cognito") {
    try {
      const newToken = await refreshAccessToken();
      accessToken = newToken;

      response = await doFetch(newToken);
    } catch (err) {
      console.error("🔴 Token refresh failed:", err);
      cognitoLogout();
      throw new Error("Session expired. Please log in again.");
    }
  }

  // 3️⃣ Error handling
  if (!response.ok) {
    let errorBody;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }

    const error: any = new Error(
      errorBody?.message ||
        `API request failed: ${response.status} ${response.statusText}`,
    );

    error.status = response.status;
    error.details = errorBody;
    throw error;
  }

  return response.json();
}

// Fetch applicants data from the API
export async function fetchApplicants({
  page = 0,
  limit = 20,
  token,
  strategy,
  searchTerm,
  statusFilter,
  priorityFilter,
}: {
  page?: number;
  limit?: number;
  token?: string | null;
  strategy?: string;
  searchTerm?: string;
  statusFilter?: string;
  priorityFilter?: string;
} = {}): Promise<Applicant[]> {
  const params = new URLSearchParams();

  // Pagination
  params.append("page[limit]", String(limit));
  params.append("page[offset]", String(page));

  // Filters (only append if defined and not empty)
  if (searchTerm && searchTerm.trim() !== "") {
    params.append("filter[name]", searchTerm.trim());
  }
  if (statusFilter && statusFilter !== "all") {
    params.append("filter[status]", statusFilter);
  }
  if (priorityFilter && priorityFilter !== "all") {
    params.append("filter[priority]", priorityFilter);
  }

  // Construct full URL
  const path = `/get_applications_v1?${params.toString()}`;

  // Use fetchWithAuth wrapper
  const json = (await fetchWithAuth({
    path,
    strategy,
    token,
  })) as ApplicantsResponse;

  const mappedData = json.data.map((applicant: any) => ({
    ...applicant,
    stages: Object.fromEntries(
      Object.entries(applicant.stages).map(([k, v]) => [k.toLowerCase(), v]),
    ),
  }));

  return {
    data: mappedData,
    meta: json.meta || { total_count: mappedData.length },
  } as any;
}

// Fetch roles data from the API with exchange-cognito-token endpoint
export async function fetchRoles({
  token,
}: {
  token?: string | null;
}): Promise<any[]> {
  const baseUrl = resolveApiBaseUrl();
  const path = `/auth/exchange-cognito-token`;

  const accessToken = token ?? getAccessToken();

  if (!accessToken) {
    // This is NOT a network error → OK to throw
    throw new Error("Access token missing. Please login again.");
  }

  try {
    // keep the Response type, don't cast the Response directly to UserRoleTokenResponse
    const resp = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: accessToken }),
    });

    // ❌ Non-200 responses → throw a controlled error
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      const error: any = new Error(text || resp.statusText);
      error.status = resp.status;
      throw error; // SAFE
    }

    const data = await resp.json();
    return data;
  } catch (err) {
    // ⚠️ IMPORTANT: DO NOT wrap TypeError (timeout, CORS, DNS, offline)
    // If we rethrow the original err, React Query can classify correctly
    console.error("fetchRoles error:", err);
    throw err; // rethrow original as-is
  }
}

// Fetch users by role type (NCRC, RFR, etc.)
export async function fetchUserByRole({
  token,
  strategy,
  selectRoleType = "NCRC",
}: {
  page?: number;
  limit?: number;
  token?: string | null;
  strategy?: string;
  selectRoleType?: string;
} = {}): Promise<any[]> {
  const params = new URLSearchParams({
    "filter[UserRole]": selectRoleType,
  });

  const json = (await fetchWithAuth({
    path: `/api/WFUSERROLE?${params.toString()}`,
    strategy,
    token,
  })) as UserRoleResponse;

  return json.data.map((item: any) => ({
    name: item.attributes.UserName,
    id: item.attributes.UserName,
  }));
}

/** 👇 Assign task mutation (with fetchWithAuth) */
export async function assignTask({
  appId,
  taskId,
  role,
  assignee,
  token,
  strategy,
}: {
  appId?: number | null;
  taskId: string;
  role: string;
  assignee: string;
  token?: string | null;
  strategy?: string;
}) {
  const json = await fetchWithAuth({
    path: `/assignRole`,
    method: "POST",
    strategy,
    token,
    //body: JSON.stringify({ appId, taskId, role, assignee }),
    body: { appId, taskId, role, assignee },
    headers: { "Content-Type": "application/json" },
  });

  return json;
}

// Confirm task mutation (with fetchWithAuth)
export async function confirmTask({
  taskId,
  result,
  token,
  strategy,
  username,
  status,
}: {
  taskId: string;
  result?: "yes" | "no" | "completed" | "in_progress" | "pending";
  token?: string | null;
  strategy?: string;
  username?: string;
  status?: string;
}) {
  let completion_notes = "Task completed successfully";
  if (result && status) {
    // Handle different statuses
    if (result === "completed") {
      // Handle completed status
      completion_notes = "Task completed successfully";
    } else if (result === "in_progress") {
      // Handle in_progress status
      completion_notes = "Task IN PROGRESS successfully";
    } else if (result === "pending") {
      // Handle pending status
      completion_notes = "Task PENDING successfully";
    }
  }
  // ✅ Build body dynamically — only include fields that exist
  const body: Record<string, any> = {
    task_instance_id: taskId,
    completed_by: username,
    completion_notes,
  };

  if (result) body.result = result.toUpperCase();
  if (status) body.status = status; // ✅ Only add if defined

  const json = await fetchWithAuth({
    path: `/complete_task`,
    method: "POST",
    strategy,
    token,
    headers: { "Content-Type": "application/json" },
    body,
  });

  return json;
}

/** 👇 Send Msg task mutation (with fetchWithAuth) */
export async function sendMsgTask({
  newMessage,
  token,
  strategy,
}: {
  newMessage: any;
  token?: string | null;
  strategy?: string;
}) {
  const json = await fetchWithAuth({
    path: `/api/WFApplicationMessage`,
    method: "POST",
    strategy,
    token,
    headers: { "Content-Type": "application/json" },
    body: newMessage, // ✅ don't wrap again or stringify here
  });

  return json;
}

// Fetch application detail data from the API
export async function fetchApplicationDetail({
  applicationId,
  token
}: {
  applicationId?: string;
  token?: string | null;
} = {}): Promise<any> {
  if (!applicationId) throw new Error("applicationId is required");

  let path: string;

  path = `/get_application_detail_v2?applicationId=${applicationId}`;

  const json = (await fetchWithAuth({
    path,
    token /*,
    cache: 'no-store', // preserve original behavior*/,
  })) as ApplicationDetailResponse;

  //return json.applicationInfo;
  return json.appplicationinfo;
}

// Fetch application tasks data from the API
export async function fetchApplicationTasks({
  token,
  strategy,
  applicationId,
  searchTerm,
}: {
  token?: string | null;
  strategy?: string;
  applicationId?: string;
  searchTerm?: string;
} = {}): Promise<ApplicationTask[]> {
  let params: string[] = [];

  if (applicationId) {
    params.push(`filter[applicationId]=${encodeURIComponent(applicationId)}`);
  }

  // ✅ Add server-side filter for plant name
  if (searchTerm) {
    params.push(`filter[plantName]=${encodeURIComponent(searchTerm)}`);
  }

  const queryString = params.length ? `?${params.join("&")}` : "";
  const path = `/get_application_tasks${queryString}`;

  const json = (await fetchWithAuth({
    path,
    strategy,
    token,
  })) as ApplicationTasksResponse;

  return json.data;
}
