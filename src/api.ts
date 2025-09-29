const API_BUILD = import.meta.env.VITE_API_BUILD;
const API_LOCAL_URL = import.meta.env.VITE_API_LOCAL_URL;
const API_CLIENT_URL = import.meta.env.VITE_API_CLIENT_URL;
const API_LOCAL_CLIENT_URL = import.meta.env.VITE_API_LOCAL_CLIENT_URL;

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

export async function fetchApplicants({ page = 0, limit = 20 }: { page?: number; limit?: number } = {}): Promise<Applicant[]> {
  let url: string;

  if (API_BUILD === "client") {
    url = `${API_BASE_URL}/get_applications?page[limit]=${limit}&page[offset]=${page}`;
  } else {
    url = `${API_BASE_URL}/get_applications?page[limit]=${limit}&page[offset]=${page}`;
    //url = `${API_LOCAL_URL}/get_applications.json`;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load applicants: ${response.statusText}`);
  const json = await response.json();
  return json.data.map((applicant: any) => ({
    ...applicant,
    stages: Object.fromEntries(
      Object.entries(applicant.stages).map(([k, v]) => [k.toLowerCase(), v])
    )
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

export async function fetchRcs({ page = 0, limit = 20 }: { page?: number; limit?: number } = {}): Promise<any[]> {
  let url: string;
  
  url = `${API_BASE_URL}/api/WFUSERROLE?filter[UserRole]=NCRC`;
 
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load Rcs: ${response.statusText}`);
  const json = await response.json();
  // 🔑 map WFRole format → simplified { name, id }
  return json.data.map((item: any) => ({
    name : item.attributes.UserName,
    id   : item.attributes.UserName,
  }));
}

/** 👇 New: Assign task mutation */
export async function assignTask({
  appId,
  taskId,
  role,
  assignee,
}: {
  appId: string;
  taskId: string;
  role: string;
  assignee: string;
}) {
  const response = await fetch(`${API_BASE_URL}/assignRole`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appId, taskId, role, assignee }),
  });

  if (!response.ok) {
    throw new Error(`Failed to assign task: ${response.statusText}`);
  }

  return response.json();
}

/** 👇 New: Confirm task mutation */
export async function confirmTask({
  taskId,
  result,
}: {
  taskId: string;
  result?: "yes" | "no";
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

  const response = await fetch(`${API_BASE_URL}/api/TaskInstance/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj),
  });

  if (!response.ok) {
    throw new Error(`Failed to confirm task: ${response.statusText}`);
  }

  return response.json();
}

/** 👇 New: Send Msg task mutation */
export async function sendMsgTask(newMessage: any) {
  const response = await fetch(`${API_BASE_URL}/api/WFApplicationMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newMessage),
  });

  if (!response.ok) {
    throw new Error(`Failed to Send Message: ${response.statusText}`);
  }

  return response.json();
}

// simple wrapper - adjust URL if you host JSON differently
export async function fetchApplicationDetailRaw(applicationId?: string) {
  let url: string;
  if (API_BUILD === "client") {
    url = `${API_BASE_URL}/get_application_detail?applicationId=${applicationId}`;
  } else {
    url = `${API_BASE_URL}/get_application_detail?applicationId=${applicationId}`;
    //url = `${API_LOCAL_URL}/get_application_detail.json`;
  }
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load application detail');
  //return res.json();
  const json = await res.json();
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