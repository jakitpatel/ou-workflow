import type { Applicant, ApplicationTasksResponse, ApplicationTask } from './types/application';

interface ApplicantsResponse {
  data: Applicant[];
}

const API_BUILD = import.meta.env.VITE_API_BUILD;
const API_LOCAL_URL = import.meta.env.VITE_API_LOCAL_URL;
const API_CLIENT_URL = import.meta.env.VITE_API_CLIENT_URL;
//const API_LOCAL_CLIENT_URL = import.meta.env.VITE_API_LOCAL_CLIENT_URL;

const API_BASE_URL =
  API_BUILD === "client" ? API_CLIENT_URL : API_LOCAL_URL;

type FetchWithAuthOptions = {
  path: string;
  method?: string;
  body?: any;
  strategy?: string;
  token?: string | null;
  headers?: Record<string, string>;
};
// Fetch with Auth wrapper (improved)
export async function fetchWithAuth<T>({
  path,
  method = "GET",
  body,
  strategy,
  token,
  headers = {},
}: FetchWithAuthOptions): Promise<T> {
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Attach Bearer token if API security is used
  if (strategy === "api" && token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  // ✅ Gracefully handle non-OK responses
  if (!response.ok) {
    let errorBody: any = null;
    try {
      errorBody = await response.json(); // attempt to parse JSON error message
    } catch {
      // fallback to text if not JSON
      errorBody = await response.text();
    }

    // ✅ Attach HTTP status and backend message for React Query
    const error: any = new Error(
      errorBody?.message || `API request failed: ${response.status} ${response.statusText}`
    );
    error.status = response.status;
    error.details = errorBody;
    throw error;
  }

  return response.json();
}

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
  params.append('page[limit]', String(limit));
  params.append('page[offset]', String(page));

  // Filters (only append if defined and not empty)
  if (searchTerm && searchTerm.trim() !== '') {
    params.append('filter[company]', searchTerm.trim());
  }
  if (statusFilter && statusFilter !== 'all') {
    params.append('filter[status]', statusFilter);
  }
  if (priorityFilter && priorityFilter !== 'all') {
    params.append('filter[priority]', priorityFilter);
  }

  // Construct full URL
  const path = `/get_applications?${params.toString()}`;
  
  // Use fetchWithAuth wrapper
  const json = (await fetchWithAuth({
    path,
    strategy,
    token,
  })) as ApplicantsResponse;

  // Map stages to lowercase keys
  return json.data.map((applicant: any) => ({
    ...applicant,
    stages: Object.fromEntries(
      Object.entries(applicant.stages).map(([k, v]) => [k.toLowerCase(), v])
    ),
  }));
}

export async function fetchRoles({
  username,
  page = 0,
  limit = 20,
  token,
  strategy,
}: {
  username: string;
  page?: number;
  limit?: number;
  token?: string | null;
  strategy?: string;
}): Promise<any[]> {
  const params = new URLSearchParams({
    "fields[WFUSERROLE]": "UserName,UserRole,CreatedDate",
    "page[offset]": page.toString(),
    "page[limit]": limit.toString(),
    sort: "id",
    [`filter[UserName]`]: username,
  });

  const json = await fetchWithAuth({
    path: `/api/WFUSERROLE?${params.toString()}`,
    strategy,
    token,
  });
  if (!Array.isArray(json.data)) {
    console.error("❌ json.data is not an array:", json);
    throw new Error("Invalid roles response");
  }

  // map WFUSERROLE format → simplified { name, value, created }
  return json.data.map((item: any) => ({
    name: item.attributes.UserRole,
    value: item.attributes.UserRole,
    created: item.attributes.CreatedDate,
  }));
}

export async function fetchRcs({
  page = 0,
  limit = 20,
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
    "page[offset]": page.toString(),
    "page[limit]": limit.toString(),
  });

  const json = await fetchWithAuth({
    path: `/api/WFUSERROLE?${params.toString()}`,
    strategy,
    token,
  });

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

export async function confirmTask({
  taskId,
  result,
  token,
  strategy,
  username
}: {
  taskId: string;
  result?: "yes" | "no";
  token?: string | null;
  strategy?: string;
  username?: string;
}) {
  const json = await fetchWithAuth({
    path: `/complete_task`,
    method: "POST",
    strategy,
    token,
    headers: { "Content-Type": "application/json" },
    body: { task_instance_id: taskId, 
            result: result ? result.toUpperCase() : undefined,
            completed_by: username,
            completion_notes: "Task completed successfully" },
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

// simple wrapper - adjust URL if you host JSON differently
export async function fetchApplicationDetailRaw({
  applicationId,
  token,
  strategy,
}: {
  applicationId?: string,
  token?: string | null;
  strategy?: string;
} = {}): Promise<any> {
  if (!applicationId) throw new Error('applicationId is required');

  let path: string;

  path = `/get_application_detail?applicationId=${applicationId}`;

  const json = await fetchWithAuth({
    path,
    strategy,
    token,
    cache: 'no-store', // preserve original behavior
  });

  return json.applicationInfo;
}

// If your JSON contains multiple applications, add a selector:
export async function fetchApplicationDetailById(applicationId?: string) {
  const data = await fetchApplicationDetailRaw();
  // if data is an array:
  if (Array.isArray(data)) {
    if (!applicationId) return data;
    return data.find((a: any)=>a.applicationId === applicationId) || null;
  }
  // single object:
  return data;
}

/** 👇 New: Login API */
export async function loginApi({
  username,
  password,
}: {
  username: string
  password: string
}) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`)
  }

  return response.json() // expect { username, role, token }
}
export async function fetchApplicationTasks({
  //page = 0,
  //limit = 20,
  token,
  strategy,
  applicationId,
}: {
  //page?: number;
  //limit?: number;
  token?: string | null;
  strategy?: string;
  applicationId?: string;
} = {}): Promise<ApplicationTask[]> {
  //let path = `/get_application_tasks?page[limit]=${limit}&page[offset]=${page}`;
  let path = `/get_application_tasks`;
  // ✅ Add filter only if applicationId is passed
  if (applicationId) {
    path += `?filter[applicationId]=${encodeURIComponent(applicationId)}`;
  }

  const json = (await fetchWithAuth({
    path,
    strategy,
    token,
  })) as ApplicationTasksResponse;

  return json.data;
}