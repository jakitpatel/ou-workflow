import type { Applicant } from './types/application';

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
  token?: string;
  headers?: Record<string, string>;
};

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

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchApplicants({
  page = 0,
  limit = 20,
  token,
  strategy,
}: {
  page?: number;
  limit?: number;
  token?: string;
  strategy?: string;
} = {}): Promise<Applicant[]> {
  let path: string;

  // Build API path
  path = `/get_applications?page[limit]=${limit}&page[offset]=${page}`;
  
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
  token?: string;
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
}: {
  page?: number;
  limit?: number;
  token?: string;
  strategy?: string;
} = {}): Promise<any[]> {
  const params = new URLSearchParams({
    "filter[UserRole]": "NCRC",
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
  appId: string;
  taskId: string;
  role: string;
  assignee: string;
  token?: string;
  strategy?: string;
}) {
  const json = await fetchWithAuth({
    path: `/assignRole`,
    method: "POST",
    strategy,
    token,
    body: JSON.stringify({ appId, taskId, role, assignee }),
    headers: { "Content-Type": "application/json" },
  });

  return json;
}

/** 👇 Confirm task mutation (with fetchWithAuth) */
export async function confirmTask({
  taskId,
  result,
  token,
  strategy,
}: {
  taskId: string;
  result?: "yes" | "no";
  token?: string;
  strategy?: string;
}) {
  const bodyObj = {
    data: {
      type: "TaskInstance",
      id: taskId,
      attributes: {
        TaskInstanceId: taskId,
        Status: "COMPLETED",
        ...(result ? { Result: result.toUpperCase() } : {}), // 👈 force uppercase
      },
    },
  };

  const json = await fetchWithAuth({
    path: `/api/TaskInstance/${taskId}`,
    method: "PATCH",
    strategy,
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj),
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
  token?: string;
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
export async function fetchApplicationDetailRaw(
  applicationId?: string,
  token?: string,
  strategy?: string
) {
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