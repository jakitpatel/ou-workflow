const API_BUILD = import.meta.env.VITE_API_BUILD;
const API_LOCAL_URL = import.meta.env.VITE_API_LOCAL_URL;
const API_CLIENT_URL = import.meta.env.VITE_API_CLIENT_URL;
const API_LOCAL_CLIENT_URL = import.meta.env.VITE_API_LOCAL_CLIENT_URL;

const API_BASE_URL =
  API_BUILD === "client" ? API_CLIENT_URL : API_LOCAL_URL;
    
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

export async function fetchRoles({ page = 0, limit = 20 }: { page?: number; limit?: number } = {}): Promise<any[]> {
  let url: string;

  if (API_BUILD === "client") {
    //url = `${API_BASE_URL}/ncrc_role?page[limit]=${limit}&page[offset]=${page}`;
    url = `${API_BASE_URL}/api/WFRole`;
  } else {
    url = `${API_BASE_URL}/api/WFRole`;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load roles: ${response.statusText}`);
  const json = await response.json();

  // 🔑 map WFRole format → simplified { name, value }
  return json.data.map((item: any) => ({
    name: item.attributes.Role,
    value: item.attributes.UserRole,
  }));
}

export async function fetchRcs({ page = 0, limit = 20 }: { page?: number; limit?: number } = {}): Promise<any[]> {
  let url: string;

  if (API_BUILD === "client") {
    //url = `${API_BASE_URL}/ncrc_rc?page[limit]=${limit}&page[offset]=${page}`;
    url = `${API_LOCAL_CLIENT_URL}/ncrc_rc.json`;
  } else {
    url = `${API_LOCAL_URL}/ncrc_rc.json`;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load Rcs: ${response.statusText}`);
  const json = await response.json();
  return json.data;
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